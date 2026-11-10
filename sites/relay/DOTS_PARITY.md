# Dots parity research

OpenAI describes dots as agents that work toward ongoing goals between conversations, each with its own cloud computer and browser. Its launch page describes connected apps, user controls, and messaging through Slack and Teams. The Help Center describes additional controls and the optional connection to a user's computer.

Sources: [Introducing dots](https://openai.com/index/introducing-dots/), [Getting started with your dot](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot), and [Dots safety and privacy](https://openai.com/index/how-we-build-safety-security-and-privacy-into-dots/).

## Implementation status

Doter currently supports provider API keys, remote Streamable HTTP MCP servers, on-demand agent drafts, approval-gated tool calls, and connecting an external browser or computer MCP server. Credentials are encrypted in the hosted private vault.

Still needed for parity: a durable event-driven agent runtime that continues between requests; persistent per-agent state, memory, work queue, and activity; provisioned isolated computers and browsers per agent; a policy engine for allowed, denied, and approval-required actions; channel adapters with verified identity and message delivery; long-running job recovery and monitoring; and app-specific integrations and delegated authorization. A timer alone is insufficient for continuous, event-driven work. Consumer subscriptions require an authorization mechanism supported by each provider.
