// Appended to the shared provider/MCP core by build-runtime.mjs.
export class DoterAgent {
  constructor(state, env) { this.state = state; this.env = env; }
  async read() {
    const packed = await this.state.storage.get('agent');
    return packed ? decryptJson(packed, this.env) : null;
  }
  async write(agent) { await this.state.storage.put('agent', await encryptJson(agent, this.env)); }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'PUT') {
      const input = await request.json();
      if (!input.goal || !input.provider?.apiKey) return json({error:'A goal and provider credential are required.'},400);
      const previous = await this.read();
      const agent = { ...input, status:'active', memory:previous?.memory || [], events:previous?.events || [], failures:0, intervalMs:Math.max(60000,Math.min(86400000,Number(input.intervalMs)||300000)), policy:input.policy || {}, step:previous?.step || 0 };
      await this.write(agent);
      await this.state.storage.setAlarm(Date.now()+1000);
      return json({status:agent.status});
    }
    const agent = await this.read();
    if (!agent) return json({error:'Agent not found.'},404);
    if (request.method === 'POST' && url.pathname.endsWith('/pause')) {
      agent.status='paused'; await this.write(agent); await this.state.storage.deleteAlarm();
    } else if (request.method === 'POST' && url.pathname.endsWith('/resume')) {
      agent.status='active'; agent.failures=0; await this.write(agent); await this.state.storage.setAlarm(Date.now()+1000);
    } else if (request.method === 'POST' && url.pathname.endsWith('/feedback')) {
      const body=await request.json(); agent.memory.push({role:'user',content:text(body.message,8000,'Feedback')}); agent.memory=agent.memory.slice(-30); await this.write(agent);
    } else if (request.method === 'POST' && url.pathname.endsWith('/approve')) {
      const body=await request.json();
      if (!agent.pending || agent.pending.id !== body.id) return json({error:'Approval expired.'},409);
      const pending=agent.pending; agent.pending=null; agent.status='running'; await this.write(agent);
      const results=[];
      for(const action of pending.actions) {
        const server=agent.servers.find(s=>s.id===action.serverId);
        try { const out=normalizeToolOutput(await mcpRequest(server,'tools/call',{name:action.toolName,arguments:action.arguments})); results.push(`${action.toolName}: ${out.text}`); }
        catch(error) { results.push(`${action.toolName}: ${error.message}`); }
      }
      agent.memory.push({role:'user',content:'Approved tool results:\n'+results.join('\n')}); agent.status='active'; await this.write(agent); await this.state.storage.setAlarm(Date.now()+1000);
    } else if(request.method === 'DELETE') { await this.state.storage.deleteAll(); return json({ok:true}); }
    return json({status:agent.status,goal:agent.goal,memory:agent.memory,events:agent.events,pending:agent.pending,step:agent.step});
  }
  async alarm() {
    const agent=await this.read(); if(!agent || agent.status==='paused' || agent.status==='approval')return;
    // Arm recovery before network I/O. Alarms survive isolate termination and closed browsers.
    await this.state.storage.setAlarm(Date.now()+Math.max(agent.intervalMs,180000));
    agent.status='running'; await this.write(agent);
    try {
      await refreshSubscriptionTokens({providers:[agent.provider]},this.env,null);
      const servers=[];
      for(const profile of agent.servers || [])servers.push({...profile,tools:await discoverMcp(profile)});
      const refs=servers.flatMap(s=>s.tools.map(t=>({serverId:s.id,toolName:t.name})));
      const {definitions,toolMap}=providerDefinitions(refs,servers);
      const messages=[{role:'system',content:`You are an ongoing agent. Goal: ${agent.goal}. Work on the next useful step, keep continuity, and do not invent completed actions. Request tools when needed. Previous work follows.`},...agent.memory.slice(-30),{role:'user',content:'Continue work on the goal. Report concrete progress, blockers, and the next step.'}];
      const completion=await providerRequest(agent.provider,messages,definitions);
      if(completion.text)agent.memory.push({role:'assistant',content:completion.text.slice(0,20000)});
      const latest=await this.read(); if(!latest || latest.status==='paused')return;
      const actions=completion.toolCalls.filter(c=>toolMap[c.name]).map(c=>({...toolMap[c.name],arguments:c.arguments}));
      const allowed=[],review=[];
      for(const action of actions){
        const rule=agent.policy[`${action.serverId}:${action.toolName}`] || 'ask';
        if(rule==='allow')allowed.push(action); else if(rule==='ask')review.push(action);
        else agent.memory.push({role:'user',content:`Policy denied ${action.toolName}. Choose another approach.`});
      }
      for(const action of allowed){
        const server=agent.servers.find(s=>s.id===action.serverId);
        const result=normalizeToolOutput(await mcpRequest(server,'tools/call',{name:action.toolName,arguments:action.arguments}));
        agent.memory.push({role:'user',content:`Tool result ${action.toolName}: ${result.text}`});
      }
      agent.pending=review.length?{id:crypto.randomUUID(),actions:review}:null;
      agent.status=review.length?'approval':'active'; agent.failures=0; agent.step++;
      agent.events.push({at:new Date().toISOString(),type:'progress',text:completion.text || `${actions.length} tools requested`});
      agent.events=agent.events.slice(-200); agent.memory=agent.memory.slice(-30); await this.write(agent);
      if(review.length)await this.state.storage.deleteAlarm(); else await this.state.storage.setAlarm(Date.now()+agent.intervalMs);
    }catch(error){
      const latest=await this.read(); if(!latest || latest.status==='paused')return;
      agent.failures++;agent.status=agent.failures>=8?'paused':'retrying';agent.events.push({at:new Date().toISOString(),type:'error',text:String(error.message).slice(0,500)});await this.write(agent);
      if(agent.status==='paused')await this.state.storage.deleteAlarm();else await this.state.storage.setAlarm(Date.now()+Math.min(3600000,60000*2**agent.failures));
    }
  }
}
export default {
  async fetch(request,env){
    if(!env.DOTER_SERVICE_TOKEN || request.headers.get('authorization')!==`Bearer ${env.DOTER_SERVICE_TOKEN}`)return json({error:'Unauthorized'},401);
    const url=new URL(request.url);const id=url.pathname.split('/')[2];if(!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))return json({error:'Invalid agent ID'},400);
    return env.AGENTS.get(env.AGENTS.idFromName(id)).fetch(request);
  }
};
