import {test} from 'node:test';
import assert from 'node:assert/strict';
import rawSite from '../dist/server/index.js';
import {testEnvironment} from './account-fixture.mjs';
const site={fetch:async(request,env)=>{
  if(!request.headers.has('oai-authenticated-user-id'))return rawSite.fetch(request,env);
  const identity=request.headers.get('oai-authenticated-user-id');const fixture=testEnvironment();
  const authEnv={...fixture.env,DOTER_OWNER_ID:identity};
  const login=await rawSite.fetch(new Request('https://doter.test/api/auth/login',{method:'POST',headers:{'oai-authenticated-user-id':identity}}),authEnv);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const cookieHash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(cookie.split('=')[1]));
  const sessionKey='accounts/sessions/'+Buffer.from(cookieHash).toString('base64url')+'.enc';
  const userHash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity))).toString('base64url');
  const accountKeys=new Set([sessionKey,'accounts/members/'+userHash+'.enc']);
  const bucket={...env.BUCKET,get:async key=>accountKeys.has(key)?authEnv.BUCKET.get(key):env.BUCKET.get(key)};
  const headers=new Headers(request.headers);headers.set('cookie',cookie);
  return rawSite.fetch(new Request(request,{headers}),{...env,DOTER_OWNER_ID:identity,BUCKET:bucket});
}};
const env={BUCKET:{get:async()=>null},RELAY_CREDENTIALS_MASTER_KEY:Buffer.alloc(32,2).toString('base64')};
test('private APIs require identity',async()=>{const r=await site.fetch(new Request('https://doter.test/api/providers'),env);assert.equal(r.status,401);});
test('cross origin mutations are denied',async()=>{const r=await site.fetch(new Request('https://doter.test/api/providers',{method:'POST',headers:{origin:'https://evil.test','oai-authenticated-user-id':'a'},body:'{}'}),env);assert.equal(r.status,403);});
test('static app assets are served with CSP and icons',async()=>{for(const path of ['/','/app.js','/styles.css']){const r=await site.fetch(new Request('https://doter.test'+path),env);assert.equal(r.status,200);assert.ok(r.headers.get('content-security-policy'));if(path==='/')assert.match(await r.text(),/rel="icon"/);}});
test('provider summaries do not return secrets',async()=>{const r=await site.fetch(new Request('https://doter.test/api/providers',{headers:{'oai-authenticated-user-id':'a'}}),env);assert.equal(r.status,200);const data=await r.json();assert.equal(data.providers.length,6);assert.ok(data.providers.every(p=>!('apiKey' in p)));});
test('continuous runtime reports configuration rather than fabricating execution',async()=>{const r=await site.fetch(new Request('https://doter.test/api/agents/test',{headers:{'oai-authenticated-user-id':'a'}}),env);assert.equal(r.status,503);});
test('subscription API advertises only configured providers and rejects unknown login',async()=>{const headers={'oai-authenticated-user-id':'a','content-type':'application/json'};let r=await site.fetch(new Request('https://doter.test/api/subscriptions',{headers}),env);assert.equal((await r.json()).providers[0].id,'chatgpt');r=await site.fetch(new Request('https://doter.test/api/subscriptions/start',{method:'POST',headers,body:JSON.stringify({providerId:'unknown'})}),env);assert.equal(r.status,409);});
test('subscription callback rejects invalid state',async()=>{const r=await site.fetch(new Request('https://doter.test/api/subscriptions/callback?state=invalid',{headers:{'oai-authenticated-user-id':'a'}}),env);assert.equal(r.status,400);});
test('ChatGPT login creates encrypted user-owned PKCE state',async()=>{const objects=new Map();const e={...env,BUCKET:{...env.BUCKET,put:async(k,v)=>objects.set(k,v)}};const r=await site.fetch(new Request('https://doter.test/api/subscriptions/start',{method:'POST',headers:{'oai-authenticated-user-id':'alice','content-type':'application/json'},body:JSON.stringify({providerId:'chatgpt'})}),e);assert.equal(r.status,200);const result=await r.json();assert.equal(result.requiresLocalHelper,true);assert.ok(result.helperSource.includes('node:http'));assert.ok(!result.helperSource.includes('__LOGIN_CONFIGURATION__'));const u=new URL(result.authorizationUrl);assert.equal(u.searchParams.get('redirect_uri'),'http://127.0.0.1:1455/auth/callback');assert.equal(u.origin,'https://auth.openai.com');assert.equal(u.searchParams.get('client_id'),'dynamic_agent_client');assert.equal(u.searchParams.get('agent_name_hint'),'doter');assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.ok(u.searchParams.get('nonce'));assert.equal(objects.size,1);assert.equal(new TextDecoder().decode([...objects.values()][0]).includes('verifier'),false);});

test('configured OAuth providers retain their hosted callback',async()=>{
  const e={...env,DOTER_SUBSCRIPTION_OAUTH:JSON.stringify([{id:'example',name:'Example',clientId:'registered',authorizationUrl:'https://example.com/authorize'}]),BUCKET:{put:async()=>{}}};
  const r=await site.fetch(new Request('https://doter.test/api/subscriptions/start',{method:'POST',headers:{'oai-authenticated-user-id':'alice','content-type':'application/json'},body:JSON.stringify({providerId:'example'})}),e);
  assert.equal(r.status,200);const result=await r.json();assert.equal(new URL(result.authorizationUrl).searchParams.get('redirect_uri'),'https://doter.test/api/subscriptions/callback');assert.equal(result.requiresLocalHelper,undefined);
});
