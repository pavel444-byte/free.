import {readFile,writeFile,mkdir} from 'node:fs/promises';
const template=(await readFile('worker/index.template.js','utf8')).replace('__ACCOUNT_CORE__',await readFile('worker/accounts.js','utf8'));
const core=template.slice(0,template.lastIndexOf('export default {')).replace('const ASSETS = __RELAY_ASSETS__;','const ASSETS = {};').replace('!env.BUCKET || !env.RELAY_CREDENTIALS_MASTER_KEY','!env.RELAY_CREDENTIALS_MASTER_KEY');
await mkdir('runtime/dist',{recursive:true});
await writeFile('runtime/dist/index.js',core+'\n'+await readFile('runtime/agent-runtime.js','utf8'));
