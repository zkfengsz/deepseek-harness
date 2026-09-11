---
description: "WorkBro application Remote commands over the app registry: list, create, rename, bind a workspace, delete, reorder."
kind: "package-reference"
---

# @deepseek-ai/dsh-api-app-controller

English | [中文](README.zh.md)

## Summary

Use this package to expose the app registry to the browser as explicit Remote commands: `list`, `create`, `rename`, `bindWorkspace`, `delete`, and `insertBefore`. The Host half declares the service whose generated namespace is `remote.app`; the Client half provides `AppsService` as `ctx.apps`, the roster the portal reads.

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

Use it when a browser surface must read or change the recorded WorkBro apps. Skip it when nothing outside the Host needs the roster; the registry is reachable in-process through `ctx.appRegistry`.

### Setting up

The package takes no configuration. Mount it beside the registry, and the browser assembly mounts the Client half through `dsh-api-remotes`:

```yaml
- name: '@deepseek-ai/dsh-app-registry'
- name: '@deepseek-ai/dsh-api-app-controller'
```

The Client half needs `@deepseek-ai/dsh-api-remotes` to `$mount` its generated contract, which is what makes `remote.app` resolvable in the page.

<a id="understand-the-implementation"></a>
## Understand the implementation

Each method is one explicit command over the registry and returns a projected `AppView`, so the browser never sees a registry record directly and never holds one it could mutate. The registry stays the only authority: this package stores nothing, and a command that names an unknown app fails loud as `app/not-found` rather than reporting an empty success.

The Client half wraps the generated `remote.app` namespace in a `Service` so a slot registrant reads the roster through one injectable value rather than calling the transport directly.

<a id="further-exploration"></a>
## Further Exploration

- [dsh-app-registry](../../app/app-registry/README.md) — the durable records these commands address.
- [dsh-api-workspace-controller](../workspace-controller/README.md) — the sibling Remote owner this package is modelled on.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package registers no prompt, tool, or session event.

#### KV Cache effect

Independent of live requests: this package never touches a request prefix, so it cannot invalidate provider cache reuse.

## Known Limitations and Deferred Work

- **No ownership or sharing model** — every app in the roster is visible to every browser session; per-user apps and grants are deferred.
- **No icon pipeline** — the record's icon field crosses the wire, but nothing uploads, stores, or renders an image for it yet.
- **`insertBefore` moves one app at a time** — a multi-app reorder is a sequence of calls from the caller, not one transactional command.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

`AppController` is a `TypertRemoteService` declared with `static inject = ['typert', 'appRegistry']`. The Typert generator reads its `@Remote` methods and emits `lib/typert.host.js` plus the browser contract in `lib/typert.remote-client.js`; the property name given to the base constructor (`appController`) is the Cordis service name, while the namespace (`app`) is what the browser sees as `remote.app`. The package ships `zod` as a runtime dependency because the generated host contract imports it.

The Host entry imports no `AppId` at runtime: the brand is a pure cast, the request types already carry it, and keeping the registry edge type-only avoids an entry in `SAFE_HOST_DEPENDENCY_EXPORTS`, which automated changes must not extend.

No runtime invariant companion is published: the registry owns the durable relationship and this package only forwards commands, so there is no second observation to diverge.

</details>
