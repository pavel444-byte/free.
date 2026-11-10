import { createServer } from "node:http";
import { chmod, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(ROOT, "public");
const DATA_DIR = resolve(ROOT, "data");
const CREDENTIALS_FILE = resolve(DATA_DIR, "credentials.json");
const PORT = Number.parseInt(process.env.RELAY_PORT || "4173", 10);

const PROVIDER_DEFS = [
  {
    id: "openai",
    name: "OpenAI",
    mark: "O",
    color: "mint",
    protocol: "responses",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-6-astra",
    summary: "GPT models through the OpenAI API",
    url: "https://platform.openai.com/api-keys"
  },
  {
    id: "anthropic",
    name: "Anthropic",
    mark: "A",
    color: "coral",
    protocol: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-5",
    summary: "Claude models through the Messages API",
    url: "https://console.anthropic.com/settings/keys"
  },
  {
    id: "xai",
    name: "xAI",
    mark: "x",
    color: "ink",
    protocol: "openai",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4.7",
    summary: "Grok models from the xAI API",
    url: "https://console.x.ai/team/default/api-keys"
  },
  {
    id: "moonshot",
    name: "Moonshot AI",
    mark: "K",
    color: "blue",
    protocol: "openai",
    baseUrl: "https://api.moonshot.ai/v1",
    defaultModel: "kimi-k3.1-pro",
    summary: "Kimi models through Moonshot’s API",
    url: "https://platform.moonshot.ai/console/api-keys"
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    mark: "R",
    color: "violet",
    protocol: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-6-astra",
    summary: "Route across many provider model APIs",
    url: "https://openrouter.ai/settings/keys"
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    mark: "D",
    color: "blue",
    protocol: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-flash",
    summary: "DeepSeek models with your API account",
    url: "https://platform.deepseek.com/api_keys"
  }
];

const providerConnections = new Map();
const mcpConnections = new Map();
const mcpProfiles = new Map();
const pendingAgentRuns = new Map();
let credentialsWriteQueue = Promise.resolve();
let restoringMcp = false;

function credentialsSnapshot() {
  return JSON.stringify({
    version: 1,
    providers: [...providerConnections.values()],
    mcpServers: [...mcpProfiles.values()]
  }, null, 2);
}

async function persistCredentials() {
  const contents = credentialsSnapshot();
  const write = credentialsWriteQueue.then(async () => {
    await mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
    await chmod(DATA_DIR, 0o700);
    const temporary = resolve(DATA_DIR, `.credentials-${randomUUID()}.tmp`);
    await writeFile(temporary, `${contents}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await chmod(temporary, 0o600);
    await rename(temporary, CREDENTIALS_FILE);
    await chmod(CREDENTIALS_FILE, 0o600);
  });
  credentialsWriteQueue = write.catch(() => {});
  return write;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(value));
}

async function readJson(req, maxBytes = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, "Request body is too large.");
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected an object.");
    }
    return parsed;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

async function readLimitedResponseText(response, maxBytes) {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw new HttpError(502, "The provider response is too large.");
  }
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new HttpError(502, "The provider response is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

function text(value, maxLength, label) {
  if (typeof value !== "string") throw new HttpError(400, `${label} is required.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maxLength) {
    throw new HttpError(400, `${label} must be between 1 and ${maxLength} characters.`);
  }
  return cleaned;
}

function safeProviderSummary(provider) {
  return {
    id: provider.id,
    name: provider.name,
    mark: provider.mark,
    color: provider.color,
    protocol: provider.protocol,
    baseUrl: provider.baseUrl,
    model: provider.model,
    defaultModel: provider.defaultModel,
    summary: provider.summary,
    url: provider.url,
    connected: true,
    isCustom: Boolean(provider.isCustom)
  };
}

function listProviders() {
  const builtIns = PROVIDER_DEFS.map((definition) => {
    const connected = providerConnections.get(definition.id);
    return connected
      ? safeProviderSummary(connected)
      : {
          ...definition,
          model: definition.defaultModel,
          connected: false
        };
  });
  const custom = [...providerConnections.values()]
    .filter((provider) => provider.isCustom)
    .map(safeProviderSummary);
  return [...builtIns, ...custom];
}

function isLoopbackHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "::1" || host === "127.0.0.1";
}

function isPrivateIp(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (isIP(address) === 6) {
    const value = address.toLowerCase();
    const mapped = value.match(/^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/);
    if (mapped) {
      const ipv4 = mapped[1] || [
        (Number.parseInt(mapped[2], 16) >> 8) & 255,
        Number.parseInt(mapped[2], 16) & 255,
        (Number.parseInt(mapped[3], 16) >> 8) & 255,
        Number.parseInt(mapped[3], 16) & 255
      ].join(".");
      return isPrivateIp(ipv4);
    }
    return (
      value === "::" ||
      value === "::1" ||
      value.startsWith("fc") ||
      value.startsWith("fd") ||
      value.startsWith("fe8") ||
      value.startsWith("fe9") ||
      value.startsWith("fea") ||
      value.startsWith("feb") ||
      value.startsWith("::ffff:127.") ||
      value.startsWith("::ffff:10.") ||
      value.startsWith("::ffff:192.168.")
    );
  }
  return false;
}

async function validateUserEndpoint(rawValue, { allowLoopback = true } = {}) {
  let endpoint;
  try {
    endpoint = new URL(text(rawValue, 2048, "Endpoint URL"));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Endpoint URL is invalid.");
  }
  if (endpoint.username || endpoint.password || endpoint.hash) {
    throw new HttpError(400, "Endpoint URLs cannot contain credentials or fragments.");
  }
  if ([...endpoint.searchParams.keys()].some((key) => /token|key|secret|password|auth|credential/i.test(key))) {
    throw new HttpError(400, "Put endpoint credentials in the token field, not in the URL.");
  }
  const loopback = isLoopbackHost(endpoint.hostname);
  if (loopback && allowLoopback && endpoint.protocol === "http:") return endpoint;
  if (endpoint.protocol !== "https:") {
    throw new HttpError(400, "Use HTTPS for remote endpoints. HTTP is allowed only for localhost.");
  }
  if (loopback || isPrivateIp(endpoint.hostname)) {
    throw new HttpError(400, "Remote endpoints cannot use a private or local network address.");
  }
  let records;
  try {
    records = await lookup(endpoint.hostname, { all: true, verbatim: true });
  } catch {
    throw new HttpError(400, "That endpoint host could not be resolved.");
  }
  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw new HttpError(400, "That endpoint resolves to a private network address.");
  }
  return endpoint;
}

async function boundedMcpFetch(input, init) {
  const endpoint = input instanceof Request ? input.url : String(input);
  await validateUserEndpoint(endpoint);
  const response = await fetch(input, init);
  const maxBytes = 5_000_000;
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw new HttpError(502, "MCP server response is too large.");
  }
  if (!response.body) return response;
  const reader = response.body.getReader();
  let total = 0;
  const body = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          controller.error(new Error("MCP server response is too large."));
          return;
        }
        controller.enqueue(value);
      } catch (error) { controller.error(error); }
    },
    async cancel(reason) { await reader.cancel(reason); }
  });
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

