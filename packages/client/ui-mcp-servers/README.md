---
description: "MCP servers Settings section for the Web GUI: list, add, edit, and delete user-added MCP servers over the shared mcpServers client service."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-mcp-servers

English | [中文](README.zh.md)

## Summary

Use this package to let users self-serve MCP servers from the Web GUI Settings. It adds an "MCP servers" section that lists each user-added server with its transport and connection status, and an inline form to add or edit one — command, args, env, and working directory for stdio, or url and headers for streamable-http. Every change writes through the shared `mcpServers` client service; the browser holds no roster of its own.

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

Mount this plugin alongside the settings shell and the MCP controller's client half. The section appears in Settings, ordered right after Agent presets.

```yaml
- name: '@deepseek-ai/dsh-client-ui-settings'
- name: '@deepseek-ai/dsh-client-ui-agent-preset'
- name: '@deepseek-ai/dsh-client-ui-mcp-servers'
```

It reads the `mcpServers` service provided by `dsh-api-mcp-controller` and takes no configuration.

<a id="understand-the-implementation"></a>
## Understand the implementation

The section registers into `settings.section` and receives the shared server snapshot through an injected `hooks.servers` source (bound as `useServers`), plus `create`/`update`/`delete` callbacks and a bound translate. It keeps the open form as local component state and builds a `McpServerCreateRequest` on submit: the args/env/headers textareas are split into arrays and records, and a refused submission is shown as the rejection's message. The list itself lives in the controller's service snapshot, so the section re-renders from that source after every write.

<a id="further-exploration"></a>
## Further Exploration

- [dsh-api-mcp-controller](../../api/mcp-controller/README.md) — the Remote face and client `mcpServers` service.
- [ui-settings](../ui-settings/README.md) — the settings shell that hosts the section.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package registers no prompt, tool, or session event.

#### KV Cache effect

None: this package never touches a request prefix.

## Known Limitations and Deferred Work

- **No delete confirmation** — the delete action removes the server immediately; the durable registry is the only authority and a mistake has no browser-side undo.
- **No field validation** — the form submits whatever is typed and surfaces the host's refusal as an error string; client-side required-field checks are deferred.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The section is one slot registrant over one service read. It renders into `settings.section` with `id: 'mcp-servers'` and `order: 21`, right after Agent presets. The list arrives through `hooks.servers` (the controller's `mcpServers.list` source), and the inject face carries only plain callbacks plus a bound translate; the component never sees a context. Status values map to locale strings through a discriminant-keyed record, never by matching localized text.

</details>
