const ASSETS = __RELAY_ASSETS__;
const PROVIDERS = [
  { id: "openai", name: "OpenAI", mark: "O", color: "mint", protocol: "responses", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-6-astra", summary: "GPT models through the OpenAI API", url: "https://platform.openai.com/api-keys" },
  { id: "anthropic", name: "Anthropic", mark: "A", color: "coral", protocol: "anthropic", baseUrl: "https://api.anthropic.com/v1", defaultModel: "claude-sonnet-5", summary: "Claude models through the Messages API", url: "https://console.anthropic.com/settings/keys" },
  { id: "xai", name: "xAI", mark: "x", color: "ink", protocol: "openai", baseUrl: "https://api.x.ai/v1", defaultModel: "grok-4.7", summary: "Grok models from the xAI API", url: "https://console.x.ai/team/default/api-keys" },
  { id: "moonshot", name: "Moonshot AI", mark: "K", color: "blue", protocol: "openai", baseUrl: "https://api.moonshot.ai/v1", defaultModel: "kimi-k3.1-pro", summary: "Kimi models through Moonshot’s API", url: "https://platform.moonshot.ai/console/api-keys" },
  { id: "openrouter", name: "OpenRouter", mark: "R", color: "violet", protocol: "openai", baseUrl: "https://openrouter.ai/api/v1", defaultModel: "openai/gpt-6-astra", summary: "Route across many provider model APIs", url: "https://openrouter.ai/settings/keys" },
  { id: "deepseek", name: "DeepSeek", mark: "D", color: "blue", protocol: "openai", baseUrl: "https://api.deepseek.com/v1", defaultModel: "deepseek-flash", summary: "DeepSeek models with your API account", url: "https://platform.deepseek.com/api_keys" }
];
const MAX_REQUEST_BYTES = 1_000_000;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

function text(value, maxLength, label) {
  if (typeof value !== "string") throw new HttpError(400, `${label} is required.`);
  const result = value.trim();
  if (!result || result.length > maxLength) throw new HttpError(400, `${label} must be between 1 and ${maxLength} characters.`);
  return result;
}

async function readJson(request) {
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) throw new HttpError(415, "Send a JSON request body.");
  if (Number(request.headers.get("content-length") || 0) > MAX_REQUEST_BYTES) throw new HttpError(413, "Request body is too large.");
  const reader = request.body?.getReader();
  const chunks = [];
  let length = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => {});
        throw new HttpError(413, "Request body is too large.");
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const raw = new TextDecoder().decode(bytes);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected object");
    return parsed;
  } catch { throw new HttpError(400, "Request body must be valid JSON."); }
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(value) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64Url(value) {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function identityHash(userId) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
  return base64Url(bytesToBase64(new Uint8Array(digest)));
}

async function vaultKey(env) {
  if (!env.BUCKET || !env.RELAY_CREDENTIALS_MASTER_KEY) throw new HttpError(503, "The encrypted private credential vault is not configured.");
  let raw;
  try { raw = base64ToBytes(env.RELAY_CREDENTIALS_MASTER_KEY); } catch { throw new HttpError(503, "The private credential vault key is invalid."); }
  if (raw.length !== 32) throw new HttpError(503, "The private credential vault key must be 32 bytes.");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptJson(value, env) {
  const key = await vaultKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const packed = new Uint8Array(iv.length + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), iv.length);
  return packed;
}