function validStoredEndpoint(rawValue) {
  try {
    const endpoint = new URL(rawValue);
    if (endpoint.username || endpoint.password || endpoint.hash) return null;
    if ([...endpoint.searchParams.keys()].some((key) => /token|key|secret|password|auth|credential/i.test(key))) return null;
    const loopback = isLoopbackHost(endpoint.hostname);
    if (loopback && endpoint.protocol === "http:") return endpoint;
    if (endpoint.protocol !== "https:" || loopback || (isIP(endpoint.hostname) && isPrivateIp(endpoint.hostname))) return null;
    return endpoint;
  } catch {
    return null;
  }
}

async function loadCredentials() {
  let contents;
  try {
    contents = await readFile(CREDENTIALS_FILE, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  let saved;
  try {
    saved = JSON.parse(contents);
  } catch {
    throw new Error(`Could not read ${CREDENTIALS_FILE}: the credentials file is not valid JSON.`);
  }
  if (!saved || saved.version !== 1 || !Array.isArray(saved.providers) || !Array.isArray(saved.mcpServers)) {
    throw new Error(`Could not read ${CREDENTIALS_FILE}: unsupported credentials file format.`);
  }

  for (const item of saved.providers) {
    if (!item || typeof item !== "object" || typeof item.apiKey !== "string" || !item.apiKey.trim() || typeof item.model !== "string" || !item.model.trim()) continue;
    const definition = PROVIDER_DEFS.find((provider) => provider.id === item.id);
    if (definition) {
      providerConnections.set(definition.id, { ...definition, model: item.model.trim(), apiKey: item.apiKey });
      continue;
    }
    if (typeof item.id !== "string" || !/^custom-[0-9a-f-]{36}$/i.test(item.id)) continue;
    const endpoint = validStoredEndpoint(item.baseUrl);
    if (!endpoint) continue;
    const name = typeof item.name === "string" && item.name.trim() ? item.name.trim().slice(0, 100) : "Custom endpoint";
    providerConnections.set(item.id, {
      id: item.id,
      name,
      mark: name.slice(0, 1).toUpperCase(),
      color: "violet",
      protocol: "openai",
      baseUrl: endpoint.toString().replace(/\/+$/, ""),
      model: item.model.trim().slice(0, 200),
      defaultModel: item.model.trim().slice(0, 200),
      summary: "Custom OpenAI-compatible endpoint",
      url: "",
      isCustom: true,
      apiKey: item.apiKey
    });
  }

  for (const item of saved.mcpServers) {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.name !== "string") continue;
    const endpoint = validStoredEndpoint(item.url);
    if (!endpoint || typeof item.token !== "string") continue;
    mcpProfiles.set(item.id, {
      id: item.id,
      name: item.name.trim().slice(0, 100) || endpoint.hostname,
      url: endpoint.toString(),
      token: item.token.slice(0, 8192),
      connectedAt: typeof item.connectedAt === "string" ? item.connectedAt : null
    });
  }

  await mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
  await chmod(DATA_DIR, 0o700);
  await chmod(CREDENTIALS_FILE, 0o600);
}

function normalizeMessages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) {
    throw new HttpError(400, "Send between 1 and 50 conversation messages.");
  }
  return value.map((message) => {
    if (!message || typeof message !== "object") throw new HttpError(400, "A message is invalid.");
    const role = message.role;
    if (!new Set(["system", "user", "assistant", "tool"]).has(role)) {
      throw new HttpError(400, "A message role is invalid.");
    }
    if (role === "assistant" && Array.isArray(message.content)) {
      return { role, content: message.content };
    }
    const content = typeof message.content === "string" ? message.content : "";
    if (content.length > 30_000) throw new HttpError(400, "A message is too long.");
    const clean = { role, content };
    if (role === "tool" && typeof message.tool_call_id === "string") {
      clean.tool_call_id = message.tool_call_id.slice(0, 200);
    }
    return clean;
  });
}

