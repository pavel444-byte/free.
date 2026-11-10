const VIEW_ROOT = document.getElementById("view-root");
const MODAL_ROOT = document.getElementById("modal-root");
const TOAST_ROOT = document.getElementById("toast-root");

const STORAGE = {
  chats: "relay.chats.v1",
  agents: "relay.agents.v1",
  activity: "relay.activity.v1",
  plans: "relay.subscription-tracking.v1",
  setup: "relay.integration-setup.v1",
  usage: "relay.usage.v1",
  provider: "relay.selected-provider.v1"
};

const ROUTES = {
  home: "Overview",
  chat: "Conversations",
  agents: "Agents",
  providers: "Model providers",
  integrations: "Apps & integrations",
  mcp: "MCP servers",
  computer: "Browser & computer",
  activity: "Activity",
  usage: "Usage",
  settings: "Settings"
};

const APP_CATALOG = [
  { id: "gmail", name: "Gmail", group: "Work", mark: "G", markClass: "gmail", note: "Email and drafts" },
  { id: "calendar", name: "Calendar", group: "Work", mark: "▦", markClass: "calendar", note: "Events and availability" },
  { id: "drive", name: "Google Drive", group: "Work", mark: "△", markClass: "drive", note: "Docs and files" },
  { id: "github", name: "GitHub", group: "Code", mark: "⌘", markClass: "github", note: "Issues and pull requests" },
  { id: "slack", name: "Slack", group: "Work", mark: "#", markClass: "slack", note: "Messages and canvases" },
  { id: "notion", name: "Notion", group: "Work", mark: "N", markClass: "notion", note: "Pages and databases" },
  { id: "linear", name: "Linear", group: "Code", mark: "L", markClass: "blue", note: "Projects and issues" },
  { id: "figma", name: "Figma", group: "Design", mark: "F", markClass: "coral", note: "Files and comments" },
  { id: "postgres", name: "PostgreSQL", group: "Data", mark: "▤", markClass: "blue", note: "Queries and records" },
  { id: "browser", name: "Browser", group: "Research", mark: "◎", markClass: "mint", note: "Web research" },
  { id: "stripe", name: "Stripe", group: "Data", mark: "S", markClass: "violet", note: "Revenue and customers" },
  { id: "filesystem", name: "Files", group: "Data", mark: "▰", markClass: "yellow", note: "Local workspace" }
];

const SUBSCRIPTIONS = [
  { id: "chatgpt", name: "ChatGPT", mark: "O", markClass: "mint", url: "https://chatgpt.com/", description: "Consumer plan" },
  { id: "claude", name: "Claude", mark: "A", markClass: "coral", url: "https://claude.ai/", description: "Consumer plan" },
  { id: "grok", name: "Grok", mark: "x", markClass: "ink", url: "https://grok.com/", description: "Consumer plan" },
  { id: "kimi", name: "Kimi", mark: "K", markClass: "blue", url: "https://www.kimi.com/", description: "Consumer plan" }
];

const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  chat: '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h8M8 14h5"/>',
  spark: '<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/>',
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.6 8-4.6M12 12.1V21"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  plug: '<path d="M9 7V3m6 4V3M7 7h10v4a5 5 0 0 1-5 5v5m-2-5h4"/><path d="M7 7H5v4a7 7 0 0 0 14 0V7h-2"/>',
  activity: '<path d="M3 12h4l2.3-6 4.2 12 2.4-6H21"/>',
  chart: '<path d="M4 20V4m0 16h17"/><path d="m7 15 4-4 3 2 5-6"/><path d="M16 7h3v3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.1 1.9-1.8 1.8-2-1.1a7 7 0 0 1-1.4.6l-.6 2.2h-2.6l-.6-2.2a7 7 0 0 1-1.4-.6l-2 1.1-1.8-1.8 1.1-2a7 7 0 0 1-.6-1.4l-2.2-.6v-2.6l2.2-.6a7 7 0 0 1 .6-1.4l-1.1-2 1.8-1.8 2 1.1a7 7 0 0 1 1.4-.6l.6-2.2h2.6l.6 2.2a7 7 0 0 1 1.4.6l2-1.1 1.8 1.8-1.1 2a7 7 0 0 1 .6 1.4l2.2.6v2.6l-2.2.6a7 7 0 0 1-.6 1.4Z"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 4.4 1.3c-.9 1.3-2.1 1.6-2.1 3.2M12 17h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="m21 3-7.2 18-3.7-7.1L3 10.2 21 3Z"/><path d="M10.1 13.9 21 3"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shield: '<path d="M12 3 20 6v5c0 5-3.2 8.4-8 10-4.8-1.6-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 11.8-2L20 12M4 12l2.7 5a7 7 0 0 0 11.8-2"/>',
  trash: '<path d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
  external: '<path d="M14 4h6v6m-10 4L20 4"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  terminal: '<path d="m4 5 6 6-6 6m8 1h8"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  eye: '<path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  plusSmall: '<path d="M12 5v14M5 12h14"/>'
};

function icon(name) {
  const body = ICONS[name] || ICONS.spark;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function brandMark() {
  return '<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function readStore(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

const state = {
  route: "home",
  providers: [],
  servers: [],
  agents: readStore(STORAGE.agents, []),
  chats: readStore(STORAGE.chats, []),
  activity: readStore(STORAGE.activity, []),
  trackedPlans: readStore(STORAGE.plans, {}),
  setupSelections: readStore(STORAGE.setup, []),
  usage: readStore(STORAGE.usage, { calls: 0, inputTokens: 0, outputTokens: 0, days: {} }),
  selectedProviderId: readStore(STORAGE.provider, "demo"),
  activeChatId: null,
  useTools: false,
  showToolMenu: false,
  selectedToolRefs: null,
  pendingByChat: {},
  sending: false,
  modal: null,
  modalData: {},
  toolLoading: false,
  toolResult: "",
  toolImages: [],
  toolError: "",
  catalogSearch: "",
  catalogCategory: "All",
  settingsTab: "Privacy",
  serverOnline: false,
  runtimeMode: "local",
  restoringMcp: false,
  restorePolls: 0
};

function persist(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The preview still works without local persistence. */ }
}

function saveChats() {
  state.chats = state.chats.slice(-40);
  persist(STORAGE.chats, state.chats.map((chat) => ({
    ...chat,
    messages: (chat.messages || []).map(({ images, ...message }) => message)
  })));
}
function saveAgents() { persist(STORAGE.agents, state.agents); }
function saveActivity() { state.activity = state.activity.slice(0, 60); persist(STORAGE.activity, state.activity); }
function savePlans() { persist(STORAGE.plans, state.trackedPlans); }
function saveUsage() { persist(STORAGE.usage, state.usage); }

function currentDateLabel() {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function timeLabel(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diff = Math.max(0, Date.now() - date.getTime());
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function addActivity(title, detail, iconName = "activity") {
  state.activity.unshift({ id: crypto.randomUUID(), title, detail, icon: iconName, at: new Date().toISOString() });
  saveActivity();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }
  });
  let body;
  try { body = await response.json(); } catch { body = {}; }
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body;
}

async function refreshConnections({ quiet = true } = {}) {
  try {
    const health = await api("/api/health");
    state.runtimeMode = health.mode === "cloud" ? "cloud" : "local";
    const [providerData, mcpData] = await Promise.all([api("/api/providers"), api("/api/mcp")]);
    state.providers = providerData.providers || [];
    state.servers = mcpData.servers || [];
    state.serverOnline = Boolean(health.ok);
    state.restoringMcp = Boolean(health.restoringMcp);
    const selected = state.providers.find((provider) => provider.id === state.selectedProviderId && provider.connected);
    if (!selected && state.selectedProviderId !== "demo") {
      const connected = state.providers.find((provider) => provider.connected);
      state.selectedProviderId = connected?.id || "demo";
      persist(STORAGE.provider, state.selectedProviderId);
    }
    if (state.restoringMcp && state.restorePolls < 12) {
      state.restorePolls += 1;
      window.setTimeout(async () => { await refreshConnections(); render(); }, 1000);
    } else {
      state.restorePolls = 0;
    }
  } catch {
    state.serverOnline = false;
    if (!quiet) toast("The local Relay server is unavailable. Start it with npm start.", "error");
  }
}

function providerById(id) { return state.providers.find((provider) => provider.id === id); }
function connectedProviders() { return state.providers.filter((provider) => provider.connected); }
function totalToolCount() { return state.servers.reduce((count, server) => count + (server.tools?.length || 0), 0); }

function toast(message, type = "success") {
  const item = document.createElement("div");
  item.className = `toast ${type === "error" ? "error" : ""}`;
  item.innerHTML = `<span class="toast-icon">${type === "error" ? "!" : "✓"}</span><span>${escapeHtml(message)}</span>`;
  TOAST_ROOT.append(item);
  window.setTimeout(() => item.remove(), 3800);
}

function setRoute(route) {
  if (!ROUTES[route]) return;
  state.route = route;
  state.showToolMenu = false;
  document.querySelectorAll(".nav-item[data-route]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.route === route);
  });
  const current = document.getElementById("current-page-name");
  if (current) current.textContent = ROUTES[route];
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
  VIEW_ROOT.focus({ preventScroll: true });
}

function makeStat(label, value, note, iconName) {
  return `<div class="stat-card"><div class="stat-top"><span>${escapeHtml(label)}</span><span class="stat-icon">${icon(iconName)}</span></div><p class="stat-value">${escapeHtml(value)}</p><p class="stat-note">${escapeHtml(note)}</p></div>`;
}

