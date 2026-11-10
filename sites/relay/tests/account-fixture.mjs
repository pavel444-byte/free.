import site from '../dist/server/index.js';
export function testEnvironment() {
  const objects=new Map();let sequence=0;
  const env={DOTER_OWNER_ID:'alice',RELAY_CREDENTIALS_MASTER_KEY:Buffer.alloc(32,2).toString('base64'),BUCKET:{
    get:async key=>{const entry=objects.get(key);return entry?{etag:entry.etag,arrayBuffer:async()=>new Uint8Array(entry.bytes).buffer}:null;},
    put:async(key,bytes,options)=>{
      const current=objects.get(key);
      if(options?.onlyIf?.etagDoesNotMatch==='*' && current)return null;
      if(options?.onlyIf?.etagMatches && current?.etag!==options.onlyIf.etagMatches)return null;
      const etag=String(++sequence);objects.set(key,{bytes:new Uint8Array(bytes),etag});return {etag};
    },
    delete:async key=>objects.delete(key),
    list:async({prefix})=>({objects:[...objects.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key})),truncated:false})
  }};
  async function request(path,{identity='alice',cookie='',method='GET',body,origin}={}) {
    const headers={'content-type':'application/json'};
    if(identity)headers['oai-authenticated-user-id']=identity;
    if(cookie)headers.cookie=cookie;
    if(origin)headers.origin=origin;
    return site.fetch(new Request('https://doter.test'+path,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})}),env);
  }
  async function login(identity='alice') {
    const response=await request('/api/auth/login',{identity,method:'POST'});
    if(response.status!==200)throw new Error(await response.text());
    return response.headers.get('set-cookie').split(';')[0];
  }
  return {env,objects,request,login};
}