async function decryptJson(packed, env) {
  const key = await vaultKey(env);
  const bytes = new Uint8Array(packed);
  if (bytes.length < 29) throw new HttpError(500, "The encrypted credential record is damaged.");
  try {
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch { throw new HttpError(500, "The private credential vault could not be decrypted."); }
}

function emptyCredentials() { return { version: 1, providers: [], mcpServers: [] }; }

async function credentialKey(userId) { return `credentials/${await identityHash(userId)}.json.enc`; }

async function loadCredentials(userId, env) {
  await vaultKey(env);
  const object = await env.BUCKET.get(await credentialKey(userId));
  if (!object) {
    await vaultKey(env);
    return emptyCredentials();
  }
  const stored = await decryptJson(await object.arrayBuffer(), env);
  return { version: 1, providers: Array.isArray(stored.providers) ? stored.providers : [], mcpServers: Array.isArray(stored.mcpServers) ? stored.mcpServers : [] };
}

async function saveCredentials(userId, env, stored) {
  await env.BUCKET.put(await credentialKey(userId), await encryptJson(stored, env), { httpMetadata: { contentType: "application/octet-stream", cacheControl: "no-store" } });
}

async function putPending(userId, env, id, value) {
  const key = `pending/${await identityHash(userId)}/${id}.enc`;
  await env.BUCKET.put(key, await encryptJson({ expiresAt: Date.now() + 86_400_000, ...value }, env), { httpMetadata: { contentType: "application/octet-stream", cacheControl: "no-store" } });
}

async function takePending(userId, env, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const key = `pending/${await identityHash(userId)}/${id}.enc`;
  const object = await env.BUCKET.get(key);
  if (!object) return null;
  const value = await decryptJson(await object.arrayBuffer(), env);
  await env.BUCKET.delete(key);
  return value.expiresAt > Date.now() ? value : null;
}

async function clearUserPending(userId, env) {
  const prefix = `pending/${await identityHash(userId)}/`;
  let cursor;
  do {
    const page = await env.BUCKET.list({ prefix, ...(cursor ? { cursor } : {}), limit: 1000 });
    if (page.objects?.length) await Promise.all(page.objects.map((object) => env.BUCKET.delete(object.key)));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

function isPrivateIPv4(host) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  const octets = host.split(".").map(Number);
  if (octets.some((part) => part > 255)) return true;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224 || (a === 198 && (b === 18 || b === 19));
}

function isPrivateHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test") || host.endsWith(".lan") || host.endsWith(".home")) return true;
  if (host.startsWith("[") && host.endsWith("]")) {
    const ip = host.slice(1, -1).toLowerCase();
    if (ip === "::" || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || /^fe[89ab]/.test(ip)) return true;
    if (ip.startsWith("::ffff:")) {
      const mapped = ip.slice(7);
      if (mapped.includes(".")) return isPrivateIPv4(mapped);
      const parts = mapped.split(":").filter(Boolean);
      if (parts.length >= 2) {
        const high = Number.parseInt(parts.at(-2), 16);
        const low = Number.parseInt(parts.at(-1), 16);
        if (Number.isFinite(high) && Number.isFinite(low)) return isPrivateIPv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
      }
      return true;
    }
    return false;
  }
  if (/^\d/.test(host)) return isPrivateIPv4(host);
  return false;
}

function validateEndpoint(input) {
  let endpoint;
  try { endpoint = new URL(String(input || "")); } catch { throw new HttpError(400, "Enter a valid server URL."); }
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.hash || isPrivateHostname(endpoint.hostname)) throw new HttpError(400, "Remote MCP and provider endpoints must use a public HTTPS URL without embedded credentials.");
  if ([...endpoint.searchParams.keys()].some((key) => /token|key|secret|password|auth|credential/i.test(key))) throw new HttpError(400, "Put the endpoint credential in the token field, not in the URL.");
  return endpoint;
}

async function readLimitedResponseText(response, maxBytes) {
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw new HttpError(502, "Remote service response is too large.");
  }
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new HttpError(502, "Remote service response is too large.");
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(joined);
}

async function readRpcResponse(response) {
  if (!response.ok) throw new HttpError(response.status >= 500 ? 502 : 400, `MCP endpoint returned HTTP ${response.status}.`);
  const body = await readLimitedResponseText(response, 5_000_000);
  if (!body.trim()) return null;
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("text/event-stream")) {
    const data = body.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).filter(Boolean);
    for (let i = data.length - 1; i >= 0; i--) { try { return JSON.parse(data[i]); } catch {} }
    throw new HttpError(502, "MCP endpoint returned an invalid event stream.");
  }
  try { return JSON.parse(body); } catch { throw new HttpError(502, "MCP endpoint returned invalid JSON."); }
}

async function mcpPost(profile, payload, sessionId = "") {
  const url = validateEndpoint(profile.url);
  const headers = { accept: "application/json, text/event-stream", "content-type": "application/json" };
  if (profile.token) headers.authorization = `Bearer ${profile.token}`;
  if (sessionId) headers["mcp-session-id"] = sessionId;
  let response;
  try {
    response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload), redirect: "manual", signal: AbortSignal.timeout(90_000) });
  } catch { throw new HttpError(502, "Could not reach the MCP endpoint. Check its URL and try again."); }
  if (response.status >= 300 && response.status < 400) throw new HttpError(400, "MCP redirects are not allowed. Use the final HTTPS endpoint.");
  const nextSession = response.headers.get("mcp-session-id") || sessionId;
  return { body: await readRpcResponse(response), sessionId: nextSession };
}

async function mcpRequest(profile, method, params = undefined) {
  const init = await mcpPost(profile, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "Doter", version: "1.0.0" } } });
  if (init.body?.error) throw new HttpError(502, `MCP initialize failed: ${String(init.body.error.message || "unknown error").slice(0, 300)}`);
  const sessionId = init.sessionId;
  if (sessionId) {
    const endpoint = validateEndpoint(profile.url);
    const headers = { accept: "application/json, text/event-stream", "content-type": "application/json", "mcp-session-id": sessionId };
    if (profile.token) headers.authorization = `Bearer ${profile.token}`;
    try { await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }), redirect: "manual", signal: AbortSignal.timeout(10_000) }); } catch {}
  }
  try {
    const result = await mcpPost(profile, { jsonrpc: "2.0", id: 2, method, ...(params ? { params } : {}) }, sessionId);
    if (result.body?.error) throw new HttpError(502, `MCP ${method} failed: ${String(result.body.error.message || "unknown error").slice(0, 300)}`);
    return result.body?.result || {};
  } finally {
    if (sessionId) {
      const endpoint = validateEndpoint(profile.url);
      const headers = { "mcp-session-id": sessionId };
      if (profile.token) headers.authorization = `Bearer ${profile.token}`;
      try { await fetch(endpoint, { method: "DELETE", headers, redirect: "manual", signal: AbortSignal.timeout(5_000) }); } catch {}
    }
  }
}