function renderEmpty(title, detail, buttonLabel, action) {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong>${escapeHtml(detail)}${buttonLabel ? `<br><button class="button button-small button-soft" type="button" data-action="${escapeHtml(action)}">${escapeHtml(buttonLabel)}</button>` : ""}</div>`;
}

function renderProviderMini(provider) {
  return `<div class="provider-mini"><span class="provider-mark ${escapeHtml(provider.color || "mint")}">${escapeHtml(provider.mark || provider.name?.slice(0, 1) || "•")}</span><span><strong>${escapeHtml(provider.name)}</strong><small>${provider.connected ? escapeHtml(provider.model || "API connected") : "Add API key"}</small></span></div>`;
}

function renderAgentLine(agent, index) {
  const colors = ["", "peach", "blue", "violet"];
  const label = agent.isExample ? "Example draft" : "Draft";
  return `<div class="agent-row"><span class="agent-icon ${colors[index % colors.length]}">${icon("spark")}</span><div class="agent-info"><strong>${escapeHtml(agent.name)}</strong><small>${escapeHtml(agent.objective || "No goal added yet")}</small></div><span class="agent-state">${label}</span></div>`;
}

function renderHome() {
  const isCloud = state.runtimeMode === "cloud";
  const connected = connectedProviders();
  const providers = state.providers.slice(0, 3);
  const agents = state.agents.slice(0, 3);
  const activity = state.activity.slice(0, 3);
  const usedTokens = (state.usage.inputTokens || 0) + (state.usage.outputTokens || 0);
  const cards = [
    { title: "Choose the right model", copy: "Move between OpenAI, Claude, Grok, Kimi, and compatible providers without rebuilding your workflow.", icon: "cube", tag: "MODEL ROUTING", tone: "mint" },
    { title: "Bring your own tools", copy: "Connect apps through remote MCP servers, then expose only the tools your agent needs.", icon: "plug", tag: "MCP + PLUGINS", tone: "yellow" },
    { title: "Keep control of actions", copy: "The agent pauses before a tool call. Review its target and arguments before anything runs.", icon: "shield", tag: "APPROVALS", tone: "violet" },
    { title: "Keep context together", copy: isCloud ? "Conversations, agent drafts, provider choices, and usage stay together in this workspace." : "Conversations, agent drafts, provider choices, and usage stay in one local workspace.", icon: "chat", tag: "ONE WORKSPACE", tone: "coral" }
  ];
  return `<div class="page home-page">
    <section class="landing-hero">
      <p class="eyebrow">A workspace for the models you choose</p>
      <h1>${escapeHtml(greeting())}. Let every model work together.</h1>
      <p class="landing-lede">Create an agent around your goals, choose the model that fits, and connect the tools you already use. Your provider accounts and MCP servers stay yours.</p>
      <div class="landing-actions"><button class="button button-primary" type="button" data-action="new-agent">Create an agent ${icon("arrow")}</button><button class="button" type="button" data-route="providers">Connect a model</button></div>
      <div class="landing-footnote"><span class="status-dot"></span> ${isCloud ? "Private cloud workspace" : "Local-first preview"} <span class="landing-dot">·</span> ${connected.length} model ${connected.length === 1 ? "provider" : "providers"} connected <span class="landing-dot">·</span> ${totalToolCount()} MCP tools</div>
    </section>

    <section class="landing-showcase" aria-label="Relay conversation preview">
      <div class="showcase-top"><div><span class="showcase-dot"></span><span class="showcase-dot muted"></span><span class="showcase-dot muted"></span></div><span class="showcase-window-title">Research partner <span>·</span> Draft</span><button class="showcase-more" type="button" aria-label="Preview options">${icon("dots")}</button></div>
      <div class="showcase-content"><div class="showcase-avatar">${brandMark()}</div><div class="showcase-message"><p class="showcase-kicker">A conversation that can use your tools</p><h2>Bring these notes together and suggest the next step.</h2><p>Relay can route a message through a connected model, find the right MCP tools, then pause so you can review each action before it runs.</p><div class="showcase-action-row"><span class="provider-mark mint small-mark">${escapeHtml(connected[0]?.mark || "O")}</span><span>${escapeHtml(connected[0]?.name || "Model provider")}</span><span class="showcase-arrow">→</span><span class="showcase-tool">${icon("plug")} 2 tools selected</span><span class="tag yellow">REVIEW FIRST</span></div></div></div>
      <div class="showcase-bottom"><span>${icon("lock")} ${isCloud ? "API keys encrypted in your private vault" : "API keys stored in a local credentials file"}</span><span>Example preview · no model call made</span></div>
    </section>

    <div class="landing-section-head" id="how-it-works"><div><p class="eyebrow">How Relay works</p><h2>One agent. The tools you need.</h2><p>Start with a goal, choose the provider, and add a tool only when it helps.</p></div><button class="muted-link" type="button" data-route="integrations">Explore integrations ${icon("arrow")}</button></div>
    <section class="feature-bento">${cards.map((card, index) => `<article class="feature-tile ${card.tone} feature-tile-${index + 1}"><div class="feature-tile-top"><span class="feature-icon">${icon(card.icon)}</span><span class="tag">${escapeHtml(card.tag)}</span></div><div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.copy)}</p></div>${index === 0 ? `<div class="model-stack"><span class="provider-mark mint">O</span><span class="provider-mark coral">A</span><span class="provider-mark ink">x</span><span class="provider-mark blue">K</span><span class="model-stack-label">Bring your own API keys</span></div>` : index === 1 ? `<div class="mcp-mini-row"><span class="mini-service">${icon("plug")} MCP server</span><span class="mini-service">${icon("terminal")} Custom endpoint</span></div>` : index === 2 ? `<div class="approval-mini"><span>${icon("shield")} Action preview</span><span class="approval-mini-button">Approve</span></div>` : `<div class="context-mini"><span>Conversation</span><span>Agent</span><span>Usage</span></div>`}</article>`).join("")}</section>

    <div class="landing-section-head"><div><p class="eyebrow">Built for real work</p><h2>From a quick question to a longer run.</h2></div><span class="tag green">${state.agents.length} agent ${state.agents.length === 1 ? "draft" : "drafts"}</span></div>
    <section class="usecase-grid">
      <article class="usecase-card usecase-wide"><span class="usecase-index">01 / RESEARCH</span><div><h3>Gather context before the next meeting.</h3><p>Compare sources, summarize the open questions, and build a short brief you can share.</p></div><span class="usecase-mark">${icon("book")}</span></article>
      <article class="usecase-card"><span class="usecase-index">02 / BUILD</span><h3>Turn a request into a plan.</h3><p>Use a coding model with repo tools when you choose.</p><span class="usecase-mark">${icon("cube")}</span></article>
      <article class="usecase-card"><span class="usecase-index">03 / ROUTINE</span><h3>Keep recurring work organized.</h3><p>Draft schedules and agent instructions in one place.</p><span class="usecase-mark">${icon("clock")}</span></article>
    </section>

    <section class="trust-strip"><div class="trust-heading"><p class="eyebrow">On your side, under your control</p><h2>Useful by default. Careful by design.</h2><p>${isCloud ? "Relay never reuses provider website sessions. Credentials are encrypted in your private workspace vault." : "This local preview never reuses provider website sessions. Connect an API credential or an MCP endpoint directly."}</p></div><div class="trust-points"><div><span class="trust-point-icon">${icon("lock")}</span><span><strong>${isCloud ? "Keys encrypted at rest" : "Keys in a local file"}</strong><small>${isCloud ? "Only this account’s Site runtime can decrypt the vault." : "The file has owner-only permissions and is not encrypted."}</small></span></div><div><span class="trust-point-icon">${icon("shield")}</span><span><strong>Tools wait for approval</strong><small>Review the call before it runs.</small></span></div><div><span class="trust-point-icon">${icon("external")}</span><span><strong>Provider billing stays yours</strong><small>Usage goes to your selected API account.</small></span></div></div></section>

    <section class="channel-strip"><div><p class="eyebrow">Where Relay works</p><h2>One workspace, open connections.</h2><p>Chat in the browser, choose any connected model API, and extend your agent with remote MCP servers.</p></div><div class="channel-pills"><span><i>${icon("chat")}</i> Browser workspace</span><span><i>${icon("cube")}</i> Model APIs</span><span><i>${icon("plug")}</i> MCP servers</span></div></section>

    <div class="landing-section-head"><div><p class="eyebrow">Your workspace at a glance</p><h2>Pick up where you left off.</h2><p>Live connections appear here after you add a provider or MCP server.</p></div></div>
    <div class="stats-row">${makeStat("Model providers", String(connected.length), connected.length ? "API access connected" : "No API credentials added", "cube")}${makeStat("MCP tools", String(totalToolCount()), state.servers.length ? `${state.servers.length} server${state.servers.length === 1 ? "" : "s"} connected` : "Connect a remote server", "plug")}${makeStat("Agent drafts", String(state.agents.length), "Ready for a manual run", "spark")}${makeStat("Tokens used", usedTokens.toLocaleString(), "Provider-reported · local tally", "chart")}</div>
    <div class="home-grid">
      <section class="panel"><div class="panel-header"><div><h2>Your agents</h2><p>Draft goals and run them when you’re ready.</p></div><button class="muted-link" type="button" data-route="agents">View all</button></div><div class="panel-body">${agents.length ? `<div class="agent-list">${agents.map(renderAgentLine).join("")}</div>` : renderEmpty("No agents yet", "Build a reusable goal with a model, tool scope, and approval boundary.", "Create an agent", "new-agent")}</div></section>
      <section class="panel"><div class="panel-header"><div><h2>Model providers</h2><p>Use provider APIs or add a compatible endpoint.</p></div><button class="muted-link" type="button" data-route="providers">Manage</button></div><div class="panel-body">${providers.length ? `<div class="provider-mini-grid">${providers.map(renderProviderMini).join("")}</div>` : renderEmpty("No provider catalog loaded", "Start the local server to load provider options.", "Retry", "refresh")}</div></section>
      <section class="panel"><div class="panel-header"><div><h2>Recent activity</h2><p>Local actions and provider requests.</p></div><button class="muted-link" type="button" data-route="activity">View activity</button></div><div class="panel-body">${activity.length ? `<div class="activity-list">${activity.map(renderActivityRow).join("")}</div>` : renderEmpty("Nothing has happened yet", "Start with a demo chat or connect an API provider.", "Start a chat", "open-chat")}</div></section>
      <section class="panel"><div class="panel-header"><div><h2>Bring your tools</h2><p>One MCP server can expose many actions.</p></div><button class="muted-link" type="button" data-route="mcp">Manage MCP</button></div><div class="panel-body"><div class="callout"><span class="callout-icon">${icon("plug")}</span><div><strong>${state.servers.length ? `${state.servers.length} MCP server${state.servers.length === 1 ? "" : "s"} ready` : "Connect a tool server"}</strong><p>${state.servers.length ? `${totalToolCount()} tools discovered. Enable tools in a conversation and approve each proposed action.` : "Use a server endpoint from an app vendor or your organization. Relay discovers its tools for you."}</p></div></div></div></section>
    </div>
  </div>`;
}

function renderActivityRow(entry) {
  return `<div class="activity-row"><span class="activity-mark">${icon(entry.icon || "activity")}</span><div class="activity-copy"><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.detail || "")}</small></div><span class="activity-time">${escapeHtml(timeLabel(entry.at))}</span></div>`;
}

function renderProviderCard(provider) {
  const connected = provider.connected;
  return `<article class="provider-card" data-provider-card="${escapeHtml(provider.id)}">
    <div class="card-title-row"><span class="provider-mark ${escapeHtml(provider.color || "violet")}">${escapeHtml(provider.mark || provider.name.slice(0, 1))}</span><div class="card-title-copy"><h3>${escapeHtml(provider.name)}</h3><p>${escapeHtml(provider.summary || "OpenAI-compatible API")}</p></div><span class="card-status inline-status ${connected ? "connected" : ""}"><i class="status-dot"></i>${connected ? "Connected" : "Not connected"}</span></div>
    <div class="card-divider"></div>
    <div class="card-meta"><span>${connected ? "Model" : "Default model"}</span><span class="text-mono">${escapeHtml(provider.model || provider.defaultModel || "Set a model ID")}</span></div>
    <div class="card-actions">${connected ? `<button class="button button-small button-soft" type="button" data-action="open-provider" data-provider="${escapeHtml(provider.id)}">Update key</button><button class="button button-small button-danger" type="button" data-action="disconnect-provider" data-provider="${escapeHtml(provider.id)}">Disconnect</button>` : `<button class="button button-small button-primary" type="button" data-action="open-provider" data-provider="${escapeHtml(provider.id)}">Connect API key</button>${provider.url ? `<a class="button-link" href="${escapeHtml(provider.url)}" target="_blank" rel="noopener noreferrer">Get a key ${icon("external")}</a>` : ""}`}</div>
  </article>`;
}

function renderProviders() {
  const providers = state.providers;
  const connected = connectedProviders().length;
  const isCloud = state.runtimeMode === "cloud";
  return `<div class="page">
    <div class="page-heading"><div><p class="eyebrow">Models & billing</p><h1>Choose your model providers.</h1><p>Connect API credentials for live requests. Your consumer plans are tracked separately and do not automatically unlock API calls.</p></div><div class="heading-actions"><button class="button" type="button" data-action="add-custom-provider">${icon("plus")} Add compatible endpoint</button></div></div>
    <div class="notice"><strong>Subscription and API access are different.</strong> ChatGPT, Claude, Grok, and Kimi consumer plans do not automatically grant third-party API access. Use the provider’s official API credential or a documented delegation flow. Relay never asks for website passwords or browser cookies.</div>
    <div class="section-heading"><div><h2>Your API connections</h2><p>${connected} connected · ${isCloud ? "keys encrypted in your private vault" : "keys persist in the local credentials file"}</p></div><span class="tag ${state.serverOnline ? "green" : "yellow"}">${state.serverOnline ? (isCloud ? "PRIVATE SITE READY" : "LOCAL SERVER READY") : "SERVER OFFLINE"}</span></div>
    ${providers.length ? `<div class="card-grid">${providers.map(renderProviderCard).join("")}</div>` : renderEmpty("Provider list is unavailable", isCloud ? "The private Site API is unavailable. Reload and try again." : "Start Relay’s local server and try again.", "Retry", "refresh")}
    <div class="section-heading"><div><h2>Track consumer plans</h2><p>Keep a simple list of subscriptions you already pay for.</p></div><button class="muted-link" type="button" data-route="integrations">Open app catalog</button></div>
    <div class="callout"><span class="callout-icon">${icon("book")}</span><div><strong>Plan tracking does not route prompts</strong><p>A plan can be marked here for your own reference. It becomes model access only when the provider offers a supported authorization method for this type of app.</p></div></div>
  </div>`;
}

function renderConnectChoice(app) {
  const picked = state.setupSelections.includes(app.id);
  return `<button class="connect-choice ${picked ? "is-picked" : ""}" type="button" data-action="toggle-app" data-app="${escapeHtml(app.id)}" aria-pressed="${picked}"><span class="choice-mark ${escapeHtml(app.markClass)}">${escapeHtml(app.mark)}</span><span class="choice-info"><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.note)}</small></span><span class="choice-trailing">${picked ? "✓" : ""}</span></button>`;
}

function renderAppChip(app) {
  const term = `${app.name} ${app.group} ${app.note}`.toLowerCase();
  const visible = (!state.catalogSearch || term.includes(state.catalogSearch.toLowerCase())) &&
    (state.catalogCategory === "All" || state.catalogCategory === app.group);
  return `<button class="app-chip ${visible ? "" : "hidden"}" type="button" data-action="suggest-mcp" data-app-name="${escapeHtml(app.name)}" data-search="${escapeHtml(term)}"><span class="choice-mark ${escapeHtml(app.markClass)}">${escapeHtml(app.mark)}</span><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.group)}</small></button>`;
}

function renderSubscriptionRow(plan) {
  const tracked = Boolean(state.trackedPlans[plan.id]);
  return `<div class="subscription-row"><span class="choice-mark ${escapeHtml(plan.markClass)}">${escapeHtml(plan.mark)}</span><span class="subscription-info"><strong>${escapeHtml(plan.name)}</strong><small>${tracked ? "Tracked in this browser" : "Not tracked"} · consumer plan</small></span><button class="track-toggle" type="button" role="switch" aria-checked="${tracked}" aria-label="Track ${escapeHtml(plan.name)} plan" data-action="track-plan" data-provider="${escapeHtml(plan.id)}"></button><a class="button-link" href="${escapeHtml(plan.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(plan.name)}">${icon("external")}</a></div>`;
}

function renderIntegrations() {
  const setupApps = APP_CATALOG.filter((app) => ["gmail", "calendar", "drive", "github"].includes(app.id));
  const categories = ["All", ...new Set(APP_CATALOG.map((app) => app.group))];
  return `<div class="page">
    <div class="page-heading"><div><p class="eyebrow">Apps & integrations</p><h1>Give your agent useful context.</h1><p>Pick the apps you want to connect, then add their supported connector or remote MCP endpoint.</p></div><div class="heading-actions"><button class="button button-primary" type="button" data-action="open-mcp">${icon("plus")} Add MCP server</button></div></div>

    <section class="connect-stage">
      <div class="connect-main"><div class="setup-progress"><span class="progress-dots"><i></i><i></i><i></i></span><span>SET UP YOUR TOOLKIT · STEP 1 OF 3</span></div><h2 class="connect-title">Make Relay more useful.</h2><p class="connect-intro">Choose what your agent may need. Selection is only a setup preference; a live connection still requires a provider-supported connector or an MCP server endpoint.</p><div class="connect-list">${setupApps.map(renderConnectChoice).join("")}</div></div>
      <aside class="connect-aside"><div><div class="connect-mascot">${brandMark()}</div><h2>A shared toolkit, with clear boundaries.</h2><p>One server can expose a large set of tools. Keep the scope small and let Relay pause before each action.</p><div class="permission-list"><div class="permission-row"><span class="permission-check">✓</span><span>Inspect tools before using them</span></div><div class="permission-row"><span class="permission-check">✓</span><span>Review action arguments first</span></div><div class="permission-row"><span class="permission-check">✓</span><span>Disconnect a server at any time</span></div></div></div><div><button class="button button-primary" type="button" data-action="complete-setup">Continue with ${state.setupSelections.length} selected ${state.setupSelections.length === 1 ? "app" : "apps"} ${icon("arrow")}</button><p class="connect-footnote">Selection stays in this browser until you add a real connector.</p></div></aside>
    </section>

    <div class="integration-sections">
      <section class="integration-collection"><h2>Browse connector targets</h2><p>Connect an app with the MCP endpoint published by its vendor or your organization.</p><div class="integration-toolbar"><label class="search-input-wrap">${icon("search")}<input id="integration-search" type="search" placeholder="Find an app" value="${escapeHtml(state.catalogSearch)}" aria-label="Search apps" /></label><div class="segmented-control" role="group" aria-label="Filter apps">${categories.map((category) => `<button class="segment ${state.catalogCategory === category ? "is-active" : ""}" type="button" data-action="catalog-category" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}</div></div><div class="app-chip-grid">${APP_CATALOG.map(renderAppChip).join("")}</div></section>
      <section class="integration-collection"><h2>Track subscriptions</h2><p>Record the consumer plans you use. This does not create API access.</p><div class="subscription-list">${SUBSCRIPTIONS.map(renderSubscriptionRow).join("")}</div><p class="small-note">Never share a website password, cookie, or browser session to bridge a consumer plan.</p></section>
    </div>
  </div>`;
}

function renderMcpServer(server) {
  const tools = server.tools || [];
  return `<article class="server-card"><div class="server-card-header"><span class="provider-mark">${icon("plug")}</span><div><h3>${escapeHtml(server.name)}</h3><p title="${escapeHtml(server.url)}">${escapeHtml(server.url)}</p></div><span class="inline-status ${server.connected ? "connected" : ""}"><i class="status-dot"></i>${server.connected ? "Connected" : "Saved · offline"}</span></div><div class="card-meta mcp-meta"><span>${tools.length} tools discovered</span><span>${server.authenticated ? "Bearer token saved" : "No token"}${server.connectedAt ? ` · ${escapeHtml(timeLabel(server.connectedAt))}` : ""}</span></div><div class="server-tools">${tools.length ? tools.map((tool) => `<button class="tool-chip" type="button" data-action="run-tool" data-server="${escapeHtml(server.id)}" data-tool="${escapeHtml(tool.name)}"><i class="mini-dot"></i>${escapeHtml(tool.name)}</button>`).join("") : `<span class="tag">${server.connected ? "No tools published" : "Tools will appear after reconnecting"}</span>`}</div><div class="tool-actions">${server.connected ? `<button class="button button-small" type="button" data-action="refresh-mcp" data-server="${escapeHtml(server.id)}">${icon("refresh")} Refresh</button>` : `<button class="button button-small button-soft" type="button" data-action="reconnect-mcp" data-server="${escapeHtml(server.id)}">${icon("refresh")} Reconnect</button>`}<button class="button button-small button-danger" type="button" data-action="disconnect-mcp" data-server="${escapeHtml(server.id)}">Remove saved server</button></div></article>`;
}

function renderMcp() {
  const isCloud = state.runtimeMode === "cloud";
  const schemas = state.servers.flatMap((server) => (server.tools || []).map((tool) => ({ serverId: server.id, serverName: server.name, tool })));
  return `<div class="page"><div class="page-heading"><div><p class="eyebrow">Tools & context</p><h1>Connect your MCP servers.</h1><p>MCP gives a model client a standard way to discover and call tools supplied by another service.</p></div><div class="heading-actions"><button class="button button-primary" type="button" data-action="open-mcp">${icon("plus")} Add a server</button></div></div>
    <div class="notice"><strong>Supported in this workspace:</strong> remote Streamable HTTP MCP servers with no authentication or a static bearer token. ${isCloud ? "Server details and tokens are encrypted in the private R2 vault." : "Server details and tokens are saved in Relay’s local credentials file."} Servers that require interactive OAuth setup need an OAuth adapter. Tool calls from chat pause for your approval.</div>
    <div class="section-heading"><div><h2>Connected servers</h2><p>${state.servers.length} server${state.servers.length === 1 ? "" : "s"} · ${totalToolCount()} discovered tools</p></div><span class="tag ${state.serverOnline ? "green" : "yellow"}">${state.serverOnline ? (isCloud ? "PRIVATE SITE READY" : "LOCAL SERVER READY") : "SERVER OFFLINE"}</span></div>
    ${state.servers.length ? `<div class="server-list">${state.servers.map(renderMcpServer).join("")}</div>` : renderEmpty("No MCP servers connected", "Add the HTTPS endpoint from an app or server you trust. Relay will discover its tools.", "Add MCP server", "open-mcp")}
    <div class="section-heading"><div><h2>Tool catalog</h2><p>Tools exposed by connected servers. Select them in a conversation to let a model request an action.</p></div></div>
    ${schemas.length ? `<div class="card-grid">${schemas.map(({ serverId, serverName, tool }) => `<article class="integration-card"><div class="card-title-row"><span class="provider-mark mint">${icon("plug")}</span><div class="card-title-copy"><h3>${escapeHtml(tool.name)}</h3><p>From ${escapeHtml(serverName)}</p></div></div><div class="card-divider"></div><p class="tool-description">${escapeHtml(tool.description || "No description supplied by the server.")}</p><button class="button button-small" type="button" data-action="run-tool" data-server="${escapeHtml(serverId)}" data-tool="${escapeHtml(tool.name)}">Inspect & run</button></article>`).join("")}</div>` : `<div class="callout"><span class="callout-icon">${icon("book")}</span><div><strong>Tools appear after discovery</strong><p>When you connect a server, Relay reads the tools it publishes and makes them available for a conversation or a manual run.</p></div></div>`}
  </div>`;
}

function isComputerTool(server, tool) {
  return /browser|computer|desktop|screen|screenshot|navigate|click|type|session|remote/i.test(`${server.name} ${server.url} ${tool.name} ${tool.description || ""}`);
}

function availableComputerTools() {
  return state.servers.flatMap((server) => (server.connected ? (server.tools || []).filter((tool) => isComputerTool(server, tool)).map((tool) => ({ server, tool })) : []));
}

function renderComputer() {
  const tools = availableComputerTools();
  const browserUseConnected = state.servers.some((server) => /browser-use\.com/i.test(server.url));
  const providers = connectedProviders();
  return `<div class="page"><div class="page-heading"><div><p class="eyebrow">Remote workspaces</p><h1>Browser & computer.</h1><p>Run browser tasks in a hosted session or connect your own cloud computer through an MCP server you control.</p></div><div class="heading-actions"><button class="button" type="button" data-action="connect-computer">${icon("plus")} Connect my computer</button></div></div>
    <section class="computer-hero"><div class="computer-hero-copy"><span class="tag ${tools.length ? "green" : "yellow"}">${tools.length ? "COMPUTER TOOLS READY" : "REMOTE RUNTIME"}</span><h2>A browser the agent can use.</h2><p>Relay can ask a connected remote browser or desktop to navigate, inspect pages, and take actions. You approve every requested tool call before it runs.</p><div class="computer-hero-actions"><button class="button button-primary" type="button" data-action="connect-browser-use">${icon("eye")} ${browserUseConnected ? "Reconnect Browser Use" : "Connect Browser Use"}</button><a class="muted-link" href="https://browser-use.com/mcp" target="_blank" rel="noopener noreferrer">Browser Use setup guide ${icon("external")}</a></div></div><div class="computer-window" aria-hidden="true"><div class="computer-window-bar"><i></i><i></i><i></i><span>remote session</span></div><div class="computer-window-screen"><span class="computer-cursor">↖</span><div class="computer-window-card"><span class="mini-dot"></span><strong>Task preview</strong><small>Review page · collect sources</small></div><div class="computer-window-status">${tools.length ? `${tools.length} browser and computer tools ready` : "Connect a browser or desktop MCP"}</div></div></div></section>
    <div class="computer-layout"><section class="panel computer-task-panel"><div class="panel-header"><div><h2>Start a computer task</h2><p>Choose a connected model and describe the goal.</p></div><span class="tag">${tools.length} TOOLS</span></div><div class="panel-body"><form class="form-grid" id="computer-form"><div class="form-row"><label for="computer-provider">Model provider</label><select id="computer-provider" name="providerId" ${providers.length ? "" : "disabled"}>${providers.length ? providers.map((provider) => `<option value="${escapeHtml(provider.id)}" ${provider.id === state.selectedProviderId ? "selected" : ""}>${escapeHtml(provider.name)} · ${escapeHtml(provider.model)}</option>`).join("") : "<option>Connect an API provider first</option>"}</select></div><div class="form-row"><label for="computer-prompt">Task</label><textarea id="computer-prompt" name="prompt" maxlength="8000" placeholder="For example: open the product page, compare the listed plans, and summarize the differences. Nothing will be submitted without your approval." required></textarea></div><button class="button button-primary" type="submit" ${tools.length && providers.length && state.serverOnline ? "" : "disabled"}>${icon("arrow")} Start task</button>${!providers.length ? `<p class="form-help">Connect an API provider to plan and summarize the task.</p>` : !tools.length ? `<p class="form-help">Connect Browser Use or another remote browser or desktop MCP server to enable tasks.</p>` : !state.serverOnline ? `<p class="form-help">The Relay server is offline. Start it before sending a task.</p>` : `<p class="form-help">Relay will use only the browser and computer tools listed below. Every requested action pauses for your approval.</p>`}</form></div></section>
    <section class="panel"><div class="panel-header"><div><h2>Connected runtimes</h2><p>Hosted browser sessions and your own cloud computer endpoints.</p></div><button class="muted-link" type="button" data-action="connect-computer">Add endpoint</button></div><div class="panel-body">${state.servers.filter((server) => /browser|computer|desktop/i.test(`${server.name} ${server.url}`)).length ? state.servers.filter((server) => /browser|computer|desktop/i.test(`${server.name} ${server.url}`)).map((server) => `<div class="computer-runtime-row"><span class="provider-mark mint">${icon("eye")}</span><div><strong>${escapeHtml(server.name)}</strong><small>${escapeHtml(server.url)}</small></div><span class="inline-status ${server.connected ? "connected" : ""}"><i class="status-dot"></i>${server.connected ? "Ready" : "Offline"}</span></div>`).join("") : `<div class="callout"><span class="callout-icon">${icon("lock")}</span><div><strong>No remote computer connected</strong><p>Use Browser Use’s hosted MCP or add an HTTPS MCP endpoint for your own remote desktop.</p></div></div>`}</div></section></div>
    <div class="section-heading"><div><h2>Available actions</h2><p>Only matching browser and computer tools are included in tasks from this page.</p></div></div>${tools.length ? `<div class="card-grid">${tools.map(({ server, tool }) => `<article class="integration-card"><div class="card-title-row"><span class="provider-mark mint">${icon("eye")}</span><div class="card-title-copy"><h3>${escapeHtml(tool.name)}</h3><p>From ${escapeHtml(server.name)}</p></div></div><p class="tool-description">${escapeHtml(tool.description || "Remote browser or computer action.")}</p><button class="button button-small" type="button" data-action="run-tool" data-server="${escapeHtml(server.id)}" data-tool="${escapeHtml(tool.name)}">Inspect tool</button></article>`).join("")}</div>` : `<div class="callout"><span class="callout-icon">${icon("book")}</span><div><strong>Computer actions appear here</strong><p>Connect a remote browser or desktop MCP server. Relay stores its bearer token in the credentials file locally, or in its encrypted private vault when hosted.</p></div></div>`}
  </div>`;
}

function ensureChat() {
  let chat = state.chats.find((item) => item.id === state.activeChatId);
  if (!chat) {
    chat = { id: crypto.randomUUID(), title: "New conversation", messages: [], createdAt: new Date().toISOString() };
    state.chats.unshift(chat);
    state.activeChatId = chat.id;
    saveChats();
  }
  return chat;
}

function activeChat() { return state.chats.find((item) => item.id === state.activeChatId) || null; }

function messageTextHtml(value) {
  return String(value ?? "").split(/(https?:\/\/[^\s<>]+)/gi).map((part) => {
    if (!/^https?:\/\//i.test(part)) return escapeHtml(part);
    let url = part;
    let trailing = "";
    while (/[).,!?:;]$/.test(url)) { trailing = url.slice(-1) + trailing; url = url.slice(0, -1); }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return escapeHtml(part);
      return `<a href="${escapeHtml(parsed.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>${escapeHtml(trailing)}`;
    } catch { return escapeHtml(part); }
  }).join("");
}

