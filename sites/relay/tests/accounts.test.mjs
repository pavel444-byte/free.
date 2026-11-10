import { test } from 'node:test';
import assert from 'node:assert/strict';
import {testEnvironment} from './account-fixture.mjs';

test('sign-in homepage, secure sessions, logout, and Sites identity binding',async()=>{
  const {request,login}=testEnvironment();
  assert.equal((await request('/api/providers')).status,401);
  assert.equal((await request('/api/auth/status',{identity:''})).status,401);
  const status=await (await request('/api/auth/status')).json();assert.equal(status.account,null);assert.equal(status.canSignIn,true);
  const cookie=await login();
  assert.equal((await request('/api/providers',{cookie})).status,200);
  assert.equal((await request('/api/providers',{cookie,identity:'bob'})).status,401);
  assert.equal((await request('/api/providers',{cookie:cookie+'tampered'})).status,401);
  assert.equal((await request('/api/auth/login',{method:'POST',identity:'bob'})).status,403);
  const response=await request('/api/auth/login',{method:'POST'});
  assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await request('/api/auth/logout',{cookie,method:'POST'})).status,200);
  assert.equal((await request('/api/providers',{cookie})).status,401);
  assert.equal((await request('/api/auth/login',{method:'POST',origin:'https://evil.test'})).status,403);
});

async function activateFriend(fixture,ownerCookie,identity='bob') {
  const response=await fixture.request('/api/accounts',{cookie:ownerCookie,method:'POST',body:{name:'Friend'}});
  assert.equal(response.status,201);const {activationUrl}=await response.json();
  const token=new URLSearchParams(new URL(activationUrl).hash.slice(1)).get('activate');
  const activated=await fixture.request('/api/auth/activate',{identity,method:'POST',body:{token}});
  assert.equal(activated.status,200);
  return {cookie:activated.headers.get('set-cookie').split(';')[0],token,account:(await activated.json()).account};
}
test('friends have separate keys, chats, agent drafts and preferences; owner cannot read their data',async()=>{
  const fixture=testEnvironment();const ownerCookie=await fixture.login();const friend=await activateFriend(fixture,ownerCookie);
  for(const [identity,cookie,key,chat] of [['alice',ownerCookie,'owner-key','Owner conversation'],['bob',friend.cookie,'friend-key','Friend conversation']]) {
    assert.equal((await fixture.request('/api/providers',{identity,cookie,method:'POST',body:{providerId:'openai',apiKey:key,model:'test-model'}})).status,201);
    assert.equal((await fixture.request('/api/workspace',{identity,cookie,method:'PUT',body:{'relay.chats.v1':[{id:chat}],'relay.agents.v1':[{name:chat}],userId:'alice'}})).status,200);
    const data=await (await fixture.request('/api/workspace',{identity,cookie})).json();assert.equal(data.data['relay.chats.v1'][0].id,chat);assert.equal(data.data.userId,undefined);
    const providers=await (await fixture.request('/api/providers',{identity,cookie})).json();assert.equal(providers.providers[0].connected,true);assert.ok(!JSON.stringify(providers).includes(key));
  }
  const ownerData=await (await fixture.request('/api/workspace?userId=bob',{cookie:ownerCookie})).json();assert.equal(ownerData.data['relay.chats.v1'][0].id,'Owner conversation');
  assert.equal((await fixture.request('/api/accounts',{identity:'bob',cookie:friend.cookie})).status,403);
  assert.equal((await fixture.request('/api/auth/activate',{identity:'charlie',method:'POST',body:{token:friend.token}})).status,400);
  const dump=[...fixture.objects.values()].map(x=>new TextDecoder().decode(x.bytes)).join('');assert.ok(!dump.includes('owner-key'));assert.ok(!dump.includes('Friend conversation'));
  assert.equal((await fixture.request('/api/accounts/members/'+friend.account.id,{cookie:ownerCookie,method:'PATCH',body:{status:'disabled'}})).status,200);
  assert.equal((await fixture.request('/api/workspace',{identity:'bob',cookie:friend.cookie})).status,401);
  assert.equal((await fixture.request('/api/auth/login',{identity:'bob',method:'POST'})).status,403);
  await fixture.request('/api/accounts/members/'+friend.account.id,{cookie:ownerCookie,method:'PATCH',body:{status:'active'}});
  assert.equal((await fixture.request('/api/workspace',{identity:'bob',cookie:friend.cookie})).status,401);
  const renewedCookie=await fixture.login('bob');assert.equal((await fixture.request('/api/workspace',{identity:'bob',cookie:renewedCookie})).status,200);
});
test('activation tokens can be revoked and cannot be claimed twice concurrently',async()=>{
  const fixture=testEnvironment();const cookie=await fixture.login();
  let response=await fixture.request('/api/accounts',{cookie,method:'POST',body:{name:'First'}});
  let token=new URLSearchParams(new URL((await response.json()).activationUrl).hash.slice(1)).get('activate');
  const listing=await (await fixture.request('/api/accounts',{cookie})).json();
  await fixture.request('/api/accounts/invitations/'+listing.invitations[0].id,{cookie,method:'DELETE'});
  assert.equal((await fixture.request('/api/auth/activate',{identity:'bob',method:'POST',body:{token}})).status,400);
  response=await fixture.request('/api/accounts',{cookie,method:'POST',body:{name:'Next'}});
  token=new URLSearchParams(new URL((await response.json()).activationUrl).hash.slice(1)).get('activate');
  const claims=await Promise.all(['bob','charlie'].map(identity=>fixture.request('/api/auth/activate',{identity,method:'POST',body:{token}})));
  assert.equal(claims.filter(r=>r.status===200).length,1);assert.equal(claims.filter(r=>r.status===409).length,1);
});

test('expired sessions and activation links are rejected, owner cannot disable self',async()=>{
  const fixture=testEnvironment();const cookie=await fixture.login();
  const status=await (await fixture.request('/api/auth/status',{cookie})).json();
  assert.equal((await fixture.request('/api/accounts/members/'+status.account.id,{cookie,method:'PATCH',body:{status:'disabled'}})).status,400);
  const response=await fixture.request('/api/accounts',{cookie,method:'POST',body:{name:'Expires'}});
  const token=new URLSearchParams(new URL((await response.json()).activationUrl).hash.slice(1)).get('activate');
  const now=Date.now;
  try {
    Date.now=()=>now()+8*86400000;
    assert.equal((await fixture.request('/api/workspace',{cookie})).status,401);
    assert.equal((await fixture.request('/api/auth/activate',{identity:'bob',method:'POST',body:{token}})).status,400);
  }finally{Date.now=now;}
});