async function discoverMcp(profile) {
  const result = await mcpRequest(profile, "tools/list");
  return (Array.isArray(result.tools) ? result.tools : []).slice(0, 200).map((tool) => {
    const schema = tool.inputSchema && typeof tool.inputSchema === "object" && !Array.isArray(tool.inputSchema) ? tool.inputSchema : { type: "object", properties: {} };
    let inputSchema = schema;
    try {
      if (schema.type && schema.type !== "object") inputSchema = { type: "object", properties: {} };
      else if (JSON.stringify(schema).length > 40_000) inputSchema = { type: "object", properties: {} };
    } catch { inputSchema = { type: "object", properties: {} }; }
    return { name: String(tool.name || "").slice(0, 200), description: String(tool.description || "").slice(0, 2000), inputSchema };
  }).filter((tool) => tool.name);
}

function normalizeToolOutput(result) {
  const texts = [];
  const images = [];
  for (const block of Array.isArray(result?.content) ? result.content : []) {
    if (block?.type === "text" && block.text) texts.push(String(block.text));
    else if (block?.type === "image") {
      const mimeType = String(block.mimeType || "").toLowerCase();
      const data = typeof block.data === "string" ? block.data : "";
      if (["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mimeType) && data.length > 0 && data.length <= 1_000_000 && /^[A-Za-z0-9+/]+={0,2}$/.test(data) && images.length < 2) {
        images.push({ mimeType, data });
        texts.push(`[${mimeType} image attached for visual inspection.]`);
      } else texts.push("[Image output omitted: unsupported format or size.]");
    } else if (block?.type === "resource") texts.push(`[Resource returned: ${String(block.resource?.uri || "resource link").slice(0, 500)}]`);
    else if (block?.type) texts.push(`[${String(block.type).slice(0, 80)} output omitted.]`);
  }
  return { text: (texts.join("\n") || "Tool completed without text output.").slice(0, 20_000), images, isError: Boolean(result?.isError) };
}

function safeProviderSummary(provider, connected) {
  const def = PROVIDERS.find((item) => item.id === provider.id);
  return {
    id: provider.id,
    name: provider.name || def?.name || "Custom endpoint",
    mark: provider.mark || def?.mark || "C",
    color: provider.color || def?.color || "violet",
    protocol: provider.protocol || def?.protocol || "openai",
    baseUrl: provider.baseUrl || def?.baseUrl || "",
    model: provider.model || def?.defaultModel || "",
    defaultModel: def?.defaultModel || provider.model || "",
    summary: provider.summary || def?.summary || "Custom OpenAI-compatible endpoint",
    url: provider.url || def?.url || "",
    connected,
    isCustom: Boolean(provider.isCustom)
  };
}

function listProviders(stored) {
  const connected = new Map(stored.providers.map((provider) => [provider.id, provider]));
  const builtins = PROVIDERS.map((provider) => safeProviderSummary(connected.get(provider.id) || provider, connected.has(provider.id)));
  const custom = stored.providers.filter((provider) => provider.isCustom).map((provider) => safeProviderSummary(provider, true));
  return [...builtins, ...custom];
}

async function listMcpServers(stored) {
  const output = [];
  for (const profile of stored.mcpServers) {
    let tools = [];
    let connected = false;
    try { tools = await discoverMcp(profile); connected = true; } catch {}
    output.push({ id: profile.id, name: profile.name, url: profile.url, tools, authenticated: Boolean(profile.token), connected, connectedAt: profile.connectedAt || null });
  }
  return output;
}

function providerDefinitions(refs, servers) {
  const definitions = [];
  const toolMap = {};
  const tools = [];
  for (const server of servers) for (const tool of server.tools) tools.push({ server, tool });
  for (const ref of Array.isArray(refs) ? refs.slice(0, 40) : []) {
    const target = tools.find(({ server, tool }) => server.id === String(ref.serverId || "") && tool.name === String(ref.toolName || ""));
    if (!target) continue;
    const alias = `relay_action_${definitions.length + 1}`;
    const schema = target.tool.inputSchema && typeof target.tool.inputSchema === "object" ? target.tool.inputSchema : { type: "object", properties: {} };
    definitions.push({ type: "function", function: { name: alias, description: `${target.server.name}: ${target.tool.description || target.tool.name}`.slice(0, 1000), parameters: schema } });
    toolMap[alias] = { serverId: target.server.id, serverName: target.server.name, toolName: target.tool.name, description: target.tool.description || "", inputSchema: schema };
  }
  return { definitions, toolMap };
}

function parseToolArguments(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return {};
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; } catch { return { invalidJson: value.slice(0, 5000) }; }
}