function renderChatMessage(message) {
  const role = message.role === "user" ? "user" : message.role === "tool" ? "tool" : "assistant";
  const avatar = role === "user" ? "L" : role === "tool" ? icon("plug") : brandMark();
  const label = role === "user" ? "You" : role === "tool" ? "Approved tool result" : "Relay";
  const images = (Array.isArray(message.images) ? message.images : []).filter((image) => ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(image.mimeType) && typeof image.data === "string").map((image) => `<img class="tool-output-image" src="data:${escapeHtml(image.mimeType)};base64,${escapeHtml(image.data)}" alt="Image returned by an approved computer or MCP tool" loading="lazy" />`).join("");
  return `<div class="message-row ${role}"><span class="message-avatar">${avatar}</span><div><p class="message-meta">${label}</p><div class="message-bubble">${messageTextHtml(message.content)}</div>${images ? `<div class="tool-output-images">${images}</div>` : ""}</div></div>`;
}

function renderPending(pending) {
  if (!pending?.actions?.length) return "";
  return `<div class="pending-card"><h3>Review before these tools run</h3><p>The model requested these actions. Nothing has run yet. Approving runs the listed calls on their MCP servers.</p>${pending.actions.map((action) => `<div class="pending-action"><span class="pending-action-icon">${icon("plug")}</span><div><strong>${escapeHtml(action.serverName)} / ${escapeHtml(action.toolName)}</strong><small>${escapeHtml(JSON.stringify(action.arguments, null, 2))}</small></div></div>`).join("")}<button class="button button-small button-primary" type="button" data-action="approve-tools" data-pending="${escapeHtml(pending.id)}">Approve and run ${pending.actions.length} ${pending.actions.length === 1 ? "action" : "actions"}</button></div>`;
}

