# Relay

Relay is a local-first AI workspace prototype for connecting API model providers, creating reusable agent drafts, and using tools from remote Model Context Protocol (MCP) servers. The Overview page follows the uploaded Dots page's broad story arc (intro, capabilities, use cases, trust, and channels) while using Relay's own visual design. The rest of the app is a working workspace interface.

## Run locally

Requirements: Node.js 20 or newer.

```sh
npm install
npm start
```

Open <http://127.0.0.1:4173>. Relay binds to loopback only. Set `RELAY_PORT` to choose another local port.

## What works in this prototype

- Live chat through API keys for OpenAI, Anthropic, xAI, Moonshot AI (Kimi), OpenRouter, and DeepSeek.
- Provider keys and MCP endpoint credentials persist across restarts in `data/credentials.json`.
- Custom OpenAI-compatible chat-completions endpoints.
- Remote MCP servers over Streamable HTTP, with optional static bearer token, tool discovery, refresh, disconnect, and manual tool execution.
- A Browser & computer workspace that connects Browser Use Cloud or an HTTPS MCP endpoint for a cloud browser/desktop, scopes tasks to those tools, and shows supported screenshot results.
- Model-requested MCP actions pause for review and explicit approval before running. A four-step cap limits tool loops.
- Agent drafts can be run on demand. Conversations, drafts, plan tracking, activity, and local token counts persist in browser storage.
- Demo mode works without a provider key and does not send prompts to a model.

Provider model IDs are editable because catalogs, access, and aliases change. Defaults are taken from current provider catalogs where available; verify the model ID in the provider's console if a request is rejected.

## What Dots are, and how Relay relates

OpenAI describes Dots as always-on agents with ongoing goals, memory/context, connected apps, and their own cloud computer. They can keep working between conversations, surface progress for review, and reach users through supported communication channels. OpenAI's app/plugin layer supplies integrations and permission boundaries. Relay borrows the high-level workspace idea, with an Overview page visually inspired by the uploaded Dots marketing HTML.

Plugins and MCP solve related but different integration problems. A plugin/app is a packaged integration or workflow in a host product, often with its own account connection and permissions. MCP is an open client-server protocol: a host connects to an MCP server that can expose tools and other context. Relay currently implements MCP tool discovery and calls using the official TypeScript client SDK; it does not implement the full MCP surface or interactive authorization flows.

Consumer subscriptions and API access are separate in many cases. For example, OpenAI documents separate ChatGPT and API billing; Anthropic states that Claude.ai paid plans do not include Console API usage; xAI documents separate Grok and xAI API billing. Relay therefore tracks ChatGPT, Claude, Grok, and Kimi plans as notes only. Use the provider's API key for live model calls, or a provider-supported delegated authorization flow if one is available for your account and app.

## Data and security boundaries

- Provider API keys and MCP bearer tokens are saved in `data/credentials.json`, which is excluded from Git. Relay applies owner-only directory and file permissions (`0700` and `0600` on POSIX systems) and uses an atomic file replacement when saving. The file is not encrypted. The running server also loads credentials into memory to make provider requests and restore MCP sessions.
- Chat history, agent drafts, activity, subscription tracking, and usage totals are stored in this browser's `localStorage`. They are not encrypted and do not sync across browsers.
- Prompts leave the machine only after a connected provider is selected and Send is pressed. Then the prompt goes to that provider's API and is subject to its terms and data policies.
- MCP tool calls go to the configured MCP endpoint. Model-requested calls wait for approval; manual calls require a separate confirmation checkbox.
- Remote custom-provider and MCP endpoints require HTTPS and are rejected if DNS resolves to private/local IP space. HTTP is accepted only for loopback endpoints used for local development.
- The local app remains a single-user preview: it has no account system, local VM provisioning, background agent scheduler, channel delivery, provider OAuth, native app OAuth, or subscription-session reuse. Browser/computer actions require a separate hosted browser or desktop MCP endpoint; Relay does not provision that machine. Agent schedules are saved as drafts and do not run in the background. Use Settings to delete saved credentials, or stop Relay and remove `data/credentials.json` manually. A private Sites Worker variant lives in `../sites/relay`; it uses per-account AES-GCM encrypted objects in R2 and requires a 32-byte runtime secret.

## Research references

- [Introducing Dots — OpenAI](https://openai.com/index/introducing-dots/)
- [Getting started with your dot — OpenAI Help Center](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot)
- [Plugins in ChatGPT and Codex — OpenAI Help Center](https://help.openai.com/en/articles/20001256-plugins-in-chatgpt)
- [Model Context Protocol specification](https://modelcontextprotocol.io/specification/2026-07-28)
- [MCP TypeScript SDK v2](https://ts.sdk.modelcontextprotocol.io/v2/)
- [Browser Use Cloud MCP](https://browser-use.com/mcp)
- [Cloudflare Browser Run](https://developers.cloudflare.com/browser-run/get-started/)
- [OpenAI ChatGPT and API billing](https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform)
- [Claude.ai plan and API billing](https://support.anthropic.com/en/articles/9876003-i-subscribe-to-a-paid-claude-ai-plan-why-do-i-have-to-pay-separately-for-api-usage-on-console)
- [xAI API account FAQ](https://docs.x.ai/developers/faq/accounts)
- [Kimi API quickstart](https://platform.kimi.ai/docs/get-your-api-key)
- [Kimi API model list](https://platform.kimi.ai/docs/models)
- [DeepSeek API model and pricing docs](https://api-docs.deepseek.com/quick_start/pricing/)