function parseToolArguments(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return { invalidJson: value.slice(0, 5000) };
  }
}

function mcpToolText(result) {
  const content = Array.isArray(result?.content) ? result.content : [];
  const textBlocks = content
    .filter((block) => block && block.type === "text" && typeof block.text === "string")
    .map((block) => block.text);
  const output = textBlocks.length ? textBlocks.join("\n") : JSON.stringify(result);
  return output.slice(0, 20_000);
}

function toolDefinitionsFromRefs(refs) {
  if (!Array.isArray(refs)) return { definitions: [], toolMap: new Map() };
  const definitions = [];
  const toolMap = new Map();
  for (const ref of refs.slice(0, 40)) {
    if (!ref || typeof ref !== "object") continue;
    const connection = mcpConnections.get(String(ref.serverId || ""));
    const requestedName = String(ref.toolName || "");
    const mcpTool = connection?.tools.find((candidate) => candidate.name === requestedName);
    if (!connection || !mcpTool) continue;
    const alias = `relay_action_${definitions.length + 1}`;
    const inputSchema = mcpTool.inputSchema && typeof mcpTool.inputSchema === "object"
      ? mcpTool.inputSchema
      : { type: "object", properties: {} };
    definitions.push({
      type: "function",
      function: {
        name: alias,
        description: `${connection.name}: ${mcpTool.description || mcpTool.name}`.slice(0, 1000),
        parameters: inputSchema
      }
    });
    toolMap.set(alias, {
      serverId: connection.id,
      serverName: connection.name,
      toolName: mcpTool.name,
      description: mcpTool.description || "",
      inputSchema
    });
  }
  return { definitions, toolMap };
}

