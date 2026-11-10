import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('loopback helper rejects invalid state and forwards a valid callback once', {timeout:10000}, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'doter-login-test-'));
  t.after(() => rm(directory, {recursive:true,force:true}));
  const template = await readFile(new URL('../public/login-helper.mjs', import.meta.url), 'utf8');
  const config = {authorizationUrl:'https://auth.openai.com/api/accounts/authorize?redirect_uri=http%3A%2F%2F127.0.0.1%3A1455%2Fauth%2Fcallback',returnUrl:'https://doter.test/api/subscriptions/callback',state:'expected',expires:Date.now()+8000};
  const script = join(directory, 'login.mjs');
  await writeFile(script, template.replace('__LOGIN_CONFIGURATION__', JSON.stringify(config)));
  const child = spawn(process.execPath, [script], {env:{...process.env,PATH:directory},stdio:['ignore','pipe','pipe']});
  t.after(() => child.kill());
  await once(child.stdout, 'data');
  const endpoint = 'http://127.0.0.1:1455/auth/callback';
  let result = await fetch(endpoint+'?state=wrong&code=secret', {redirect:'manual'});
  assert.equal(result.status,400);
  result = await fetch(endpoint+'?state=expected&code=secret&client_id=issued&extra=discard', {redirect:'manual'});
  assert.equal(result.status,303);
  assert.equal(result.headers.get('referrer-policy'),'no-referrer');
  assert.equal(result.headers.get('location'),'https://doter.test/api/subscriptions/callback?code=secret&state=expected&client_id=issued');
});