function toolRefs() {
  const refs = [];
  for (const server of state.servers) {
    for (const tool of server.tools || []) {
      const key = `${server.id}:${tool.name}`;
      if (state.selectedToolRefs === null || state.selectedToolRefs.has(key)) refs.push({ serverId: server.id, toolName: tool.name });
    }
  }
  return refs;
}

function renderToolMenu() {
  if (!state.showToolMenu) return "";
  const allTools = state.servers.flatMap((server) => (server.tools || []).map((tool) => ({ server, tool })));
  if (!allTools.length) return `<div class="tool-menu"><div class="tool-menu-title">Connected MCP tools</div><div class="tool-menu-empty">No MCP tools are available yet. Add a server first.</div><button class="button button-small" type="button" data-action="open-mcp">Add MCP server</button></div>`;
  return `<div class="tool-menu"><div class="tool-menu-title">Choose tools for this conversation</div>${allTools.map(({ server, tool }) => {
    const key = `${server.id}:${tool.name}`;
    const checked = state.selectedToolRefs === null || state.selectedToolRefs.has(key);
    return `<label class="tool-check-row"><input type="checkbox" data-tool-ref="${escapeHtml(key)}" ${checked ? "checked" : ""} /><span><strong>${escapeHtml(tool.name)}</strong><small>${escapeHtml(server.name)} · ${escapeHtml(tool.description || "MCP tool")}</small></span></label>`;
  }).join("")}<div class="tool-menu-actions"><button class="button button-small button-soft" type="button" data-action="all-tools">Use all tools</button><button class="button button-small" type="button" data-action="close-tool-menu">Done</button></div></div>`;
}

function renderChat() {
  const chat = activeChat();
  const connected = connectedProviders();
  const currentProvider = providerById(state.selectedProviderId);
  const selectedConnected = currentProvider?.connected ? currentProvider : null;
  const pending = chat ? state.pendingByChat[chat.id] : null;
  const messages = chat?.messages || [];
  const currentTitle = chat?.title || "New conversation";
  return `<div class="page chat-page"><div class="chat-layout">
    <aside class="chat-history"><div class="chat-history-head"><h2>Recent</h2><button class="button button-small" type="button" data-action="new-chat">${icon("plus")} New</button></div>${state.chats.slice(0, 16).map((item) => `<button class="history-item ${item.id === state.activeChatId ? "is-active" : ""}" type="button" data-action="select-chat" data-chat="${escapeHtml(item.id)}">${escapeHtml(item.title || "New conversation")}<small>${escapeHtml(timeLabel(item.createdAt))}</small></button>`).join("")}</aside>
    <section class="chat-room"><div class="chat-room-top"><div class="chat-room-title"><span class="agent-icon">${icon("chat")}</span><strong>${escapeHtml(currentTitle)}</strong><span class="tag">${selectedConnected ? "LIVE API" : "DEMO MODE"}</span></div><label class="sr-only" for="chat-provider-select">Choose a model provider</label><select id="chat-provider-select" aria-label="Choose a model provider"><option value="demo" ${selectedConnected ? "" : "selected"}>Demo response · no model call</option>${state.providers.map((provider) => `<option value="${escapeHtml(provider.id)}" ${selectedConnected?.id === provider.id ? "selected" : ""}>${escapeHtml(provider.name)} · ${provider.connected ? escapeHtml(provider.model) : "add API key"}</option>`).join("")}</select></div>
      <div class="chat-messages" id="chat-messages">${messages.length ? messages.map(renderChatMessage).join("") : `<div class="welcome-message"><span class="welcome-bloom">${brandMark()}</span><h2>What would you like to work on?</h2><p>Pick a connected model, or try a local demo response. Connect an API key when you’re ready to send a prompt to a provider.</p><div class="welcome-suggestions"><button class="suggestion-chip" type="button" data-action="chat-suggestion" data-prompt="Compare the strongest options for my next project and explain the tradeoffs.">Compare models</button><button class="suggestion-chip" type="button" data-action="chat-suggestion" data-prompt="Help me turn a messy idea into a clear plan.">Make a plan</button><button class="suggestion-chip" type="button" data-action="chat-suggestion" data-prompt="Review the connected MCP tools and suggest a safe first task.">Review my tools</button></div></div>`}${pending ? renderPending(pending) : ""}${state.sending ? `<div class="message-row"><span class="message-avatar">${brandMark()}</span><div class="loading-line" style="width:160px;margin-top:8px"></div></div>` : ""}</div>
      <div class="chat-compose-wrap"><form class="composer-card" id="chat-form"><label class="composer-label" for="chat-prompt"><span>Message Relay</span><span>${state.useTools ? `${toolRefs().length} tools available` : "Private until you send"}</span></label><textarea id="chat-prompt" name="prompt" placeholder="Ask a question, compare models, or start a task…" required ${state.sending ? "disabled" : ""}></textarea><div class="composer-bottom"><div class="composer-tools"><div class="chat-tools-wrap"><button class="tool-toggle ${state.useTools ? "is-on" : ""}" type="button" data-action="toggle-chat-tools" aria-expanded="${state.showToolMenu}">${icon("plug")} ${state.useTools ? "Tools on" : "Add tools"}</button>${renderToolMenu()}</div><button class="pill-button" type="button" data-route="providers">${icon("cube")} ${selectedConnected ? escapeHtml(selectedConnected.name) : "Choose model"}</button></div><button class="send-button" type="submit" aria-label="Send message" ${state.sending ? "disabled" : ""}>${icon("send")}</button></div></form><p class="chat-mode-note">${selectedConnected ? `Prompts are sent to ${escapeHtml(selectedConnected.name)} using ${escapeHtml(selectedConnected.model)}. Provider billing applies.` : "Demo mode does not send your message to an AI model."}${state.useTools ? " Tool calls pause until you approve them." : ""}</p></div>
    </section>
  </div></div>`;
}

function renderAgentCard(agent) {
  const model = providerById(agent.providerId);
  const tools = agent.useTools ? "Tools enabled when selected" : "No tools selected";
  return `<article class="agent-card"><div class="card-title-row"><span class="agent-icon ${agent.tint === "peach" ? "peach" : agent.tint === "blue" ? "blue" : ""}">${icon("spark")}</span><div class="card-title-copy"><h3>${escapeHtml(agent.name)}</h3><p>${agent.isExample ? "Example draft" : "On-demand agent draft"}</p></div><span class="tag">DRAFT</span></div><p>${escapeHtml(agent.objective || "Set a goal for this agent.")}</p><div class="agent-card-footer"><small>${escapeHtml(model?.connected ? model.name : "Choose a provider when you run")}${agent.schedule && agent.schedule !== "On demand" ? ` · ${escapeHtml(agent.schedule)} draft` : " · On demand"}<br>${escapeHtml(tools)}</small><div class="tool-actions"><button class="button button-small button-soft" type="button" data-action="run-agent" data-agent="${escapeHtml(agent.id)}">Run now</button><button class="button button-small" type="button" data-action="edit-agent" data-agent="${escapeHtml(agent.id)}" aria-label="Edit ${escapeHtml(agent.name)}">${icon("dots")}</button></div></div></article>`;
}