async function providerRequest(provider, messages, toolDefinitions = []) {
  const baseUrl = provider.baseUrl.replace(/\/+$/, "");
  const isAnthropic = provider.protocol === "anthropic";
  const isResponses = provider.protocol === "responses";
  const endpoint = isAnthropic
    ? `${baseUrl}/messages`
    : isResponses
      ? `${baseUrl}/responses`
      : `${baseUrl}/chat/completions`;
  let requestBody;
  let headers = { "Content-Type": "application/json" };

  if (isAnthropic) {
    const systemParts = messages
      .filter((message) => message.role === "system")
      .map((message) => typeof message.content === "string" ? message.content : "");
    const anthropicMessages = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: message.content }));
    requestBody = {
      model: provider.model,
      max_tokens: 1200,
      messages: anthropicMessages,
      ...(systemParts.length ? { system: systemParts.join("\n\n") } : {}),
      ...(toolDefinitions.length ? {
        tools: toolDefinitions.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          input_schema: tool.function.parameters
        }))
      } : {})
    };
    headers["x-api-key"] = provider.apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (isResponses) {
    requestBody = {
      model: provider.model,
      input: messages,
      max_output_tokens: 1200,
      ...(toolDefinitions.length ? {
        tools: toolDefinitions.map((tool) => ({
          type: "function",
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
          strict: false
        })),
        tool_choice: "auto"
      } : {})
    };
    headers.Authorization = `Bearer ${provider.apiKey}`;
  } else {
    requestBody = {
      model: provider.model,
      messages,
      max_tokens: 1200,
      temperature: 0.6,
      ...(toolDefinitions.length ? { tools: toolDefinitions, tool_choice: "auto" } : {})
    };
    headers.Authorization = `Bearer ${provider.apiKey}`;
    if (provider.id === "openrouter") {
      headers["HTTP-Referer"] = `http://127.0.0.1:${PORT}`;
      headers["X-Title"] = "Relay AI Workspace";
    }
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      redirect: "error",
      signal: AbortSignal.timeout(90_000)
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new HttpError(504, `${provider.name} took too long to respond. Try again.`);
    }
    throw new HttpError(502, `Could not reach ${provider.name}. Check the endpoint and try again.`);
  }

  let payload;
  try {
    payload = JSON.parse(await readLimitedResponseText(response, 2_000_000));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    payload = {};
  }
  if (!response.ok) {
    const providerMessage = payload?.error?.message || payload?.message || `HTTP ${response.status}`;
    throw new HttpError(response.status >= 500 ? 502 : 400, `${provider.name}: ${String(providerMessage).slice(0, 320)}`);
  }

  if (isAnthropic) {
    const blocks = Array.isArray(payload.content) ? payload.content : [];
    return {
      text: blocks.filter((block) => block.type === "text").map((block) => block.text || "").join("\n"),
      toolCalls: blocks.filter((block) => block.type === "tool_use").map((block) => ({
        id: block.id,
        name: block.name,
        arguments: block.input || {}
      })),
      rawMessage: { role: "assistant", content: blocks },
      usage: payload.usage || {}
    };
  }

  if (isResponses) {
    const output = Array.isArray(payload.output) ? payload.output : [];
    return {
      text: typeof payload.output_text === "string"
        ? payload.output_text
        : output.filter((item) => item.type === "message")
          .flatMap((item) => item.content || [])
          .filter((block) => block.type === "output_text")
          .map((block) => block.text || "")
          .join("\n"),
      toolCalls: output.filter((item) => item.type === "function_call").map((call) => ({
        id: call.call_id || call.id,
        name: call.name,
        arguments: parseToolArguments(call.arguments)
      })),
      rawMessage: output,
      usage: payload.usage || {}
    };
  }

  const message = payload?.choices?.[0]?.message;
  if (!message) throw new HttpError(502, `${provider.name} returned an empty response.`);
  return {
    text: typeof message.content === "string"
      ? message.content
      : Array.isArray(message.content)
        ? message.content.filter((block) => block.type === "text").map((block) => block.text || "").join("\n")
        : "",
    toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls.map((call) => ({
      id: call.id,
      name: call.function?.name,
      arguments: parseToolArguments(call.function?.arguments)
    })) : [],
    rawMessage: message,
    usage: payload.usage || {}
  };
}

function stageAgentTools({ provider, messages, toolDefinitions, toolMap, completion, depth }) {
  const actions = completion.toolCalls
    .filter((call) => toolMap.has(call.name))
    .map((call) => {
      const target = toolMap.get(call.name);
      return {
        callId: call.id,
        alias: call.name,
        serverId: target.serverId,
        serverName: target.serverName,
        toolName: target.toolName,
        description: target.description,
        arguments: call.arguments
      };
    });
  if (!actions.length) return null;
  if (depth >= 4) {
    return null;
  }
  for (const [pendingId, run] of pendingAgentRuns) {
    if (Date.now() - run.createdAt > 60 * 60 * 1000) pendingAgentRuns.delete(pendingId);
  }
  const id = randomUUID();
  const pending = {
    id,
    createdAt: Date.now(),
    providerId: provider.id,
    provider,
    messages,
    toolDefinitions,
    toolMap,
    rawMessage: completion.rawMessage,
    actions,
    depth
  };
  pendingAgentRuns.set(id, pending);
  return {
    id,
    providerId: provider.id,
    depth,
    actions: actions.map(({ callId, serverName, toolName, description, arguments: args }) => ({
      callId,
      serverName,
      toolName,
      description,
      arguments: args
    }))
  };
}

