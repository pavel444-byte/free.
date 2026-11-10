# Doter continuous agent service

This service uses Cloudflare Durable Objects with durable alarms. It runs independently of the browser and Sites request lifecycle. Each agent stores its encrypted configuration, rolling memory, progress events, pending approvals, retries, and pause state. Tools default to approval; per-tool policies support allow, ask, and deny. Provider credentials are never returned by the service API.

Build from the Site root with `node scripts/build-runtime.mjs`. Deploy from `runtime` with `npx wrangler deploy`. Configure two runtime secrets with `wrangler secret put`: `DOTER_SERVICE_TOKEN` and `RELAY_CREDENTIALS_MASTER_KEY` (Base64 encoding of 32 random bytes). Keep both out of source. Configure the Site runtime environment with `DOTER_RUNTIME_URL` and `DOTER_RUNTIME_TOKEN`, using the deployed service URL and the same service token. The service encryption key can differ from the Site vault key.

The service resumes the next unit of work on a durable alarm and backs off after provider failures. Agents stop for approval and after eight consecutive failures. Calls with external side effects require an idempotent MCP implementation for strict exactly-once guarantees. Provisioned computers require a connected browser/desktop MCP provider. This service does not provision VMs. No messaging adapters are included.
