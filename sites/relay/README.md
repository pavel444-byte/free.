# Doter private workspace

Doter is a private, multi-provider agent workspace with MCP integrations and a remote browser/computer page. The hosted Site runs as a Worker, requires the Sites identity header on every API route, and stores each account's provider keys and MCP bearer tokens as an AES-GCM encrypted object in its isolated R2 vault.

## Hosted runtime setup

- The Sites runtime provides the `BUCKET` R2 binding declared in `.openai/hosting.json`.
- Configure the secret environment variable `RELAY_CREDENTIALS_MASTER_KEY` in Sites. It must be a standard Base64 encoding of exactly 32 random bytes. Do not put it in source control, the browser, or the hosting manifest.
- Build with `npm run build`. The deployable Worker is `dist/server/index.js`.
- Deploy this Site as private. Its `/api/*` routes reject requests without `oai-authenticated-user-id`.

Each account's credentials are stored in an encrypted object named from a SHA-256 hash of its Sites user ID. Pending tool approvals use separate encrypted, one-day objects. Doter never returns provider API keys or MCP bearer tokens to the browser. Chat history, usage, agent drafts, subscription tracking, and preferences are encrypted in a separate workspace object for each account. Existing owner browser data can be imported from Account.

## Providers and tools

The hosted Worker supports OpenAI Responses, Anthropic Messages, and OpenAI-compatible APIs, including xAI, Moonshot AI, OpenRouter, DeepSeek, and compatible custom HTTPS endpoints. A service's consumer subscription and API access are separate; Doter uses the API key entered by the user.

MCP connections use remote Streamable HTTP and a static bearer token. Interactive OAuth flows and stdio-only MCP servers need an adapter. Tool calls pause for user approval. Browser Use Cloud can be connected from the Browser & computer page; other cloud computers can be added through their HTTPS MCP endpoint. Doter does not provision a VM or desktop by itself.

## Build checks

```sh
node --check public/app.js
node --check worker/index.template.js
npm run build
node --check dist/server/index.js
```

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
- [DeepSeek API model and pricing docs](https://api-docs.deepseek.com/quick_start/pricing/)

Keep a secure backup of `RELAY_CREDENTIALS_MASTER_KEY` before adding credentials. Rotating or losing that secret makes existing encrypted credential objects unreadable; a vault migration must decrypt and re-encrypt them while the previous key is still available.

## Subscription authorization API

`GET /api/subscriptions`, `POST /api/subscriptions/start`, and `GET /api/subscriptions/callback` implement provider-registered OAuth 2 authorization code login with PKCE, per-user one-use encrypted state, encrypted access/refresh token persistence, and token refresh. This needs each provider's registered OAuth application and supported inference endpoint. It does not infer subscription entitlements from successful login.

Set the secret Site environment variable `DOTER_SUBSCRIPTION_OAUTH` to a JSON array of provider application configurations: `id`, `name`, `clientId`, optional `clientSecret`, `authorizationUrl`, `tokenUrl`, `scope`, `apiBaseUrl`, `protocol` (`responses` or `openai`), `model`, and `accessDescription`. Use provider-authorized applications and documented endpoints. No provider client IDs or consumer session cookies are embedded in this repository. The durable service also needs this configuration when refreshing subscription credentials.

Run `npm test` for regression checks of private APIs, account boundaries, runtime progress, pause behavior, retries, encrypted state, and subscription-state rejection. These automated checks do not replace live provider, cloud-computer, or visual browser checks.

ChatGPT now has a built-in dynamic client registration adapter, adapted from the MIT-licensed OpenCode source. It requests consent for doter and a user-owned client; no manual client registration is required for that path. The flow validates signed ID tokens, issuer, audience, expiration, nonce, state, PKCE, and the subscription-sharing scope. The dynamic client flow requires a loopback redirect, so the hosted Site supplies a per-login Node.js helper. Download it from Connect subscription and run `node doter-login.mjs` on your computer. It listens only on `127.0.0.1:1455`, validates state, and redirects the browser to the private Site. The Site retains the PKCE verifier and performs token exchange using the same loopback URI; the helper receives no access or refresh tokens. Sessions expire after 10 minutes. Actual account eligibility still requires live user sign-in verification. Other providers remain configurable only where the provider supports the integration.

## Doter accounts

Keep the Site restricted to invited visitors. Configure `DOTER_OWNER_ID` with the owner account user ID returned by Sites. The owner signs in using Continue with Sites; all workspace APIs additionally require an HttpOnly, Secure, SameSite session cookie bound to that Sites identity. Sessions expire after seven days and are revoked on sign-out.

In Account, the owner can create a named account activation link, revoke pending links, and disable or re-enable members. Friends need both a Sites sharing invitation and the doter activation link. Activation binds the new account to the friend’s own Sites identity and consumes the link using a conditional R2 write. Activation links expire after seven days. Changing a profile name never changes account identity. Disabling an account invalidates its sessions; existing data stays stored for re-enablement.

Credentials, tool approvals, OAuth state, durable agent IDs, and saved workspace data are scoped to the signed-in identity. The account-management API returns names, roles, and status; it does not expose members’ keys or workspace contents. The app starts on a sign-in homepage before loading workspace data and does not load legacy shared browser storage automatically. The owner can explicitly import previous browser data into their account.

The Site owner and hosting runtime remain trusted administrators of the deployment; per-account encryption is server-managed rather than end-to-end encryption.