function normalizeToolOutput(result) {
  const texts = [];
  const images = [];
  for (const block of Array.isArray(result?.content) ? result.content : []) {
    if (block?.type === "text") {
      if (block.text) texts.push(String(block.text));
    } else if (block?.type === "image") {
      const mimeType = String(block.mimeType || "").toLowerCase();
      const data = typeof block.data === "string" ? block.data : "";
      const supportedMime = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mimeType);
      if (supportedMime && data.length > 0 && data.length <= 1_000_000 && /^[A-Za-z0-9+/]+={0,2}$/.test(data) && images.length < 2) {
        images.push({ mimeType, data });
        texts.push(`[${mimeType} image attached for visual inspection.]`);
      } else {
        texts.push("[Image output omitted: unsupported format or size.] ");
      }
    } else if (block?.type === "resource") {
      texts.push(`[Resource returned: ${String(block.resource?.uri || "resource link").slice(0, 500)}]`);
    } else if (block?.type) {
      texts.push(`[${String(block.type).slice(0, 80)} output omitted.]`);
    }
  }
  const text = (texts.join("\n") || "Tool completed without text output.").slice(0, 20_000);
  return { text, images, isError: Boolean(result?.isError) };
}

function safeMcpTool(tool) {
  const schema = tool.inputSchema && typeof tool.inputSchema === "object" && !Array.isArray(tool.inputSchema)
    ? tool.inputSchema
    : { type: "object", properties: {} };
  let inputSchema = schema;
  try {
    if (schema.type && schema.type !== "object") inputSchema = { type: "object", properties: {} };
    else if (JSON.stringify(schema).length > 40_000) inputSchema = { type: "object", properties: {} };
  } catch {
    inputSchema = { type: "object", properties: {} };
  }
  return {
    name: String(tool.name || "").slice(0, 200),
    description: String(tool.description || "").slice(0, 2000),
    inputSchema
  };
}

async function connectMcp(body, { id = "", timeoutMs = 30_000 } = {}) {
  const endpoint = await validateUserEndpoint(body.url);
  const name = text(body.name || endpoint.hostname, 100, "Server name");
  const token = typeof body.token === "string" ? body.token.trim().slice(0, 8192) : "";
  const transport = new StreamableHTTPClientTransport(endpoint, {
    ...(token ? { authProvider: { token: async () => token } } : {}),
    onInsufficientScope: "throw",
    redirectPolicy: "same-origin",
    fetch: boundedMcpFetch
  });
  const client = new Client({ name: "relay-ai-workspace", version: "0.1.0" });
  let timeoutId;
  try {
    const connectAndDiscover = (async () => {
      await client.connect(transport);
      return client.listTools();
    })();
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        client.close().catch(() => {});
        reject(new HttpError(504, `MCP server ${name} did not respond in time.`));
      }, timeoutMs);
      timeoutId.unref?.();
    });
    const listed = await Promise.race([connectAndDiscover, timeout]);
    const connection = {
      id: id || randomUUID(),
      name,
      url: endpoint.toString(),
      token,
      client,
      connectedAt: new Date().toISOString(),
      connected: true,
      tools: (listed.tools || []).slice(0, 200).map(safeMcpTool).filter((tool) => tool.name)
    };
    mcpConnections.set(connection.id, connection);
    return connection;
  } catch (error) {
    await client.close().catch(() => {});
    if (error instanceof HttpError) throw error;
    if (error?.status === 401 || /unauthorized|authentication|oauth/i.test(error?.message || "")) {
      throw new HttpError(401, "This server needs an authorization flow that is not configured here. A static bearer token is supported in this local starter.");
    }
    throw new HttpError(502, `Could not connect to this MCP server: ${String(error?.message || "Connection failed").slice(0, 240)}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

function safeMcpSummary(connection) {
  return {
    id: connection.id,
    name: connection.name,
    url: connection.url,
    connectedAt: connection.connectedAt,
    authenticated: Boolean(connection.token),
    connected: connection.connected !== false,
    tools: connection.tools
  };
}

function listMcpServers() {
  return [...mcpProfiles.values()].map((profile) => {
    const connected = mcpConnections.get(profile.id);
    return connected
      ? safeMcpSummary(connected)
      : safeMcpSummary({ ...profile, connected: false, tools: [] });
  });
}

async function restoreSavedMcpConnections() {
  restoringMcp = true;
  await Promise.all([...mcpProfiles.values()].map(async (profile) => {
    try {
      await connectMcp(profile, { id: profile.id, timeoutMs: 8_000 });
    } catch (error) {
      console.warn(`Could not reconnect saved MCP server "${profile.name}": ${error.message}`);
    }
  }));
  restoringMcp = false;
}

async function serveStatic(pathname, res) {
  let requested;
  try {
    requested = decodeURIComponent(pathname);
  } catch {
    throw new HttpError(400, "Invalid URL path.");
  }
  if (requested === "/") requested = "/index.html";
  const filePath = resolve(PUBLIC_DIR, `.${requested}`);
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(`${PUBLIC_DIR}${sep}`)) {
    throw new HttpError(403, "Path is not available.");
  }
  let info;
  try {
    info = await stat(filePath);
  } catch {
    throw new HttpError(404, "Page not found.");
  }
  if (!info.isFile()) throw new HttpError(404, "Page not found.");
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webp": "image/webp",
    ".ico": "image/x-icon"
  };
  const data = await readFile(filePath);
  res.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(data);
}

function assertLocalRequest(req) {
  const expectedHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`, `[::1]:${PORT}`]);
  if (!expectedHosts.has(String(req.headers.host || "").toLowerCase())) {
    throw new HttpError(403, "Relay accepts requests from its local address only.");
  }
  if (req.headers.origin) {
    let origin;
    try {
      origin = new URL(req.headers.origin);
    } catch {
      throw new HttpError(403, "Origin is not allowed.");
    }
    if (origin.protocol !== "http:" || !expectedHosts.has(origin.host.toLowerCase())) {
      throw new HttpError(403, "Origin is not allowed.");
    }
  }
}