function renderAgents() {
  const isCloud = state.runtimeMode === "cloud";
  return `<div class="page"><div class="page-heading"><div><p class="eyebrow">Your goals</p><h1>Agents with a clear job.</h1><p>Save a reusable goal, choose the model, and set the tools it may request. Runs are started manually in this workspace.</p></div><div class="heading-actions"><button class="button button-primary" type="button" data-action="new-agent">${icon("plus")} Create an agent</button></div></div>
    <div class="notice"><strong>${isCloud ? "Manual runs:" : "Local preview:"}</strong> agent drafts and schedules are saved in this browser. Background schedules are not active; use “Run now” to start a live or demo conversation. Connect a remote browser or computer in the Browser & computer page when a task needs one.</div>
    <div class="section-heading"><div><h2>Agent drafts</h2><p>${state.agents.length} saved · schedules stay inactive in this preview</p></div></div>
    ${state.agents.length ? `<div class="agent-grid">${state.agents.map(renderAgentCard).join("")}</div>` : renderEmpty("Start with one job", "Give an agent a specific outcome, a provider, and a narrow tool scope.", "Create an agent", "new-agent")}
    <div class="section-heading"><div><h2>Useful boundaries</h2><p>Keep agents easy to understand and safe to review.</p></div></div>
    <section class="trust-cards"><article class="trust-card"><span class="trust-point-icon">${icon("book")}</span><h3>One job at a time</h3><p>Keep the description focused so the model can decide when it needs a tool.</p></article><article class="trust-card"><span class="trust-point-icon">${icon("plug")}</span><h3>Small tool scope</h3><p>Only include MCP tools relevant to this run. You can change them in the chat.</p></article><article class="trust-card"><span class="trust-point-icon">${icon("shield")}</span><h3>Review before action</h3><p>Relay pauses when the model requests an MCP action and shows the arguments.</p></article></section>
  </div>`;
}

function renderUsage() {
  const total = (state.usage.inputTokens || 0) + (state.usage.outputTokens || 0);
  const days = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    days.push({ key, label: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date), value: state.usage.days?.[key] || 0 });
  }
  const maximum = Math.max(1, ...days.map((day) => day.value));
  const providers = Object.entries(state.usage.byProvider || {});
  return `<div class="page"><div class="page-heading"><div><p class="eyebrow">Usage & billing</p><h1>See what Relay sent.</h1><p>This browser tally uses token counts returned by providers when available. Provider billing remains in each provider account.</p></div><div class="heading-actions"><button class="button" type="button" data-route="providers">Manage providers</button></div></div>
    <div class="usage-layout"><section class="panel"><div class="panel-header"><div><h2>Token activity</h2><p>Provider-reported usage across live calls</p></div><span class="tag">LAST 7 DAYS</span></div><div class="panel-body"><div class="usage-chart">${days.map((day) => `<div class="bar-group"><div class="bar-stack"><i style="height:${Math.max(day.value ? 5 : 2, (day.value / maximum) * 100)}%"></i></div><small>${escapeHtml(day.label)}</small></div>`).join("")}</div></div></section>
    <section class="panel"><div class="panel-header"><div><h2>Usage summary</h2><p>Stored only in this browser</p></div></div><div class="panel-body"><p class="usage-total">${total.toLocaleString()}</p><p class="usage-total-note">Tokens recorded · ${Number(state.usage.calls || 0)} live requests</p><div class="usage-provider-row"><span>Input tokens</span><strong>${Number(state.usage.inputTokens || 0).toLocaleString()}</strong></div><div class="usage-provider-row"><span>Output tokens</span><strong>${Number(state.usage.outputTokens || 0).toLocaleString()}</strong></div><div class="usage-provider-row"><span>Estimated spend</span><strong>Not calculated</strong></div></div></section></div>
    <div class="section-heading"><div><h2>Usage by provider</h2><p>Provider usage data is not fetched from vendor billing consoles.</p></div></div>
    ${providers.length ? `<section class="panel"><div class="panel-body">${providers.map(([id, info]) => `<div class="usage-provider-row"><span>${escapeHtml(providerById(id)?.name || id)}</span><strong>${Number(info.tokens || 0).toLocaleString()} tokens</strong><small>${Number(info.calls || 0)} calls</small></div>`).join("")}</div></section>` : renderEmpty("No live usage yet", "Demo replies do not call a provider or create API charges.", "Connect an API provider", "go-providers")}
  </div>`;
}

function renderActivity() {
  return `<div class="page"><div class="page-heading"><div><p class="eyebrow">Workspace history</p><h1>Activity, in one place.</h1><p>Relay records local setup changes and the live provider requests you start.</p></div><div class="heading-actions"><button class="button" type="button" data-action="clear-activity">${icon("trash")} Clear activity</button></div></div>
    <div class="activity-feed">${state.activity.length ? `<p class="activity-date">Recent</p>${state.activity.map(renderActivityRow).join("")}` : renderEmpty("No recent activity", "Connect a provider, add an MCP server, or start a demo conversation.", "Open overview", "go-home")}</div>
  </div>`;
}

function renderSettings() {
  const tabs = ["Privacy", "Workspace", "Data"].map((tab) => `<button class="settings-tab ${state.settingsTab === tab ? "is-active" : ""}" type="button" data-action="settings-tab" data-tab="${tab}">${tab}</button>`).join("");
  const isCloud = state.runtimeMode === "cloud";
  let content = "";
  if (state.settingsTab === "Privacy") {
    const vault = isCloud
      ? "Encrypted with AES-GCM in your private Site vault. The encryption key is held by the Site runtime and never returned to the browser."
      : "Saved in data/credentials.json, a Git-ignored file with owner-only permissions. The local server loads keys into memory while running. The file is not encrypted.";
    const vaultLabel = isCloud ? "PRIVATE VAULT" : "LOCAL FILE";
    content = `<h2>Privacy and credentials</h2><p>Review what stays in this workspace and what leaves it when you connect an account.</p><div class="setting-item"><span><strong>Provider API keys</strong><small>${vault}</small></span><span class="tag yellow">${vaultLabel}</span></div><div class="setting-item"><span><strong>MCP bearer tokens</strong><small>${isCloud ? "Encrypted in the same private vault. Remote tool calls go to the endpoint you configured." : "Saved in the same local file. Relay attempts to reconnect saved MCP servers when it starts. Remote tool calls go to the endpoint you configured."}</small></span><span class="tag yellow">${vaultLabel}</span></div><div class="setting-item"><span><strong>Chat history and agent drafts</strong><small>Saved in this browser’s local storage. Prompts are sent to a provider only when you select one and press Send.</small></span><span class="tag">THIS BROWSER</span></div><div class="setting-item"><span><strong>Provider subscriptions</strong><small>Relay does not copy or reuse website sign-in sessions. Use documented API keys or an officially supported delegated authorization flow.</small></span><span class="tag yellow">SEPARATE ACCESS</span></div>`;
  } else if (state.settingsTab === "Workspace") {
    content = `<h2>Workspace preferences</h2><p>${isCloud ? "Private cloud workspace settings." : "Basic settings for this single-user local preview."}</p><div class="setting-item"><span><strong>Workspace name</strong><small>Personal workspace</small></span><span class="tag">${isCloud ? "PRIVATE" : "LOCAL"}</span></div><div class="setting-item"><span><strong>Server status</strong><small>${state.serverOnline ? (isCloud ? "Relay’s private Site API is responding." : "Relay’s local API is responding.") : (isCloud ? "Relay’s private Site API is not responding." : "Relay’s local API is not responding.")}</small></span><span class="tag ${state.serverOnline ? "green" : "yellow"}">${state.serverOnline ? "ONLINE" : "OFFLINE"}</span></div><div class="setting-item"><span><strong>Runtime</strong><small>${isCloud ? "Private Sites Worker · credentials are encrypted in object storage." : "127.0.0.1 · port 4173 by default."}</small></span><span class="tag">${isCloud ? "CLOUD" : "LOCAL"}</span></div><div class="setting-item"><span><strong>Credentials</strong><small>${isCloud ? "Delete the encrypted provider keys and MCP tokens stored in your private workspace vault." : "Saved at data/credentials.json with owner-only file permissions. Delete it here or remove it manually."}</small></span><button class="button button-small button-danger" type="button" data-action="clear-credentials">Clear credentials</button></div>`;
  } else {
    content = `<h2>Browser data</h2><p>Conversations, agent drafts, subscription tracking, and the local usage tally are stored in this browser.</p><div class="setting-item"><span><strong>Saved conversations</strong><small>${state.chats.length} conversation${state.chats.length === 1 ? "" : "s"} in this browser.</small></span></div><div class="setting-item"><span><strong>Agent drafts</strong><small>${state.agents.length} draft${state.agents.length === 1 ? "" : "s"} in this browser.</small></span></div><div class="setting-item"><span><strong>Reset local browser data</strong><small>This removes conversations, agent drafts, tracked plans, local activity, and token counts.</small></span><button class="button button-small button-danger" type="button" data-action="clear-local-data">Clear local data</button></div>`;
  }
  return `<div class="page"><div class="page-heading"><div><p class="eyebrow">Your workspace</p><h1>Settings.</h1><p>Understand storage, keys, model providers, and connection behavior.</p></div></div><div class="settings-layout"><nav class="settings-tabs" aria-label="Settings sections">${tabs}</nav><section class="settings-content">${content}</section></div></div>`;
}

function render() {
  const routes = {
    home: renderHome,
    chat: renderChat,
    agents: renderAgents,
    providers: renderProviders,
    integrations: renderIntegrations,
    mcp: renderMcp,
    computer: renderComputer,
    activity: renderActivity,
    usage: renderUsage,
    settings: renderSettings
  };
  VIEW_ROOT.innerHTML = (routes[state.route] || renderHome)();
  document.querySelectorAll(".nav-item[data-route]").forEach((item) => item.classList.toggle("is-active", item.dataset.route === state.route));
  document.getElementById("current-page-name").textContent = ROUTES[state.route] || "Overview";
  document.getElementById("agent-count").textContent = String(state.agents.length);
  document.getElementById("provider-count").textContent = String(connectedProviders().length);
  document.getElementById("mcp-count").textContent = String(state.servers.length);
  const modeHeading = document.querySelector(".local-status strong");
  const modeDetail = document.querySelector(".local-status small");
  const workspaceDetail = document.querySelector(".workspace-copy small");
  const profileName = document.querySelector(".profile-copy strong");
  if (modeHeading) modeHeading.textContent = state.runtimeMode === "cloud" ? "Private cloud workspace" : (state.serverOnline ? "Running locally" : "Local server offline");
  if (modeDetail) modeDetail.textContent = state.runtimeMode === "cloud" ? "Credentials encrypted in your workspace" : "Credentials saved on this device";
  if (workspaceDetail) workspaceDetail.textContent = state.runtimeMode === "cloud" ? "Private cloud workspace" : "Local preview";
  if (profileName) profileName.textContent = state.runtimeMode === "cloud" ? "Private workspace" : "Local user";
  renderModal();
}

function modalShell(title, description, body, options = {}) {
  return `<div class="modal-backdrop" data-action="close-modal"><section class="modal ${options.wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><div><h2 id="modal-title">${title}</h2><p>${description}</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body">${body}</div></section></div>`;
}

function renderToolImages(images) {
  return (Array.isArray(images) ? images : []).filter((image) => ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(image.mimeType) && typeof image.data === "string").map((image) => `<img class="tool-output-image" src="data:${escapeHtml(image.mimeType)};base64,${escapeHtml(image.data)}" alt="Image returned by the approved tool" loading="lazy" />`).join("");
}

