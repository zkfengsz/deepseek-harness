---
description: "Holds one supervised MCP connection per enabled registry record, so users can add and remove servers at runtime."
kind: "package-reference"
---

# @deepseek-ai/dsh-mcp-manager

English | [中文](README.zh.md)

## Summary

Use this package to keep a live, supervised MCP connection for every enabled server in the MCP registry. It starts and stops connections as records change, reusing the connection, reconnect, and tool-registration logic from `@deepseek-ai/dsh-mcp-client`. It exposes `ctx.mcpManager`.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----
<a id="use-this-package"></a>
## Use this package

### When to use it

Use it when servers are added and removed at runtime, so connections must be reconciled against a durable registry. Skip it when every server is a fixed `cordis.yml` row.

### Setting up

Mount it beside the registry and the tool registry:

```yaml
- name: '@deepseek-ai/dsh-tools'
- name: '@deepseek-ai/dsh-mcp-registry'
- name: '@deepseek-ai/dsh-mcp-manager'
```

<a id="understand-the-implementation"></a>
## Understand the implementation

The manager reconciles, not configures: it reads `ctx.mcpRegistry.list()`, holds one `startConnection` handle per enabled record, and disposes handles whose record is removed or disabled. The mutation path re-syncs after each write, and the manager also listens for `domain/changed` on the `mcp` domain. Tool names follow the client's `mcp__<serverName>__<tool>` contract, and a duplicate `serverName` fails the new connection rather than the earlier one.

<a id="further-exploration"></a>
## Further Exploration

- [dsh-mcp-client](../mcp-client/README.md) — the connection and reconnect logic this reuses.
- [dsh-mcp-registry](../mcp-registry/README.md) — the durable records.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through the connected MCP servers, whose tools appear in the model's catalog under `mcp__<serverName>__<tool>`.

#### KV Cache effect

Every connected server's tool definitions add tokens to model requests; adding or removing a server changes the catalog and therefore the request prefix on the next turn.

## Known Limitations and Deferred Work

- **Status is coarse** — `states()` reflects the initial connection attempt only; a later reconnect drop is not surfaced until a re-sync.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

`McpManager` is a `Service` with `static inject = ['mcpRegistry', 'tools']`. `sync()` serializes reconciles through a promise tail; each live handle records `starting`/`connected`/`failed` from `startConnection`'s `ready` outcome. The controller calls `sync()` after each mutation so status is deterministic.

</details>
