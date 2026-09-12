---
description: "Durable registry of user-added MCP servers: name, transport, and connection fields over the domain data form."
kind: "package-reference"
---

# @deepseek-ai/dsh-mcp-registry

English | [中文](README.zh.md)

## Summary

Use this package to keep a durable list of the external MCP servers a user has added: each record carries a stable server name, a stdio or Streamable HTTP transport, and its connection fields. It exposes `ctx.mcpRegistry` and requires the storage-domain facility; it owns no connections.

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

Use it when users must add and remove MCP servers themselves, and those records must survive a restart. Skip it when every server is fixed in `cordis.yml` as an `@deepseek-ai/dsh-mcp-client` row.

### Setting up

The package takes no configuration; it needs the storage-domain facility, which the shared base composition already mounts:

```yaml
- name: '@deepseek-ai/dsh-storage-domain'
- name: '@deepseek-ai/dsh-mcp-registry'
```

<a id="understand-the-implementation"></a>
## Understand the implementation

Records are durable, not discovered: nothing is read from the filesystem, and no connection is held here. Each record carries `serverName`, `enabled`, `transport`, the transport-specific connection fields, a per-call timeout, and an optional reconnect policy; stdio records store resolved defaults so consumers can spread them unchanged. The `mcp-manager` package reads these records and holds the live connections.

<a id="further-exploration"></a>
## Further Exploration

- [dsh-mcp-manager](../mcp-manager/README.md) — holds the live connections.
- [dsh-api-mcp-controller](../../api/mcp-controller/README.md) — the Remote face the browser reads this through.
- [storage-domain](../../storage/storage-domain/README.md) — the durable table facility.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package registers no prompt, tool, or session event.

#### KV Cache effect

Independent of live requests: this package never touches a request prefix, so it cannot invalidate provider cache reuse.

## Known Limitations and Deferred Work

- **No per-user ownership** — records are deployment-scoped; a per-user MCP list needs the tenancy primitive first.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

`McpRegistry` is a `Service` with `static inject = ['storageDomain']`, mirroring `@deepseek-ai/dsh-app-registry`. The durable form is one `mcp` domain at version 1 with a `servers` key-value table plus a `serverIds` order list. Every write serializes through an operation tail and emits `domain/changed`, which `mcp-manager` listens for.

</details>