function renderModal() {
  if (!state.modal) { MODAL_ROOT.innerHTML = ""; return; }
  if (state.modal === "provider") {
    const provider = state.modalData.provider;
    const custom = provider?.id === "custom" || Boolean(provider?.isCustom);
    const credentialNote = state.runtimeMode === "cloud" ? "Relay encrypts this credential in your private workspace vault and sends it only to the provider API you select." : "Relay saves this credential in a local file with owner-only permissions, then loads it into the local server while running.";
    const body = `<form class="form-grid" id="provider-form"><input type="hidden" name="providerId" value="${escapeHtml(provider?.id || "")}" />${custom ? `<div class="modal-note"><strong>Custom endpoint.</strong> ${credentialNote}</div>` : `<div class="modal-note"><strong>API access only.</strong> A consumer chat plan is separate. ${credentialNote}</div>`}${custom ? `<div class="form-row"><label for="custom-name">Provider name</label><input id="custom-name" name="name" value="${escapeHtml(provider?.name === "Custom endpoint" ? "" : (provider?.name || ""))}" placeholder="My model server" required maxlength="100" /></div><div class="form-row"><label for="custom-base">Base URL</label><input id="custom-base" name="baseUrl" type="url" value="${escapeHtml(provider?.baseUrl || "")}" placeholder="https://api.example.com/v1" required /><p class="form-help">OpenAI-compatible chat/completions endpoint. Remote endpoints must use HTTPS.</p></div>` : `<div class="form-row"><label for="provider-name">Provider</label><input id="provider-name" value="${escapeHtml(provider?.name || "")}" disabled /></div>`}<div class="form-row"><label for="provider-model">Model ID</label><input id="provider-model" name="model" value="${escapeHtml(custom ? (provider?.model || "") : (provider?.model || provider?.defaultModel || ""))}" placeholder="Enter the model ID for your account" required maxlength="200" /><p class="form-help">Model IDs and access can change. Check your provider console if this one is unavailable.</p></div><div class="form-row"><label for="provider-api-key">API key</label><input id="provider-api-key" name="apiKey" type="password" placeholder="Paste an API key" autocomplete="off" autocapitalize="off" spellcheck="false" required maxlength="8192" /><p class="form-help">Never enter a website password, one-time code, or browser cookie.</p></div><div class="modal-footer"><button class="button" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">Connect provider</button></div></form>`;
    MODAL_ROOT.innerHTML = modalShell(custom ? (provider?.id === "custom" ? "Add a compatible endpoint" : `Edit ${escapeHtml(provider?.name || "compatible endpoint")}`) : `Connect ${escapeHtml(provider?.name || "provider")}`, "Use a provider API credential for live inference.", body);
    window.setTimeout(() => document.getElementById("provider-api-key")?.focus(), 0);
    return;
  }
  if (state.modal === "mcp") {
    const preset = state.modalData.name || "";
    const presetUrl = state.modalData.url || "";
    const credentialCopy = state.runtimeMode === "cloud" ? "Your endpoint token is encrypted in your private workspace." : "The endpoint and bearer token are saved in Relay’s local credentials file.";
    const isBrowserUse = /browser use/i.test(preset);
    const body = `<form class="form-grid" id="mcp-form"><div class="modal-note"><strong>MCP endpoint.</strong> Relay discovers tools from a remote Streamable HTTP server. HTTPS is required for remote servers; local HTTP endpoints are allowed for localhost. ${credentialCopy}</div><div class="form-row"><label for="mcp-name">Name</label><input id="mcp-name" name="name" value="${escapeHtml(preset)}" placeholder="Project tools" required maxlength="100" /></div><div class="form-row"><label for="mcp-url">Server endpoint</label><input id="mcp-url" name="url" type="url" value="${escapeHtml(presetUrl)}" placeholder="https://example.com/mcp" required maxlength="2048" /><p class="form-help">${isBrowserUse ? "Browser Use Cloud’s Streamable HTTP MCP endpoint." : "Use the MCP URL from the service or your organization."}</p></div><div class="form-row"><label for="mcp-token">Bearer token <span class="form-optional">· optional</span></label><input id="mcp-token" name="token" type="password" placeholder="${isBrowserUse ? "Paste a Browser Use API key" : "Only if your server requires one"}" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="8192" /><p class="form-help">${isBrowserUse ? "Create a key in your Browser Use account. It is sent only to that MCP endpoint." : "Interactive OAuth setup varies by MCP server and is not configured in this starter."}</p></div>${isBrowserUse ? `<p class="form-help">Need a key? <a href="https://browser-use.com/mcp" target="_blank" rel="noopener noreferrer">Open Browser Use setup guide</a>.</p>` : ""}<div class="modal-footer"><button class="button" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">Connect and discover tools</button></div></form>`;
    MODAL_ROOT.innerHTML = modalShell(isBrowserUse ? "Connect Browser Use Cloud" : "Connect an MCP server", "Connect a service that exposes tools or context.", body);
    window.setTimeout(() => document.getElementById("mcp-url")?.focus(), 0);
    return;
  }
  if (state.modal === "tool") {
    const { server, tool } = state.modalData;
    const schema = tool?.inputSchema || { type: "object", properties: {} };
    const body = `<div class="modal-note warning"><strong>Review before running.</strong> This action may read or change data on ${escapeHtml(server?.name || "the MCP server")}. Nothing runs until you check the confirmation box and submit.</div><div class="form-row"><label>Tool</label><input value="${escapeHtml(tool?.name || "")}" disabled /></div><div class="form-row" style="margin-top:12px"><label>Input schema</label><pre class="tool-schema">${escapeHtml(JSON.stringify(schema, null, 2))}</pre></div><form class="form-grid" id="tool-form" style="margin-top:12px"><input type="hidden" name="serverId" value="${escapeHtml(server?.id || "")}" /><input type="hidden" name="toolName" value="${escapeHtml(tool?.name || "")}" /><div class="form-row"><label for="tool-arguments">Arguments (JSON)</label><textarea id="tool-arguments" name="arguments" class="text-mono" spellcheck="false">{}</textarea></div><label class="form-check"><input type="checkbox" name="confirmed" required /><span>I reviewed these arguments and want to run this MCP tool.</span></label>${state.toolError ? `<div class="notice">${escapeHtml(state.toolError)}</div>` : ""}${state.toolResult ? `<pre class="tool-run-result">${escapeHtml(state.toolResult)}</pre>` : ""}${renderToolImages(state.toolImages)}<div class="modal-footer"><button class="button" type="button" data-action="close-modal">Close</button><button class="button button-primary" type="submit" ${state.toolLoading ? "disabled" : ""}>${state.toolLoading ? "Running…" : "Run tool"}</button></div></form>`;
    MODAL_ROOT.innerHTML = modalShell("Inspect and run a tool", `${escapeHtml(server?.name || "MCP server")} · manual action`, body, { wide: true });
    return;
  }
  if (state.modal === "agent") {
    const agent = state.modalData.agent || {};
    const connected = connectedProviders();
    const modelOptions = connected.length ? connected.map((provider) => `<option value="${escapeHtml(provider.id)}" ${agent.providerId === provider.id ? "selected" : ""}>${escapeHtml(provider.name)} · ${escapeHtml(provider.model)}</option>`).join("") : `<option value="">Connect a provider first</option>`;
    const body = `<form class="form-grid" id="agent-form"><input type="hidden" name="agentId" value="${escapeHtml(agent.id || "")}" /><div class="form-row"><label for="agent-name">Agent name</label><input id="agent-name" name="name" value="${escapeHtml(agent.name || "")}" placeholder="Research partner" required maxlength="80" /></div><div class="form-row"><label for="agent-objective">Standing goal</label><textarea id="agent-objective" name="objective" placeholder="What should this agent help you accomplish?" required maxlength="1200">${escapeHtml(agent.objective || "")}</textarea></div><div class="form-row"><label for="agent-provider">Preferred model provider</label><select id="agent-provider" name="providerId">${modelOptions}</select><p class="form-help">This preference is used for a manual run. You can change providers in a conversation.</p></div><div class="form-row"><label for="agent-schedule">Schedule preference</label><select id="agent-schedule" name="schedule"><option ${!agent.schedule || agent.schedule === "On demand" ? "selected" : ""}>On demand</option><option ${agent.schedule === "Weekdays at 9" ? "selected" : ""}>Weekdays at 9</option><option ${agent.schedule === "Weekly on Monday" ? "selected" : ""}>Weekly on Monday</option></select><p class="form-help">Schedules are saved as drafts. This preview has no background runner.</p></div><label class="form-check"><input type="checkbox" name="useTools" ${agent.useTools ? "checked" : ""} ${totalToolCount() ? "" : "disabled"} /><span>Allow connected MCP tools during manual runs. Each tool call still needs your approval.</span></label><div class="modal-footer"><button class="button" type="button" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">Save agent draft</button></div></form>`;
    MODAL_ROOT.innerHTML = modalShell(agent.id ? "Edit agent draft" : "Create an agent", "Give the agent a focused goal and clear boundaries.", body);
    window.setTimeout(() => document.getElementById("agent-name")?.focus(), 0);
    return;
  }
  if (state.modal === "search") {
    const results = searchableItems(state.modalData.query || "");
    const body = `<label class="sr-only" for="command-search">Search Relay</label><input class="search-modal-input" id="command-search" type="search" placeholder="Search pages, providers, and tools…" value="${escapeHtml(state.modalData.query || "")}" autocomplete="off" /><div class="search-results" id="search-results">${renderSearchResults(results)}</div>`;
    MODAL_ROOT.innerHTML = modalShell("Search Relay", "Jump to a page or connection.", body);
    window.setTimeout(() => document.getElementById("command-search")?.focus(), 0);
    return;
  }
  if (state.modal === "confirm-clear") {
    const body = `<p class="modal-note warning"><strong>This cannot be undone.</strong> It removes chat history, agent drafts, subscription tracking, activity, and the local token tally from this browser. Connected providers and MCP servers are kept in the local credentials file.</p><div class="modal-footer"><button class="button" type="button" data-action="close-modal">Cancel</button><button class="button button-danger" type="button" data-action="confirm-clear-local">Clear browser data</button></div>`;
    MODAL_ROOT.innerHTML = modalShell("Clear local browser data?", "Remove saved Relay data from this browser.", body);
    return;
  }
  if (state.modal === "clear-credentials") {
    const body = `<p class="modal-note warning"><strong>This cannot be undone.</strong> Relay will disconnect all model providers and MCP servers, then delete ${state.runtimeMode === "cloud" ? "their encrypted records from the private workspace vault" : "<span class=\"text-mono\">data/credentials.json</span>"}. Conversations and agent drafts in this browser stay in place.</p><div class="modal-footer"><button class="button" type="button" data-action="close-modal">Cancel</button><button class="button button-danger" type="button" data-action="confirm-clear-credentials">Delete saved credentials</button></div>`;
    MODAL_ROOT.innerHTML = modalShell("Delete saved credentials?", state.runtimeMode === "cloud" ? "Remove API keys and MCP tokens from your private workspace." : "Remove API keys and MCP tokens from this device.", body);
    return;
  }
  if (state.modal === "help") {
    const body = `<div class="callout"><span class="callout-icon">${icon("book")}</span><div><strong>What is Relay?</strong><p>A local-first workspace for model APIs, agent drafts, and remote MCP tools. It does not combine consumer subscriptions or use provider browser sessions.</p></div></div><div class="section-heading"><div><h2>Quick start</h2><p>Connect an API key, add an MCP endpoint, then start a conversation.</p></div></div><div class="modal-footer"><button class="button" type="button" data-route="providers">Model providers</button><button class="button button-primary" type="button" data-route="mcp">MCP servers</button></div>`;
    MODAL_ROOT.innerHTML = modalShell("Help with Relay", state.runtimeMode === "cloud" ? "Private workspace · provider keys stay encrypted." : "Local preview · no account required.", body);
  }
}