async function providerRequest(provider, messages, toolDefinitions = []) {
  const baseUrl = provider.baseUrl.replace(/\/+$/, "");
  const isAnthropic = provider.protocol === "anthropic";
  const isResponses = provider.protocol === "responses";
  const endpoint = `${baseUrl}/${isAnthropic ? "messages" : isResponses ? "responses" : "chat/completions"}`;
  const headers = { "content-type": "application/json" };
  let body;
  if (isAnthropic) {
    const systems = messages.filter((message) => message.role === "system").map((message) => typeof message.content === "string" ? message.content : "");
    body = { model: provider.model, max_tokens: 1200, messages: messages.filter((message) => message.role !== "system").map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: message.content })), ...(systems.length ? { system: systems.join("\n\n") } : {}), ...(toolDefinitions.length ? { tools: toolDefinitions.map((tool) => ({ name: tool.function.name, description: tool.function.description, input_schema: tool.function.parameters })) } : {}) };
    headers["x-api-key"] = provider.apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (isResponses) {
    body = { model: provider.model, input: messages, max_output_tokens: 1200, ...(toolDefinitions.length ? { tools: toolDefinitions.map((tool) => ({ type: "function", name: tool.function.name, description: tool.function.description, parameters: tool.function.parameters, strict: false })), tool_choice: "auto" } : {}) };
    headers.authorization = `Bearer ${provider.apiKey}`;
  } else {
    body = { model: provider.model, messages, max_tokens: 1200, temperature: 0.6, ...(toolDefinitions.length ? { tools: toolDefinitions, tool_choice: "auto" } : {}) };
    headers.authorization = `Bearer ${provider.apiKey}`;
    if (provider.id === "openrouter") { headers["HTTP-Referer"] = "https://relay.local"; headers["X-Title"] = "Doter AI Workspace"; }
  }
  let response;
  try { response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body), redirect: "error", signal: AbortSignal.timeout(90_000) }); }
  catch (error) { if (error?.name === "TimeoutError" || error?.name === "AbortError") throw new HttpError(504, `${provider.name} took too long to respond. Try again.`); throw new HttpError(502, `Could not reach ${provider.name}. Check the endpoint and try again.`); }
  let payload;
  try { payload = JSON.parse(await readLimitedResponseText(response, 2_000_000)); } catch (error) {
    if (error instanceof HttpError) throw error;
    payload = {};
  }
  if (!response.ok) throw new HttpError(response.status >= 500 ? 502 : 400, `${provider.name}: ${String(payload?.error?.message || payload?.message || `HTTP ${response.status}`).slice(0, 320)}`);
  if (isAnthropic) {
    const blocks = Array.isArray(payload.content) ? payload.content : [];
    return { text: blocks.filter((block) => block.type === "text").map((block) => block.text || "").join("\n"), toolCalls: blocks.filter((block) => block.type === "tool_use").map((block) => ({ id: block.id, name: block.name, arguments: block.input || {} })), rawMessage: { role: "assistant", content: blocks }, usage: payload.usage || {} };
  }
  if (isResponses) {
    const output = Array.isArray(payload.output) ? payload.output : [];
    return { text: typeof payload.output_text === "string" ? payload.output_text : output.filter((item) => item.type === "message").flatMap((item) => item.content || []).filter((block) => block.type === "output_text").map((block) => block.text || "").join("\n"), toolCalls: output.filter((item) => item.type === "function_call").map((call) => ({ id: call.call_id || call.id, name: call.name, arguments: parseToolArguments(call.arguments) })), rawMessage: output, usage: payload.usage || {} };
  }
  const message = payload?.choices?.[0]?.message;
  if (!message) throw new HttpError(502, `${provider.name} returned an empty response.`);
  return { text: typeof message.content === "string" ? message.content : Array.isArray(message.content) ? message.content.filter((block) => block.type === "text").map((block) => block.text || "").join("\n") : "", toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls.map((call) => ({ id: call.id, name: call.function?.name, arguments: parseToolArguments(call.function?.arguments) })) : [], rawMessage: message, usage: payload.usage || {} };
}

async function stageAgentTools(userId, env, { provider, messages, toolDefinitions, toolMap, completion, depth }) {
  const actions = completion.toolCalls.filter((call) => toolMap[call.name]).map((call) => ({ callId: call.id, alias: call.name, ...toolMap[call.name], arguments: call.arguments }));
  if (!actions.length) return null;
  if (depth >= 4) return null;
  const id = crypto.randomUUID();
  await putPending(userId, env, id, { providerId: provider.id, messages, toolDefinitions, toolMap, rawMessage: completion.rawMessage, actions, depth });
  return { id, providerId: provider.id, depth, actions: actions.map(({ callId, serverName, toolName, description, arguments: args }) => ({ callId, serverName, toolName, description, arguments: args })) };
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 50) throw new HttpError(400, "Send between 1 and 50 conversation messages.");
  return messages.map((message) => {
    if (!message || !["system", "user", "assistant", "tool"].includes(message.role)) throw new HttpError(400, "A conversation message is invalid.");
    const content = typeof message.content === "string" ? message.content : "";
    if (content.length > 30_000) throw new HttpError(400, "A message is too long.");
    return { role: message.role, content };
  });
}

function validateOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Cross-origin requests are not allowed.");
}