async function handle(req, res) {
  assertLocalRequest(req);
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname;
  const method = req.method || "GET";

  if (method === "GET" && pathname === "/api/health") {
    return json(res, 200, { ok: true, name: "Relay", mode: "local", restoringMcp });
  }
  if (method === "GET" && pathname === "/api/providers") {
    return json(res, 200, { providers: listProviders() });
  }
  if (method === "GET" && pathname === "/api/mcp") {
    return json(res, 200, { servers: listMcpServers() });
  }
  if (method === "POST" && pathname === "/api/providers") {
    const body = await readJson(req);
    const apiKey = text(body.apiKey, 8192, "API key");
    const model = text(body.model, 200, "Model ID");
    let provider;
    const providerId = String(body.providerId || "");
    if (providerId === "custom" || providerId.startsWith("custom-")) {
      const existing = providerConnections.get(providerId);
      if (providerId !== "custom" && !existing?.isCustom) {
        throw new HttpError(404, "That custom provider is not connected.");
      }
      const name = text(body.name || existing?.name, 100, "Provider name");
      const endpoint = await validateUserEndpoint(body.baseUrl || existing?.baseUrl);
      provider = {
        id: existing?.id || `custom-${randomUUID()}`,
        name,
        mark: name.slice(0, 1).toUpperCase(),
        color: "violet",
        protocol: "openai",
        baseUrl: endpoint.toString().replace(/\/+$/, ""),
        model,
        defaultModel: model,
        summary: "Custom OpenAI-compatible endpoint",
        url: "",
        isCustom: true
      };
    } else {
      const definition = PROVIDER_DEFS.find((item) => item.id === providerId);
      if (!definition) throw new HttpError(400, "Select a supported provider.");
      provider = { ...definition, model, apiKey };
    }
    provider.apiKey = apiKey;
    const previous = providerConnections.get(provider.id);
    providerConnections.set(provider.id, provider);
    try {
      await persistCredentials();
    } catch (error) {
      if (previous) providerConnections.set(provider.id, previous);
      else providerConnections.delete(provider.id);
      throw error;
    }
    return json(res, 201, { provider: safeProviderSummary(provider) });
  }
  if (method === "DELETE" && pathname.startsWith("/api/providers/")) {
    const providerId = decodeURIComponent(pathname.slice("/api/providers/".length));
    const provider = providerConnections.get(providerId);
    if (!provider) throw new HttpError(404, "That provider is not connected.");
    providerConnections.delete(providerId);
    try {
      await persistCredentials();
    } catch (error) {
      providerConnections.set(providerId, provider);
      throw error;
    }
    return json(res, 200, { ok: true });
  }
  if (method === "POST" && pathname === "/api/mcp") {
    const body = await readJson(req);
    const connection = await connectMcp(body);
    const profile = {
      id: connection.id,
      name: connection.name,
      url: connection.url,
      token: connection.token,
      connectedAt: connection.connectedAt
    };
    mcpProfiles.set(profile.id, profile);
    try {
      await persistCredentials();
    } catch (error) {
      mcpProfiles.delete(profile.id);
      mcpConnections.delete(profile.id);
      await connection.client.close().catch(() => {});
      throw error;
    }
    return json(res, 201, { server: safeMcpSummary(connection) });
  }
  const reconnectMatch = pathname.match(/^\/api\/mcp\/([^/]+)\/reconnect$/);
  if (method === "POST" && reconnectMatch) {
    const serverId = decodeURIComponent(reconnectMatch[1]);
    const profile = mcpProfiles.get(serverId);
    if (!profile) throw new HttpError(404, "That saved MCP server is not available.");
    const connected = mcpConnections.get(serverId);
    if (connected) return json(res, 200, { server: safeMcpSummary(connected) });
    const connection = await connectMcp(profile, { id: serverId });
    return json(res, 200, { server: safeMcpSummary(connection) });
  }
  const callMatch = pathname.match(/^\/api\/mcp\/([^/]+)\/call$/);
  if (method === "POST" && callMatch) {
    const serverId = decodeURIComponent(callMatch[1]);
    const connection = mcpConnections.get(serverId);
    if (!connection) throw new HttpError(404, "That MCP server is not connected.");
    const body = await readJson(req);
    if (body.confirmed !== true) throw new HttpError(428, "Confirm this tool action in Relay before it runs.");
    const toolName = text(body.toolName, 200, "Tool name");
    const tool = connection.tools.find((candidate) => candidate.name === toolName);
    if (!tool) throw new HttpError(404, "That tool is not available on this server.");
    const args = body.arguments && typeof body.arguments === "object" && !Array.isArray(body.arguments)
      ? body.arguments
      : {};
    const result = await connection.client.callTool({ name: toolName, arguments: args });
    return json(res, 200, normalizeToolOutput(result));
  }
  if (method === "DELETE" && pathname.startsWith("/api/mcp/")) {
    const serverId = decodeURIComponent(pathname.slice("/api/mcp/".length));
    const connection = mcpConnections.get(serverId);
    const profile = mcpProfiles.get(serverId);
    if (!profile) throw new HttpError(404, "That MCP server is not connected.");
    if (connection) {
      await connection.client.close().catch(() => {});
      mcpConnections.delete(serverId);
    }
    mcpProfiles.delete(serverId);
    try {
      await persistCredentials();
    } catch (error) {
      mcpProfiles.set(serverId, profile);
      throw error;
    }
    return json(res, 200, { ok: true });
  }
  const refreshMatch = pathname.match(/^\/api\/mcp\/([^/]+)\/refresh$/);
  if (method === "POST" && refreshMatch) {
    const serverId = decodeURIComponent(refreshMatch[1]);
    const connection = mcpConnections.get(serverId);
    if (!connection) throw new HttpError(404, "That MCP server is not connected.");
    const listed = await connection.client.listTools();
    connection.tools = (listed.tools || []).slice(0, 200).map(safeMcpTool).filter((tool) => tool.name);
    return json(res, 200, { server: safeMcpSummary(connection) });
  }
  if (method === "POST" && pathname === "/api/chat") {
    const body = await readJson(req);
    const provider = providerConnections.get(String(body.providerId || ""));
    if (!provider) throw new HttpError(409, "Connect an API provider before using live chat.");
    const messages = normalizeMessages(body.messages);
    const { definitions, toolMap } = toolDefinitionsFromRefs(body.toolRefs);
    const completion = await providerRequest(provider, messages, definitions);
    const pending = stageAgentTools({
      provider,
      messages,
      toolDefinitions: definitions,
      toolMap,
      completion,
      depth: 0
    });
    return json(res, 200, {
      answer: completion.text,
      usage: completion.usage,
      pending
    });
  }
  if (method === "POST" && pathname === "/api/agent/approve") {
    const body = await readJson(req);
    const pending = pendingAgentRuns.get(String(body.pendingId || ""));
    if (!pending) throw new HttpError(404, "That approval request has expired. Send the prompt again.");
    if (Date.now() - pending.createdAt > 60 * 60 * 1000) {
      pendingAgentRuns.delete(pending.id);
      throw new HttpError(410, "That approval request expired. Send the prompt again.");
    }
    const results = [];
    for (const action of pending.actions) {
      const connection = mcpConnections.get(action.serverId);
      if (!connection) {
        results.push({ action, text: "The MCP server disconnected before the action ran.", images: [], isError: true });
        continue;
      }
      try {
        const result = await connection.client.callTool({ name: action.toolName, arguments: action.arguments });
        results.push({ action, ...normalizeToolOutput(result) });
      } catch (error) {
        results.push({
          action,
          text: `Tool error: ${String(error?.message || "Tool call failed").slice(0, 500)}`,
          images: [],
          isError: true
        });
      }
    }

    const followup = [...pending.messages];
    if (pending.provider.protocol === "anthropic") {
      followup.push({ role: "assistant", content: pending.rawMessage.content });
      followup.push({
        role: "user",
        content: results.map((item) => ({
          type: "tool_result",
          tool_use_id: item.action.callId,
          content: [
            { type: "text", text: item.text },
            ...item.images.map((image) => ({ type: "image", source: { type: "base64", media_type: image.mimeType, data: image.data } }))
          ],
          ...(item.isError ? { is_error: true } : {})
        }))
      });
    } else if (pending.provider.protocol === "responses") {
      followup.push(...pending.rawMessage);
      const imageFollowups = [];
      for (const item of results) {
        followup.push({
          type: "function_call_output",
          call_id: item.action.callId,
          output: item.text
        });
        if (item.images.length) {
          imageFollowups.push({
            role: "user",
            content: [
              { type: "input_text", text: `Visual output from ${item.action.serverName} / ${item.action.toolName}:` },
              ...item.images.map((image) => ({ type: "input_image", image_url: `data:${image.mimeType};base64,${image.data}` }))
            ]
          });
        }
      }
      followup.push(...imageFollowups);
    } else {
      followup.push({ role: "assistant", content: pending.rawMessage.content ?? null, tool_calls: pending.rawMessage.tool_calls });
      const imageFollowups = [];
      for (const item of results) {
        followup.push({ role: "tool", tool_call_id: item.action.callId, content: item.text });
        if (item.images.length) {
          imageFollowups.push({
            role: "user",
            content: [
              { type: "text", text: `Visual output from ${item.action.serverName} / ${item.action.toolName}:` },
              ...item.images.map((image) => ({ type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.data}` } }))
            ]
          });
        }
      }
      followup.push(...imageFollowups);
    }

    pendingAgentRuns.delete(pending.id);
    const completion = await providerRequest(pending.provider, followup, pending.toolDefinitions);
    const nextPending = stageAgentTools({
      provider: pending.provider,
      messages: followup,
      toolDefinitions: pending.toolDefinitions,
      toolMap: pending.toolMap,
      completion,
      depth: pending.depth + 1
    });
    const hitToolLimit = pending.depth + 1 >= 4 && completion.toolCalls.some((call) => pending.toolMap.has(call.name));
    return json(res, 200, {
      answer: hitToolLimit ? "I reached the four-step tool limit for this turn. Review the current results and continue with a new message." : completion.text,
      usage: completion.usage,
      pending: nextPending,
      providerId: pending.providerId,
      toolResults: results.map((item) => ({
        serverName: item.action.serverName,
        toolName: item.action.toolName,
        isError: item.isError,
        text: item.text.slice(0, 20_000),
        images: item.images
      }))
    });
  }

  if (method === "DELETE" && pathname === "/api/credentials") {
    for (const connection of mcpConnections.values()) await connection.client.close().catch(() => {});
    mcpConnections.clear();
    mcpProfiles.clear();
    providerConnections.clear();
    pendingAgentRuns.clear();
    await credentialsWriteQueue;
    try {
      await unlink(CREDENTIALS_FILE);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    return json(res, 200, { ok: true });
  }

  if (method === "GET") return serveStatic(pathname, res);
  throw new HttpError(404, "Route not found.");
}

const server = createServer(async (req, res) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader("Referrer-Policy", "no-referrer");
  try {
    await handle(req, res);
  } catch (error) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError
      ? error.message
      : "Relay hit an unexpected error. Try again, then check the local server log.";
    json(res, status, { error: message });
  }
});

await loadCredentials();

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Relay is running at http://127.0.0.1:${PORT}`);
  console.log(`Provider keys and MCP tokens are stored in ${CREDENTIALS_FILE} with owner-only file permissions.`);
  void restoreSavedMcpConnections();
});

async function closeConnections() {
  for (const connection of mcpConnections.values()) {
    await connection.client.close().catch(() => {});
  }
  mcpConnections.clear();
  providerConnections.clear();
}

process.on("SIGINT", async () => {
  await closeConnections();
  server.close(() => process.exit(0));
});
process.on("SIGTERM", async () => {
  await closeConnections();
  server.close(() => process.exit(0));
});
