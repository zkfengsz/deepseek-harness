---
description: "MCP server Remote commands and state over the mcp registry and manager."
kind: "package-reference"
---

# @deepseek-ai/dsh-api-mcp-controller

English | [中文](README.zh.md)

## Summary

Use this package to expose the MCP server registry to the browser as Remote commands: `list`, `create`, `update`, and `delete`, each projected with a live connection status. The Host half declares the `remote.mcp` namespace; the Client half provides `ctx.mcpServers`.

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

Use it when a browser surface must list, add, edit, or remove the recorded MCP servers. Skip it when nothing outside the Host needs the roster.

### Setting up

Mount it beside the registry and the manager; the browser assembly mounts the Client half through `dsh-api-remotes`:

```yaml
- name: '@deepseek-ai/dsh-mcp-registry'
- name: '@deepseek-ai/dsh-mcp-manager'
- name: '@deepseek-ai/dsh-api-mcp-controller'
```

<a id="understand-the-implementation"></a>
## Understand the implementation

Each method is one command over the registry and then a manager re-sync, so the returned status reflects the connection the write just produced. The flat wire request is validated into the registry's discriminated input: a stdio request without a `command`, or a Streamable HTTP request without a `url`, fails as `gateway/bad-request`. The Client half wraps the generated `remote.mcp` in a `Service` and refreshes its snapshot after each mutation.

<a id="further-exploration"></a>
## Further Exploration

- [dsh-mcp-registry](../../mcp/mcp-registry/README.md) — the durable records.
- [dsh-mcp-manager](../../mcp/mcp-manager/README.md) — the live connections.
- [dsh-api-app-controller](../app-controller/README.md) — the sibling Remote owner this is modelled on.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package registers no prompt, tool, or session event.

#### KV Cache effect

Independent of live requests: this package never touches a request prefix, so it cannot invalidate provider cache reuse.

## Known Limitations and Deferred Work

- **No per-server enable toggle on the wire beyond `enabled`** — enabling or disabling rides `update`, so a caller re-sends the full request rather than a dedicated toggle.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

`McpController` is a `TypertRemoteService` with `static inject = ['typert', 'mcpRegistry', 'mcpManager']`; the Typert generator emits `lib/typert.host.js` and the browser contract `lib/typert.remote-client.js`. The Host entry imports no `@deepseek-ai/dsh-mcp-registry` value — the id brand is a pure cast the wire types already carry — which keeps that edge type-only and out of `SAFE_HOST_DEPENDENCY_EXPORTS`.

</details>