function searchableItems(query) {
  const term = query.trim().toLowerCase();
  const pages = Object.entries(ROUTES).map(([route, title]) => ({ label: title, detail: "Workspace page", route, icon: route === "mcp" ? "plug" : route === "providers" ? "cube" : "grid" }));
  const providers = state.providers.map((provider) => ({ label: provider.name, detail: provider.connected ? `Connected · ${provider.model}` : "Model provider", provider: provider.id, icon: "cube" }));
  const tools = state.servers.flatMap((server) => (server.tools || []).map((tool) => ({ label: tool.name, detail: `${server.name} · MCP tool`, route: "mcp", icon: "plug" })));
  return [...pages, ...providers, ...tools].filter((item) => !term || `${item.label} ${item.detail}`.toLowerCase().includes(term)).slice(0, 12);
}

function renderSearchResults(items) {
  return items.length ? items.map((item) => `<button class="search-result" type="button" ${item.route ? `data-route="${escapeHtml(item.route)}"` : `data-action="search-provider" data-provider="${escapeHtml(item.provider)}"`}><span class="callout-icon">${icon(item.icon)}</span><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail)}</small></span></button>`).join("") : `<div class="tool-menu-empty">No matching pages, providers, or tools.</div>`;
}

function openModal(type, data = {}) {
  state.modal = type;
  state.modalData = data;
  state.toolResult = "";
  state.toolImages = [];
  state.toolError = "";
  state.toolLoading = false;
  renderModal();
}

function closeModal() {
  state.modal = null;
  state.modalData = {};
  state.toolResult = "";
  state.toolImages = [];
  state.toolError = "";
  MODAL_ROOT.innerHTML = "";
}

function newChat() {
  const chat = { id: crypto.randomUUID(), title: "New conversation", messages: [], createdAt: new Date().toISOString() };
  state.chats.unshift(chat);
  state.activeChatId = chat.id;
  saveChats();
  setRoute("chat");
  window.setTimeout(() => document.getElementById("chat-prompt")?.focus(), 0);
}

function updateUsage(usage, providerId) {
  const input = Number(usage?.prompt_tokens ?? usage?.input_tokens ?? 0) || 0;
  const output = Number(usage?.completion_tokens ?? usage?.output_tokens ?? 0) || 0;
  const day = new Date().toISOString().slice(0, 10);
  state.usage.calls = Number(state.usage.calls || 0) + 1;
  state.usage.inputTokens = Number(state.usage.inputTokens || 0) + input;
  state.usage.outputTokens = Number(state.usage.outputTokens || 0) + output;
  state.usage.days ||= {};
  state.usage.days[day] = Number(state.usage.days[day] || 0) + input + output;
  state.usage.byProvider ||= {};
  state.usage.byProvider[providerId] ||= { tokens: 0, calls: 0 };
  state.usage.byProvider[providerId].tokens += input + output;
  state.usage.byProvider[providerId].calls += 1;
  saveUsage();
}

function demoResponse(prompt) {
  const lower = prompt.toLowerCase();
  if (/tool|mcp|connect/.test(lower)) {
    return "This is a local demo response. Add an MCP server to discover its tools, then enable the tools you want in this conversation. A live model can request an action, but Relay will wait for your approval before running it. No external model was called.";
  }
  if (/compare|model|provider/.test(lower)) {
    return "This is a local demo response. Relay can route prompts to the provider API you choose. Add API credentials for the models you already use, then compare their answers in separate conversations. Consumer subscriptions are tracked separately from API access. No external model was called.";
  }
  return `This is a local demo response to: “${prompt.slice(0, 180)}”\n\nConnect a provider API key to get a real model response. Your message was kept in this browser and was not sent to an AI provider.`;
}

async function sendChat(prompt) {
  const trimmed = prompt.trim();
  if (!trimmed || state.sending) return;
  const chat = ensureChat();
  chat.messages.push({ role: "user", content: trimmed, at: new Date().toISOString() });
  if (chat.title === "New conversation") chat.title = trimmed.length > 38 ? `${trimmed.slice(0, 36)}…` : trimmed;
  saveChats();
  const provider = providerById(state.selectedProviderId);
  const live = provider?.connected && state.serverOnline;
  state.sending = true;
  state.pendingByChat[chat.id] = null;
  render();
  if (!live) {
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    chat.messages.push({ role: "assistant", content: demoResponse(trimmed), at: new Date().toISOString() });
    addActivity("Demo conversation", "No message was sent to a model provider.", "chat");
    state.sending = false;
    saveChats();
    render();
    document.getElementById("chat-prompt")?.focus();
    return;
  }
  try {
    const messages = chat.messages.slice(-50).map(({ role, content }) => ({ role, content }));
    const refs = state.useTools ? toolRefs() : [];
    const result = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({ providerId: provider.id, messages, toolRefs: refs })
    });
    updateUsage(result.usage, provider.id);
    if (result.answer) chat.messages.push({ role: "assistant", content: result.answer, at: new Date().toISOString() });
    else if (result.pending) chat.messages.push({ role: "assistant", content: "I have a tool action ready. Review it before I continue.", at: new Date().toISOString() });
    else chat.messages.push({ role: "assistant", content: "The provider returned an empty response.", at: new Date().toISOString() });
    if (result.pending) state.pendingByChat[chat.id] = result.pending;
    addActivity("Model request", `${provider.name} · ${provider.model}${refs.length ? ` · ${refs.length} tools enabled` : ""}`, "cube");
    saveChats();
  } catch (error) {
    toast(error.message || "The provider request did not complete.", "error");
  } finally {
    state.sending = false;
    render();
    document.getElementById("chat-prompt")?.focus();
  }
}

async function approveTools(pendingId) {
  const chat = activeChat();
  if (!chat || !pendingId || state.sending) return;
  state.sending = true;
  render();
  try {
    const result = await api("/api/agent/approve", { method: "POST", body: JSON.stringify({ pendingId }) });
    updateUsage(result.usage, result.providerId || state.selectedProviderId);
    for (const item of result.toolResults || []) {
      chat.messages.push({ role: "assistant", content: `Tool result — ${item.serverName} / ${item.toolName}${item.isError ? " · error" : ""}\n${item.text}`, images: item.images || [], at: new Date().toISOString() });
      addActivity(`MCP tool ${item.isError ? "returned an error" : "ran"}`, `${item.serverName} / ${item.toolName}`, "plug");
    }
    if (result.answer) chat.messages.push({ role: "assistant", content: result.answer, at: new Date().toISOString() });
    if (result.pending) state.pendingByChat[chat.id] = result.pending;
    else delete state.pendingByChat[chat.id];
    saveChats();
  } catch (error) {
    toast(error.message || "The approved tool action did not complete.", "error");
  } finally {
    state.sending = false;
    render();
  }
}

async function runComputerTask(form) {
  const data = new FormData(form);
  const provider = providerById(String(data.get("providerId") || ""));
  const prompt = String(data.get("prompt") || "").trim();
  const tools = availableComputerTools();
  if (!provider?.connected) { toast("Connect a model provider before starting a computer task.", "error"); setRoute("providers"); return; }
  if (!state.serverOnline) { toast("The Relay server is offline. Start it before sending a computer task.", "error"); return; }
  if (!tools.length) { toast("Connect a remote browser or computer MCP server first.", "error"); return; }
  state.selectedProviderId = provider.id;
  persist(STORAGE.provider, provider.id);
  state.selectedToolRefs = new Set(tools.map(({ server, tool }) => `${server.id}:${tool.name}`));
  state.useTools = true;
  setRoute("chat");
  await sendChat(prompt);
}

function openProviderModal(providerId) {
  const provider = providerId === "custom" ? { id: "custom" } : providerById(providerId);
  if (!provider) { toast("Provider not found.", "error"); return; }
  openModal("provider", { provider });
}

async function saveProvider(form) {
  const data = new FormData(form);
  const providerId = String(data.get("providerId") || "");
  const payload = {
    providerId,
    apiKey: String(data.get("apiKey") || ""),
    model: String(data.get("model") || "")
  };
  if (providerId === "custom" || providerById(providerId)?.isCustom) {
    payload.name = String(data.get("name") || "");
    payload.baseUrl = String(data.get("baseUrl") || "");
  }
  const result = await api("/api/providers", { method: "POST", body: JSON.stringify(payload) });
  await refreshConnections();
  state.selectedProviderId = result.provider.id;
  persist(STORAGE.provider, state.selectedProviderId);
  addActivity("Model provider connected", `${result.provider.name} · ${result.provider.model}`, "cube");
  closeModal();
  render();
  toast(`${result.provider.name} is connected for this session.`);
}

async function disconnectProvider(providerId) {
  const provider = providerById(providerId);
  if (!provider?.connected) return;
  const storage = state.runtimeMode === "cloud" ? "private encrypted vault" : "local credentials file";
  if (!window.confirm(`Disconnect ${provider.name}? Its API key will also be removed from the ${storage}.`)) return;
  try {
    await api(`/api/providers/${encodeURIComponent(providerId)}`, { method: "DELETE" });
    await refreshConnections();
    if (state.selectedProviderId === providerId) {
      state.selectedProviderId = connectedProviders()[0]?.id || "demo";
      persist(STORAGE.provider, state.selectedProviderId);
    }
    addActivity("Model provider disconnected", provider.name, "cube");
    render();
    toast(`${provider.name} disconnected.`);
  } catch (error) { toast(error.message, "error"); }
}

function openMcpModal(name = "", url = "") { openModal("mcp", { name, url }); }

async function saveMcp(form) {
  const data = new FormData(form);
  const result = await api("/api/mcp", {
    method: "POST",
    body: JSON.stringify({ name: String(data.get("name") || ""), url: String(data.get("url") || ""), token: String(data.get("token") || "") })
  });
  await refreshConnections();
  addActivity("MCP server connected", `${result.server.name} · ${result.server.tools.length} tools discovered`, "plug");
  closeModal();
  setRoute(/browser|computer|desktop/i.test(`${result.server.name} ${result.server.url}`) ? "computer" : "mcp");
  toast(`${result.server.name} connected. ${result.server.tools.length} tools discovered.`);
}

async function disconnectMcp(serverId) {
  const server = state.servers.find((item) => item.id === serverId);
  const storage = state.runtimeMode === "cloud" ? "private encrypted vault" : "local credentials file";
  if (!server || !window.confirm(`Remove ${server.name}? Its saved endpoint and token will be deleted from the ${storage}.`)) return;
  try {
    await api(`/api/mcp/${encodeURIComponent(serverId)}`, { method: "DELETE" });
    await refreshConnections();
    addActivity("MCP server disconnected", server.name, "plug");
    render();
    toast(`${server.name} disconnected.`);
  } catch (error) { toast(error.message, "error"); }
}

async function reconnectMcp(serverId) {
  try {
    await api(`/api/mcp/${encodeURIComponent(serverId)}/reconnect`, { method: "POST", body: "{}" });
    await refreshConnections();
    render();
    toast("Saved MCP server reconnected.");
  } catch (error) { toast(error.message || "MCP server could not be reconnected.", "error"); }
}

async function removeStoredCredentials() {
  try {
    await api("/api/credentials", { method: "DELETE" });
    state.selectedProviderId = "demo";
    state.pendingByChat = {};
    persist(STORAGE.provider, "demo");
    await refreshConnections();
    closeModal();
    render();
    toast("Saved provider keys and MCP tokens were deleted.");
  } catch (error) { toast(error.message || "Saved credentials could not be deleted.", "error"); }
}

async function refreshMcp(serverId) {
  try {
    await api(`/api/mcp/${encodeURIComponent(serverId)}/refresh`, { method: "POST", body: "{}" });
    await refreshConnections();
    render();
    toast("Tools refreshed from the MCP server.");
  } catch (error) { toast(error.message, "error"); }
}

function openToolModal(serverId, toolName) {
  const server = state.servers.find((item) => item.id === serverId);
  const tool = server?.tools?.find((item) => item.name === toolName);
  if (!server || !tool) { toast("This MCP tool is no longer available.", "error"); return; }
  openModal("tool", { server, tool });
}