async function verifyChatgptIdToken(token,clientId,nonce) {
  try {
    const parts=String(token || '').split('.');if(parts.length!==3)throw new Error('JWT');
    const decode=p=>base64ToBytes(p.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-p.length%4)%4));
    const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));const claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
    if(header.alg!=='RS256' || claims.iss!=='https://auth.openai.com' || !(Array.isArray(claims.aud)?claims.aud:[claims.aud]).includes(clientId) || claims.nonce!==nonce || !claims.sub || !(claims.exp>Date.now()/1000))throw new Error('Claims');
    const r=await fetch('https://auth.openai.com/.well-known/jwks.json',{redirect:'error'});if(!r.ok)throw new Error('JWKS');const jwks=JSON.parse(await readLimitedResponseText(r,100000));const jwk=jwks.keys?.find(k=>k.kid===header.kid && k.kty==='RSA');if(!jwk)throw new Error('Key');
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw new Error('Signature');
  } catch {throw new HttpError(403,'ChatGPT returned an invalid identity token.');}
}

function subscriptionApps(env) {
  try { const apps=JSON.parse(env.DOTER_SUBSCRIPTION_OAUTH || '[]'); const builtin={id:'chatgpt',name:'ChatGPT subscription',clientId:'dynamic_agent_client',dynamicRegistration:true,authorizationUrl:'https://auth.openai.com/api/accounts/authorize',tokenUrl:'https://auth.openai.com/api/accounts/oauth/token',scope:'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct',apiBaseUrl:'https://api.openai.com/v1',protocol:'responses',model:'gpt-6-astra',accessDescription:'Sign in with your ChatGPT account. Provider eligibility and subscription limits apply. Desktop sign-in requires Node.js and a local callback helper.'}; return [builtin,...(Array.isArray(apps)?apps:[]).filter(a=>a.id!=='chatgpt')]; } catch { throw new HttpError(503,'Subscription OAuth configuration is invalid.'); }
}
async function subscriptionAuth(request,env,userId,url) {
  const apps=subscriptionApps(env);const route=url.pathname;
  if(route==='/api/subscriptions')return json({providers:apps.map(a=>({id:a.id,name:a.name,configured:Boolean(a.clientId),accessDescription:a.accessDescription || 'Access and billing are determined by the provider.'}))});
  if(route==='/api/subscriptions/start' && request.method==='POST') {
    const body=await readJson(request);const app=apps.find(a=>a.id===body.providerId);
    if(!app?.clientId)throw new HttpError(409,'Register this app with the provider and configure its OAuth client ID first.');
    const state=crypto.randomUUID();const verifier=base64Url(bytesToBase64(crypto.getRandomValues(new Uint8Array(48))));
    const challenge=base64Url(bytesToBase64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)))));
    const returnUrl=new URL('/api/subscriptions/callback',url).href;
    const callback=app.dynamicRegistration?'http://127.0.0.1:1455/auth/callback':returnUrl; const nonce=crypto.randomUUID();
    const key=`oauth/${await identityHash(userId)}/${state}.enc`;
    await env.BUCKET.put(key,await encryptJson({providerId:app.id,verifier,callback,nonce,expires:Date.now()+600000},env));
    const target=validateEndpoint(app.authorizationUrl);target.searchParams.set('client_id',app.clientId);target.searchParams.set('redirect_uri',callback);target.searchParams.set('response_type','code');target.searchParams.set('scope',app.scope || '');target.searchParams.set('state',state);target.searchParams.set('code_challenge',challenge);target.searchParams.set('code_challenge_method','S256');
    if(app.dynamicRegistration){target.searchParams.set('agent_name_hint','doter');target.searchParams.set('ext_agent_host_id',`urn:uuid:${state}`);target.searchParams.set('resource','https://api.openai.com/v1');target.searchParams.set('nonce',nonce);}
    if(app.dynamicRegistration) {
      const helperSource=ASSETS['/login-helper.mjs'].body.replace('__LOGIN_CONFIGURATION__',JSON.stringify({authorizationUrl:target.href,returnUrl,state,expires:Date.now()+600000}));
      return json({authorizationUrl:target.href,requiresLocalHelper:true,helperSource});
    }
    return json({authorizationUrl:target.href});
  }
  if(route==='/api/subscriptions/callback' && request.method==='GET') {
    const state=url.searchParams.get('state') || '';if(!/^[a-z0-9-]{36}$/i.test(state))throw new HttpError(400,'Invalid OAuth state.');
    const key=`oauth/${await identityHash(userId)}/${state}.enc`;const object=await env.BUCKET.get(key);if(!object)throw new HttpError(400,'OAuth session expired or was already used.');
    await env.BUCKET.delete(key);const pending=await decryptJson(await object.arrayBuffer(),env);if(pending.expires<Date.now())throw new HttpError(400,'OAuth session expired.');
    if(url.searchParams.has('error'))throw new HttpError(400,'Provider login was declined.');
    const app=apps.find(a=>a.id===pending.providerId);if(!app)throw new HttpError(409,'OAuth provider configuration changed.');
    const issuedClientId=app.dynamicRegistration?text(url.searchParams.get('client_id'),300,'Issued client ID'):app.clientId;
    const params=new URLSearchParams({grant_type:'authorization_code',code:text(url.searchParams.get('code'),8192,'Authorization code'),redirect_uri:pending.callback,client_id:issuedClientId,code_verifier:pending.verifier});if(app.clientSecret)params.set('client_secret',app.clientSecret);
    const response=await fetch(validateEndpoint(app.tokenUrl),{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:params,redirect:'error'});
    if(!response.ok)throw new HttpError(502,'Provider token exchange failed.');const token=JSON.parse(await readLimitedResponseText(response,100000));if(!token.access_token)throw new HttpError(502,'Provider did not issue an access token.');
    if(app.dynamicRegistration){if(!String(token.scope || '').split(' ').includes('chatgpt.tokens.use.direct'))throw new HttpError(403,'ChatGPT did not grant subscription token sharing.');await verifyChatgptIdToken(token.id_token,issuedClientId,pending.nonce);}
    const stored=await loadCredentials(userId,env);const id=`subscription-${app.id}`;const provider={id,name:app.name,mark:app.name.slice(0,1),color:'violet',protocol:app.protocol==='responses'?'responses':'openai',baseUrl:validateEndpoint(app.apiBaseUrl).href.replace(/\/$/,''),model:app.model,apiKey:token.access_token,isCustom:true,oauth:{providerId:app.id,clientId:issuedClientId,refreshToken:token.refresh_token || '',expiresAt:Date.now()+(Number(token.expires_in)||3600)*1000},summary:'Provider-authorized subscription connection'};
    stored.providers=stored.providers.filter(p=>p.id!==id);stored.providers.push(provider);await saveCredentials(userId,env,stored);
    return Response.redirect(new URL('/#providers',url).href,303);
  }
  throw new HttpError(405,'Unsupported subscription authentication request.');
}
async function refreshSubscriptionTokens(stored,env,userId) {
  let changed=false;
  for(const p of stored.providers) {
    if(!p.oauth || p.oauth.expiresAt>Date.now()+60000)continue;
    const app=subscriptionApps(env).find(a=>a.id===p.oauth.providerId);
    if(!app || !p.oauth.refreshToken)throw new HttpError(401,`Reconnect ${p.name}; its authorization expired.`);
    const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:p.oauth.refreshToken,client_id:p.oauth.clientId || app.clientId});if(app.clientSecret)body.set('client_secret',app.clientSecret);
    const r=await fetch(validateEndpoint(app.tokenUrl),{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body,redirect:'error'});if(!r.ok)throw new HttpError(401,`Reconnect ${p.name}; token refresh failed.`);
    const t=JSON.parse(await readLimitedResponseText(r,100000));if(!t.access_token)throw new HttpError(502,'Provider returned an invalid refresh response.');p.apiKey=t.access_token;p.oauth.refreshToken=t.refresh_token || p.oauth.refreshToken;p.oauth.expiresAt=Date.now()+(Number(t.expires_in)||3600)*1000;changed=true;
  }
  if(changed && userId)await saveCredentials(userId,env,stored);
}

