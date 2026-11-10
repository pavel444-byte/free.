const SESSION_COOKIE = '__Host-doter_session';
const WORKSPACE_KEYS = ['relay.chats.v1','relay.agents.v1','relay.activity.v1','relay.subscription-tracking.v1','relay.integration-setup.v1','relay.usage.v1','relay.selected-provider.v1'];
async function readAccountObject(env, key) {
  const object = await env.BUCKET.get(key);
  return object ? {value:await decryptJson(await object.arrayBuffer(),env),etag:object.etag} : null;
}
async function writeAccountObject(env,key,value,onlyIf) {
  return env.BUCKET.put(key,await encryptJson(value,env),onlyIf?{onlyIf}:undefined);
}
function randomSecret() { return base64Url(bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))); }
async function memberKey(identity) { return `accounts/members/${await identityHash(identity)}.enc`; }
function accountSummary(account) { return {id:account.id,name:account.name,role:account.role,status:account.status || "active",createdAt:account.createdAt}; }
async function accountForIdentity(env,identity) {
  if (!env.DOTER_OWNER_ID) throw new HttpError(503,'Account management needs its Site owner configuration.');
  const record=await readAccountObject(env,await memberKey(identity));
  if(record) return record.value;
  if(identity!==env.DOTER_OWNER_ID) return null;
  const owner={id:await identityHash(identity),identity,name:'My workspace',role:'owner',createdAt:new Date().toISOString()};
  await writeAccountObject(env,await memberKey(identity),owner,{etagDoesNotMatch:'*'});
  return (await readAccountObject(env,await memberKey(identity))).value;
}
function sessionToken(request) {
  const match=(request.headers.get('cookie') || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(SESSION_COOKIE+'='));
  return match?.slice(SESSION_COOKIE.length+1) || '';
}
async function resolveAccountSession(request,env,identity) {
  const token=sessionToken(request);
  if(!/^[a-zA-Z0-9_-]{43}$/.test(token))return null;
  const record=await readAccountObject(env,`accounts/sessions/${await identityHash(token)}.enc`);
  if(!record || record.value.expires<=Date.now() || record.value.identity!==identity)return null;
  const account=await accountForIdentity(env,identity);
  return account && account.status!=="disabled" && account.id===record.value.accountId && (account.sessionVersion || 0)===(record.value.sessionVersion || 0)?account:null;
}
async function signInResponse(env,account) {
  const token=randomSecret();const lifetime=7*86400;
  await writeAccountObject(env,`accounts/sessions/${await identityHash(token)}.enc`,{accountId:account.id,identity:account.identity,sessionVersion:account.sessionVersion || 0,expires:Date.now()+lifetime*1000});
  const response=json({account:accountSummary(account)});
  response.headers.set('set-cookie',`${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${lifetime}`);
  return response;
}
async function handleAccounts(request,env,identity,url) {
  const path=url.pathname;
  if(path==='/api/auth/status' && request.method==='GET') {
    const account=await resolveAccountSession(request,env,identity);
    const member=await accountForIdentity(env,identity);
    return json({account:account?accountSummary(account):null,canSignIn:Boolean(member && member.status!=="disabled"),needsInvitation:!member});
  }
  if(path==='/api/auth/login' && request.method==='POST') {
    const account=await accountForIdentity(env,identity);
    if(!account || account.status==="disabled")throw new HttpError(403,'Ask the workspace owner for a doter activation link and a Sites invitation.');
    return signInResponse(env,account);
  }
  if(path==='/api/auth/logout' && request.method==='POST') {
    const token=sessionToken(request);
    if(token)await env.BUCKET.delete(`accounts/sessions/${await identityHash(token)}.enc`);
    const response=json({ok:true});response.headers.set('set-cookie',`${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);return response;
  }
  if(path==='/api/auth/activate' && request.method==='POST') {
    const {token}=await readJson(request);
    if(typeof token!=='string' || !/^[a-zA-Z0-9_-]{43}$/.test(token))throw new HttpError(400,'Invalid activation link.');
    if(await accountForIdentity(env,identity))throw new HttpError(409,'This Sites identity already has a doter account.');
    const key=`accounts/invitations/${await identityHash(token)}.enc`;const record=await readAccountObject(env,key);
    if(!record || record.value.expires<=Date.now() || record.value.status!=='pending')throw new HttpError(400,'Activation link expired, revoked, or already used.');
    const claim=await writeAccountObject(env,key,{...record.value,status:'active',claimedBy:await identityHash(identity)},{etagMatches:record.etag});
    if(!claim)throw new HttpError(409,'Activation link was already used.');
    const account={id:await identityHash(identity),identity,name:record.value.name,role:'member',createdAt:new Date().toISOString()};
    const created=await writeAccountObject(env,await memberKey(identity),account,{etagDoesNotMatch:'*'});
    if(!created)throw new HttpError(409,'This Sites identity already has an account. Sign in again.');
    return signInResponse(env,account);
  }
  const account=await resolveAccountSession(request,env,identity);
  if(!account)throw new HttpError(401,'Sign in to your doter account.');
  if(path==='/api/workspace') {
    const key=`workspaces/${account.id}.enc`;
    if(request.method==='GET') {
      const record=await readAccountObject(env,key);return json({data:record?.value || {}});
    }
    if(request.method==='PUT') {
      const body=await readJson(request);const data={};
      for(const key of WORKSPACE_KEYS)if(Object.hasOwn(body,key))data[key]=body[key];
      await writeAccountObject(env,key,data);return json({ok:true});
    }
  }
  if(path==='/api/account' && request.method==='PATCH') {
    const body=await readJson(request);const key=await memberKey(identity);const record=await readAccountObject(env,key);const next={...record.value,name:text(body.name,80,'Display name')};
    const updated=await writeAccountObject(env,key,next,{etagMatches:record.etag});if(!updated)throw new HttpError(409,'Account changed. Refresh and retry.');return json({account:accountSummary(next)});
  }
  if(path==='/api/accounts' || path.startsWith('/api/accounts/')) {
    if(account.role!=='owner' || identity!==env.DOTER_OWNER_ID)throw new HttpError(403,'Only the owner can manage accounts.');
    if(path==='/api/accounts' && request.method==='GET') {
      const accounts=[];const invitations=[];let cursor;
      do {
        const page=await env.BUCKET.list({prefix:'accounts/',limit:1000,...(cursor?{cursor}:{})});
        for(const object of page.objects || []) {
          if(!object.key.startsWith('accounts/members/') && !object.key.startsWith('accounts/invitations/'))continue;
          const record=await readAccountObject(env,object.key);if(!record)continue;
          if(object.key.startsWith('accounts/members/'))accounts.push(accountSummary(record.value));
          else if(record.value.status==='pending')invitations.push({id:record.value.id,name:record.value.name,expires:record.value.expires,status:record.value.expires>Date.now()?'pending':'expired'});
        }
        cursor=page.truncated?page.cursor:undefined;
      }while(cursor);
      return json({accounts,invitations});
    }
    if(path==='/api/accounts' && request.method==='POST') {
      const body=await readJson(request);const name=text(body.name,80,'Friend’s name');const token=randomSecret();const id=await identityHash(token);
      await writeAccountObject(env,`accounts/invitations/${id}.enc`,{id,name,status:'pending',expires:Date.now()+7*86400000,createdAt:new Date().toISOString()});
      const activationUrl=new URL('/',url);activationUrl.hash=`activate=${token}`;
      return json({activationUrl:activationUrl.href},201);
    }
    const memberMatch=path.match(/^\/api\/accounts\/members\/([a-zA-Z0-9_-]{43})$/);
    if(memberMatch && request.method==='PATCH') {
      const key=`accounts/members/${memberMatch[1]}.enc`;const target=await readAccountObject(env,key);
      if(!target)throw new HttpError(404,'Account not found.');
      if(target.value.role==='owner')throw new HttpError(400,'The owner account cannot be disabled.');
      const body=await readJson(request);
      if(!['active','disabled'].includes(body.status))throw new HttpError(400,'Choose active or disabled.');
      const updated=await writeAccountObject(env,key,{...target.value,status:body.status,sessionVersion:(target.value.sessionVersion || 0)+1},{etagMatches:target.etag});if(!updated)throw new HttpError(409,'Account changed. Refresh and retry.');return json({ok:true});
    }
    const match=path.match(/^\/api\/accounts\/invitations\/([a-zA-Z0-9_-]{43})$/);
    if(match && request.method==='DELETE') {await env.BUCKET.delete(`accounts/invitations/${match[1]}.enc`);return json({ok:true});}
  }
  throw new HttpError(404,'Account route not found.');
}