async function runDirectTool(form) {
  const data = new FormData(form);
  let args;
  try {
    args = JSON.parse(String(data.get("arguments") || "{}"));
    if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("Arguments must be a JSON object.");
  } catch (error) {
    state.toolError = error.message || "Arguments must be valid JSON.";
    renderModal();
    return;
  }
  state.toolLoading = true;
  state.toolResult = "";
  state.toolImages = [];
  state.toolError = "";
  renderModal();
  try {
    const serverId = String(data.get("serverId") || "");
    const toolName = String(data.get("toolName") || "");
    const result = await api(`/api/mcp/${encodeURIComponent(serverId)}/call`, {
      method: "POST",
      body: JSON.stringify({ toolName, arguments: args, confirmed: data.get("confirmed") === "on" })
    });
    state.toolResult = result.text || "Tool completed without text output.";
    state.toolImages = result.images || [];
    addActivity("MCP tool ran", `${state.modalData.server?.name || "Server"} / ${toolName}`, "plug");
  } catch (error) {
    state.toolError = error.message || "The tool call did not complete.";
  } finally {
    state.toolLoading = false;
    renderModal();
  }
}

function openAgentModal(agentId = "") {
  const agent = state.agents.find((item) => item.id === agentId) || null;
  openModal("agent", { agent });
}

function saveAgent(form) {
  const data = new FormData(form);
  const id = String(data.get("agentId") || "");
  const existing = state.agents.find((agent) => agent.id === id);
  const agent = {
    id: existing?.id || crypto.randomUUID(),
    name: String(data.get("name") || "").trim(),
    objective: String(data.get("objective") || "").trim(),
    providerId: String(data.get("providerId") || ""),
    schedule: String(data.get("schedule") || "On demand"),
    useTools: data.get("useTools") === "on",
    tint: existing?.tint || ["", "peach", "blue", "violet"][state.agents.length % 4],
    isExample: false,
    createdAt: existing?.createdAt || new Date().toISOString()
  };
  if (!agent.name || !agent.objective) { toast("Add a name and a goal for this agent.", "error"); return; }
  if (existing) state.agents = state.agents.map((item) => item.id === id ? agent : item);
  else state.agents.unshift(agent);
  saveAgents();
  addActivity(existing ? "Agent draft updated" : "Agent draft created", agent.name, "spark");
  closeModal();
  render();
  toast(existing ? "Agent draft updated." : "Agent draft saved.");
}

function runAgent(agentId) {
  const agent = state.agents.find((item) => item.id === agentId);
  if (!agent) return;
  if (agent.providerId && providerById(agent.providerId)?.connected) {
    state.selectedProviderId = agent.providerId;
    persist(STORAGE.provider, state.selectedProviderId);
  }
  state.useTools = Boolean(agent.useTools);
  state.selectedToolRefs = null;
  state.activeChatId = crypto.randomUUID();
  state.chats.unshift({ id: state.activeChatId, title: agent.name, messages: [], createdAt: new Date().toISOString() });
  saveChats();
  setRoute("chat");
  sendChat(`Agent goal: ${agent.name}\n\n${agent.objective}`);
}

function newAgent() { openAgentModal(); }

function toggleApp(appId) {
  const current = new Set(state.setupSelections);
  if (current.has(appId)) current.delete(appId);
  else current.add(appId);
  state.setupSelections = [...current];
  persist(STORAGE.setup, state.setupSelections);
  render();
}

function completeSetup() {
  if (!state.setupSelections.length) {
    toast("Choose at least one app category to continue.", "error");
    return;
  }
  const names = state.setupSelections.map((id) => APP_CATALOG.find((app) => app.id === id)?.name).filter(Boolean);
  addActivity("Integration setup selected", names.join(", "), "grid");
  toast("Selections saved. Add the matching MCP endpoint for a live connection.");
  setRoute("mcp");
}

function trackPlan(providerId) {
  state.trackedPlans[providerId] = !state.trackedPlans[providerId];
  savePlans();
  const plan = SUBSCRIPTIONS.find((item) => item.id === providerId);
  addActivity(state.trackedPlans[providerId] ? "Subscription tracked" : "Subscription untracked", plan?.name || providerId, "book");
  render();
}

function newSearch(query = "") { openModal("search", { query }); }

function filterCatalog() {
  const term = state.catalogSearch.trim().toLowerCase();
  document.querySelectorAll(".app-chip[data-search]").forEach((card) => {
    const matchesTerm = !term || card.dataset.search.includes(term);
    const app = APP_CATALOG.find((item) => item.name === card.dataset.appName);
    const matchesCategory = state.catalogCategory === "All" || app?.group === state.catalogCategory;
    card.classList.toggle("hidden", !(matchesTerm && matchesCategory));
  });
}

function clearLocalData() {
  for (const key of Object.values(STORAGE)) {
    try { localStorage.removeItem(key); } catch { /* Continue if storage is unavailable. */ }
  }
  state.agents = [];
  state.chats = [];
  state.activity = [];
  state.trackedPlans = {};
  state.setupSelections = [];
  state.usage = { calls: 0, inputTokens: 0, outputTokens: 0, days: {} };
  state.activeChatId = null;
  state.selectedProviderId = connectedProviders()[0]?.id || "demo";
  persist(STORAGE.provider, state.selectedProviderId);
  closeModal();
  render();
  toast("Local browser data cleared.");
}

document.addEventListener("click", async (event) => {
  const routeElement = event.target.closest("[data-route]");
  if (routeElement) {
    if (state.modal) closeModal();
    const route = routeElement.dataset.route;
    if (route === "providers" && routeElement.classList.contains("pill-button")) setRoute("providers");
    else setRoute(route);
    return;
  }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "close-modal") { if (event.target === button || button.classList.contains("modal-close")) closeModal(); return; }
  if (action === "open-search") { newSearch(); return; }
  if (action === "open-help") { openModal("help"); return; }
  if (action === "workspace-menu") { toast("This is a single-user local workspace preview."); return; }
  if (action === "refresh") { await refreshConnections({ quiet: false }); render(); return; }
  if (action === "go-providers") { setRoute("providers"); return; }
  if (action === "go-home") { setRoute("home"); return; }
  if (action === "open-chat") { newChat(); return; }
  if (action === "new-chat") { newChat(); return; }
  if (action === "select-chat") { state.activeChatId = button.dataset.chat; state.pendingByChat[state.activeChatId] = null; render(); return; }
  if (action === "chat-suggestion") { const input = document.getElementById("chat-prompt"); if (input) { input.value = button.dataset.prompt || ""; input.focus(); } return; }
  if (action === "open-provider") { openProviderModal(button.dataset.provider); return; }
  if (action === "add-custom-provider") { openProviderModal("custom"); return; }
  if (action === "disconnect-provider") { await disconnectProvider(button.dataset.provider); return; }
  if (action === "open-mcp") { openMcpModal(); return; }
  if (action === "suggest-mcp") { openMcpModal(button.dataset.appName || ""); return; }
  if (action === "connect-browser-use") { openMcpModal("Browser Use Cloud", "https://api.browser-use.com/v3/mcp"); return; }
  if (action === "connect-computer") { openMcpModal("My cloud computer"); return; }
  if (action === "disconnect-mcp") { await disconnectMcp(button.dataset.server); return; }
  if (action === "reconnect-mcp") { await reconnectMcp(button.dataset.server); return; }
  if (action === "refresh-mcp") { await refreshMcp(button.dataset.server); return; }
  if (action === "run-tool") { openToolModal(button.dataset.server, button.dataset.tool); return; }
  if (action === "new-agent") { newAgent(); return; }
  if (action === "edit-agent") { openAgentModal(button.dataset.agent); return; }
  if (action === "run-agent") { runAgent(button.dataset.agent); return; }
  if (action === "delete-agent") {
    const agent = state.agents.find((item) => item.id === button.dataset.agent);
    if (agent && window.confirm(`Remove the ${agent.name} draft from this browser?`)) { state.agents = state.agents.filter((item) => item.id !== agent.id); saveAgents(); addActivity("Agent draft removed", agent.name, "trash"); render(); toast("Agent draft removed."); }
    return;
  }
  if (action === "toggle-app") { toggleApp(button.dataset.app); return; }
  if (action === "complete-setup") { completeSetup(); return; }
  if (action === "track-plan") { trackPlan(button.dataset.provider); return; }
  if (action === "catalog-category") { state.catalogCategory = button.dataset.category || "All"; render(); return; }
  if (action === "toggle-chat-tools") { state.useTools = !state.useTools; state.showToolMenu = state.useTools; render(); return; }
  if (action === "close-tool-menu") { state.showToolMenu = false; render(); return; }
  if (action === "all-tools") { state.selectedToolRefs = null; state.showToolMenu = true; render(); return; }
  if (action === "approve-tools") { await approveTools(button.dataset.pending); return; }
  if (action === "settings-tab") { state.settingsTab = button.dataset.tab || "Privacy"; render(); return; }
  if (action === "clear-local-data") { openModal("confirm-clear"); return; }
  if (action === "confirm-clear-local") { clearLocalData(); return; }
  if (action === "clear-credentials") { openModal("clear-credentials"); return; }
  if (action === "confirm-clear-credentials") { await removeStoredCredentials(); return; }
  if (action === "clear-activity") {
    if (window.confirm("Clear all local activity entries?")) { state.activity = []; saveActivity(); render(); toast("Activity cleared."); }
    return;
  }
  if (action === "search-provider") { closeModal(); openProviderModal(button.dataset.provider); return; }
});

document.addEventListener("change", (event) => {
  const input = event.target;
  if (input.id === "chat-provider-select") {
    const provider = providerById(input.value);
    if (input.value === "demo") {
      state.selectedProviderId = "demo";
      persist(STORAGE.provider, "demo");
      render();
    } else if (provider?.connected) {
      state.selectedProviderId = provider.id;
      persist(STORAGE.provider, provider.id);
      render();
    } else {
      render();
      openProviderModal(input.value);
    }
    return;
  }
  if (input.matches("[data-tool-ref]")) {
    const key = input.dataset.toolRef;
    if (state.selectedToolRefs === null) {
      state.selectedToolRefs = new Set(state.servers.flatMap((server) => (server.tools || []).map((tool) => `${server.id}:${tool.name}`)));
    }
    if (input.checked) state.selectedToolRefs.add(key); else state.selectedToolRefs.delete(key);
    state.useTools = true;
    const menu = document.querySelector(".tool-menu");
    if (menu) menu.querySelectorAll("[data-tool-ref]").forEach((checkbox) => { checkbox.checked = state.selectedToolRefs.has(checkbox.dataset.toolRef); });
    const label = document.querySelector(".tool-toggle");
    if (label) label.innerHTML = `${icon("plug")} Tools on`;
    const status = document.querySelector(".composer-label span:last-child");
    if (status) status.textContent = `${toolRefs().length} tools available`;
    return;
  }
  if (input.id === "integration-search") {
    state.catalogSearch = input.value;
    filterCatalog();
  }
});

document.addEventListener("input", (event) => {
  const input = event.target;
  if (input.id === "integration-search") {
    state.catalogSearch = input.value;
    filterCatalog();
  }
  if (input.id === "command-search") {
    state.modalData.query = input.value;
    const results = document.getElementById("search-results");
    if (results) results.innerHTML = renderSearchResults(searchableItems(input.value));
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  if (form.id === "chat-form") {
    const prompt = String(new FormData(form).get("prompt") || "");
    form.querySelector("textarea").value = "";
    await sendChat(prompt);
  } else if (form.id === "computer-form") {
    await runComputerTask(form);
  } else if (form.id === "provider-form") {
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Connecting…";
    try { await saveProvider(form); } catch (error) { toast(error.message || "Provider could not be connected.", "error"); submit.disabled = false; submit.textContent = "Connect provider"; }
  } else if (form.id === "mcp-form") {
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Connecting…";
    try { await saveMcp(form); } catch (error) { toast(error.message || "MCP server could not be connected.", "error"); submit.disabled = false; submit.textContent = "Connect and discover tools"; }
  } else if (form.id === "tool-form") {
    if (new FormData(form).get("confirmed") !== "on") { toast("Review and confirm the tool action first.", "error"); return; }
    await runDirectTool(form);
  } else if (form.id === "agent-form") {
    saveAgent(form);
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    newSearch();
  }
  if (event.key === "Escape" && state.modal) closeModal();
});

async function init() {
  await refreshConnections();
  if (!state.activeChatId && state.chats.length) state.activeChatId = state.chats[0].id;
  render();
}

init();