async function handleApi(request, env, userId, url) {
  const method = request.method;
  const path = url.pathname;
  if (method === "GET" && path === "/api/health") return json({ ok: true, name: "Doter", mode: "cloud", restoringMcp: false, continuousRuntime: Boolean(env.DOTER_RUNTIME_URL && env.DOTER_RUNTIME_TOKEN) });
  if(path.startsWith('/api/subscriptions'))return subscriptionAuth(request,env,userId,url);
  const agentRoute = path.match(/^\/api\/agents(?:\/([a-zA-Z0-9_-]{1,100}))?(?:\/(pause|resume|approve|feedback))?$/);
  if (agentRoute) {
    if (!env.DOTER_RUNTIME_URL || !env.DOTER_RUNTIME_TOKEN) return json({error:"The durable agent service needs deployment. Connect DOTER_RUNTIME_URL and DOTER_RUNTIME_TOKEN in the Site runtime settings."},503);
    const owner=await identityHash(userId); const id=agentRoute[1];
    if (!id) return json({error:"Choose an agent ID."},400);
    const endpoint=validateEndpoint(env.DOTER_RUNTIME_URL);
    endpoint.pathname=`/agents/${owner}_${id}${agentRoute[2] ? '/'+agentRoute[2] : ''}`;
    let body;
    let outboundMethod=method;
    if(method==='PUT') {
      const input=await readJson(request);const credentials=await loadCredentials(userId,env);
      const provider=credentials.providers.find(p=>p.id===input.providerId);
      if(!provider)return json({error:'Connect the selected provider first.'},409);
      body=JSON.stringify({goal:text(input.goal,12000,'Goal'),provider,servers:input.useTools?credentials.mcpServers:[],policy:input.policy || {},intervalMs:input.intervalMs});
    } else if(method==='POST') body=JSON.stringify(await readJson(request));
    const remote=await fetch(endpoint,{method:outboundMethod,headers:{authorization:`Bearer ${env.DOTER_RUNTIME_TOKEN}`,'content-type':'application/json'},...(body?{body}:{}),redirect:'error'});
    return new Response(remote.body,{status:remote.status,headers:{'content-type':'application/json','cache-control':'no-store'}});
  }
  const stored = await loadCredentials(userId, env);
  await refreshSubscriptionTokens(stored,env,userId);
  if (method === "GET" && path === "/api/providers") return json({ providers: listProviders(stored) });
  if (method === "GET" && path === "/api/mcp") return json({ servers: await listMcpServers(stored) });
  if (method === "POST" && path === "/api/providers") {
    const body = await readJson(request);
    const providerId = String(body.providerId || "");
    const apiKey = text(body.apiKey, 8192, "API key");
    const model = text(body.model, 200, "Model ID");
    let provider;
    if (providerId === "custom" || providerId.startsWith("custom-")) {
      const existing = stored.providers.find((item) => item.id === providerId && item.isCustom);
      if (providerId !== "custom" && !existing) throw new HttpError(404, "That custom provider is not connected.");
      const name = text(body.name || existing?.name, 100, "Provider name");
      const baseUrl = validateEndpoint(body.baseUrl || existing?.baseUrl);
      provider = { ...(existing || {}), id: existing?.id || `custom-${crypto.randomUUID()}`, name, mark: name.slice(0, 1).toUpperCase(), color: "violet", protocol: "openai", baseUrl: baseUrl.toString().replace(/\/+$/, ""), model, defaultModel: model, summary: "Custom OpenAI-compatible endpoint", url: "", isCustom: true };
    } else {
      const definition = PROVIDERS.find((item) => item.id === providerId);
      if (!definition) throw new HttpError(400, "Select a supported provider.");
      provider = { ...definition, model, apiKey };
    }
    provider.apiKey = apiKey;
    const index = stored.providers.findIndex((item) => item.id === provider.id);
    if (index < 0) stored.providers.push(provider); else stored.providers[index] = provider;
    await saveCredentials(userId, env, stored);
    return json({ provider: safeProviderSummary(provider, true) }, 201);
  }
  const providerMatch = path.match(/^\/api\/providers\/([^/]+)$/);
  if (method === "DELETE" && providerMatch) {
    const id = decodeURIComponent(providerMatch[1]);
    const next = { ...stored, providers: stored.providers.filter((item) => item.id !== id) };
    await saveCredentials(userId, env, next);
    return json({ ok: true });
  }
  if (method === "POST" && path === "/api/mcp") {
    const body = await readJson(request);
    const endpoint = validateEndpoint(body.url);
    const profile = { id: crypto.randomUUID(), name: text(body.name || endpoint.hostname, 100, "Server name"), url: endpoint.toString(), token: typeof body.token === "string" ? body.token.trim().slice(0, 8192) : "", connectedAt: new Date().toISOString() };
    const tools = await discoverMcp(profile);
    const next = { ...stored, mcpServers: [...stored.mcpServers, profile] };
    await saveCredentials(userId, env, next);
    return json({ server: { id: profile.id, name: profile.name, url: profile.url, token: undefined, tools, authenticated: Boolean(profile.token), connected: true, connectedAt: profile.connectedAt } }, 201);
  }
  const reconnect = path.match(/^\/api\/mcp\/([^/]+)\/(reconnect|refresh)$/);
  if ((method === "POST" && reconnect) || (method === "POST" && path === "/api/mcp/refresh")) {
    const id = reconnect ? decodeURIComponent(reconnect[1]) : "";
    const profile = stored.mcpServers.find((item) => item.id === id);
    if (!profile) throw new HttpError(404, "That saved MCP server is not available.");
    const tools = await discoverMcp(profile);
    return json({ server: { id: profile.id, name: profile.name, url: profile.url, tools, authenticated: Boolean(profile.token), connected: true, connectedAt: profile.connectedAt } });
  }
  const callMatch = path.match(/^\/api\/mcp\/([^/]+)\/call$/);
  if (method === "POST" && callMatch) {
    const id = decodeURIComponent(callMatch[1]);
    const profile = stored.mcpServers.find((item) => item.id === id);
    if (!profile) throw new HttpError(404, "That MCP server is not connected.");
    const body = await readJson(request);
    if (body.confirmed !== true) throw new HttpError(428, "Confirm this tool action in Doter before it runs.");
    const toolName = text(body.toolName, 200, "Tool name");
    const tools = await discoverMcp(profile);
    if (!tools.some((tool) => tool.name === toolName)) throw new HttpError(404, "That tool is not available on this server.");
    const args = body.arguments && typeof body.arguments === "object" && !Array.isArray(body.arguments) ? body.arguments : {};
    const output = normalizeToolOutput(await mcpRequest(profile, "tools/call", { name: toolName, arguments: args }));
    return json(output);
  }
  const mcpDelete = path.match(/^\/api\/mcp\/([^/]+)$/);
  if (method === "DELETE" && mcpDelete) {
    const id = decodeURIComponent(mcpDelete[1]);
    const next = { ...stored, mcpServers: stored.mcpServers.filter((item) => item.id !== id) };
    if (next.mcpServers.length === stored.mcpServers.length) throw new HttpError(404, "That MCP server is not connected.");
    await saveCredentials(userId, env, next);
    return json({ ok: true });
  }
  if (method === "POST" && path === "/api/chat") {
    const body = await readJson(request);
    const provider = stored.providers.find((item) => item.id === String(body.providerId || ""));
    if (!provider) throw new HttpError(409, "Connect an API provider before using live chat.");
    const messages = normalizeMessages(body.messages);
    const servers = await listMcpServers(stored);
    const { definitions, toolMap } = providerDefinitions(body.toolRefs, servers);
    const completion = await providerRequest(provider, messages, definitions);
    const pending = await stageAgentTools(userId, env, { provider, messages, toolDefinitions: definitions, toolMap, completion, depth: 0 });
    return json({ answer: completion.text, usage: completion.usage, pending });
  }
  if (method === "POST" && path === "/api/agent/approve") {
    const body = await readJson(request);
    const pendingId = String(body.pendingId || "");
    const pending = await takePending(userId, env, pendingId);
    if (!pending) throw new HttpError(404, "That approval request has expired. Send the prompt again.");
    const provider = stored.providers.find((item) => item.id === pending.providerId);
    if (!provider) throw new HttpError(409, "Reconnect the model provider before approving this action.");
    const results = [];
    for (const action of pending.actions) {
      const profile = stored.mcpServers.find((item) => item.id === action.serverId);
      if (!profile) { results.push({ action, text: "The MCP server was disconnected before the action ran.", images: [], isError: true }); continue; }
      try {
        const result = await mcpRequest(profile, "tools/call", { name: action.toolName, arguments: action.arguments });
        results.push({ action, ...normalizeToolOutput(result) });
      } catch (error) { results.push({ action, text: `Tool error: ${String(error?.message || "Tool call failed").slice(0, 500)}`, images: [], isError: true }); }
    }
    const followup = [...pending.messages];
    if (provider.protocol === "anthropic") {
      followup.push({ role: "assistant", content: pending.rawMessage.content });
      followup.push({ role: "user", content: results.map((item) => ({ type: "tool_result", tool_use_id: item.action.callId, content: [{ type: "text", text: item.text }, ...item.images.map((image) => ({ type: "image", source: { type: "base64", media_type: image.mimeType, data: image.data } }))], ...(item.isError ? { is_error: true } : {}) })) });
    } else if (provider.protocol === "responses") {
      followup.push(...pending.rawMessage);
      const imageFollowups = [];
      for (const item of results) {
        followup.push({ type: "function_call_output", call_id: item.action.callId, output: item.text });
        if (item.images.length) imageFollowups.push({ role: "user", content: [{ type: "input_text", text: `Visual output from ${item.action.serverName} / ${item.action.toolName}:` }, ...item.images.map((image) => ({ type: "input_image", image_url: `data:${image.mimeType};base64,${image.data}` }))] });
      }
      followup.push(...imageFollowups);
    } else {
      followup.push({ role: "assistant", content: pending.rawMessage.content ?? null, tool_calls: pending.rawMessage.tool_calls });
      const imageFollowups = [];
      for (const item of results) {
        followup.push({ role: "tool", tool_call_id: item.action.callId, content: item.text });
        if (item.images.length) imageFollowups.push({ role: "user", content: [{ type: "text", text: `Visual output from ${item.action.serverName} / ${item.action.toolName}:` }, ...item.images.map((image) => ({ type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.data}` } }))] });
      }
      followup.push(...imageFollowups);
    }
    const completion = await providerRequest(provider, followup, pending.toolDefinitions);
    const nextPending = await stageAgentTools(userId, env, { provider, messages: followup, toolDefinitions: pending.toolDefinitions, toolMap: pending.toolMap, completion, depth: pending.depth + 1 });
    const hitToolLimit = pending.depth + 1 >= 4 && completion.toolCalls.some((call) => pending.toolMap[call.name]);
    return json({ answer: hitToolLimit ? "I reached the four-step tool limit for this turn. Review the current results and continue with a new message." : completion.text, usage: completion.usage, pending: nextPending, providerId: provider.id, toolResults: results.map((item) => ({ serverName: item.action.serverName, toolName: item.action.toolName, isError: item.isError, text: item.text, images: item.images })) });
  }
  if (method === "DELETE" && path === "/api/credentials") {
    await env.BUCKET.delete(await credentialKey(userId));
    await clearUserPending(userId, env);
    return json({ ok: true });
  }
  throw new HttpError(404, "Route not found.");
}

function serveAsset(request) {
  const url = new URL(request.url);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const asset = ASSETS[pathname];
  if (!asset) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
  return new Response(asset.body, { status: 200, headers: { "content-type": asset.type, "cache-control": pathname === "/index.html" ? "no-cache" : "public, max-age=300", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" } });
}

__ACCOUNT_CORE__

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) {
        validateOrigin(request);
        const userId = request.headers.get("oai-authenticated-user-id");
        if (!userId) return json({ error: "Sign in through the private Site to use Doter." }, 401);
        if(url.pathname.startsWith('/api/auth/') || url.pathname==='/api/workspace' || url.pathname==='/api/account' || url.pathname==='/api/accounts' || url.pathname.startsWith('/api/accounts/'))return await handleAccounts(request,env,userId,url);
        const account=await resolveAccountSession(request,env,userId);
        if(!account)return json({error:'Sign in to your doter account.'},401);
        const response = await handleApi(request, env, account.identity, url);
        return response;
      }
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
      return serveAsset(request);
    } catch (error) {
      return json({ error: error instanceof HttpError ? error.message : "Doter could not complete that request. Try again." }, error instanceof HttpError ? error.status : 500);
    }
  }
};
