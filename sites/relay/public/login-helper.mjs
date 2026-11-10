// Generated per sign-in. No API keys, tokens, or PKCE verifier are included.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
const config = __LOGIN_CONFIGURATION__;
if (Date.now() >= config.expires) throw new Error('Sign-in expired. Connect again in doter.');
const authorization = new URL(config.authorizationUrl);
const callback = new URL(authorization.searchParams.get('redirect_uri'));
const destination = new URL(config.returnUrl);
if (authorization.origin !== 'https://auth.openai.com' || callback.origin !== 'http://127.0.0.1:1455' || destination.protocol !== 'https:') throw new Error('Invalid sign-in configuration.');
let finished = false;
const server = createServer((request, response) => {
  const url = new URL(request.url, callback.origin);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  if (request.method !== 'GET' || request.headers.host !== callback.host || url.pathname !== callback.pathname) return response.writeHead(404).end('Not found');
  if (url.searchParams.get('state') !== config.state) return response.writeHead(400).end('Invalid sign-in state.');
  if (finished) return response.writeHead(409).end('Sign-in already received.');
  if (!url.searchParams.get('code') && !url.searchParams.has('error')) return response.writeHead(400).end('Missing authorization code.');
  finished = true;
  const target = new URL(destination);
  for (const key of ['code', 'state', 'client_id', 'error']) {
    if (url.searchParams.has(key)) target.searchParams.set(key, url.searchParams.get(key));
  }
  response.writeHead(303, { Location: target.href }).end();
  clearTimeout(timeout);
  server.close();
  console.log('Returning to doter. Complete sign-in in the browser.');
});
const timeout = setTimeout(() => { console.error('Sign-in expired. Connect again in doter.'); server.close(); }, Math.max(1, config.expires - Date.now()));
server.on('error', error => {
  clearTimeout(timeout);
  console.error(error.code === 'EADDRINUSE' ? 'Port 1455 is in use. Close the other sign-in helper, then retry.' : error.message);
  process.exitCode = 1;
});
server.listen(1455, '127.0.0.1', () => {
  console.log('Sign in using this URL:\n' + authorization.href);
  const [command, args] = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', authorization.href]] : process.platform === 'darwin' ? ['open', [authorization.href]] : ['xdg-open', [authorization.href]];
  const browser = spawn(command, args, { stdio: 'ignore' });
  browser.on('error', () => console.log('Open the URL above in your browser.'));
});
