---
description: "WorkBro application registry: durable first-class app records (name, icon, description, preset, optional workspace) over the domain data form."
kind: "package-reference"
---

# @deepseek-ai/dsh-app-registry

English | [中文](README.zh.md)

## Summary

Use this package to keep a durable, ordered list of WorkBro applications: first-class launchable workbenches, each with a display name, optional icon, description, and agent preset, plus an optional bound workspace that makes a directory its data context. It exposes `ctx.appRegistry` and requires the storage-domain facility.

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

Use it when the product surfaces applications as first-class objects independent of any single directory — a domain expert opened with or without a bound workspace. Skip it when a plain workspace list already covers the surface.

### Setting up

The package takes no configuration; it needs the storage-domain facility, which the shared base composition already mounts:

```yaml
- name: '@deepseek-ai/dsh-storage-domain'
- name: '@deepseek-ai/dsh-app-registry'
```

<a id="understand-the-implementation"></a>
## Understand the implementation

Applications are recorded, not discovered: nothing on disk declares one, and no directory is read to list them. Each record carries the agent preset a launch composes the session from and, optionally, the workspace whose directory becomes the launch's data context. The workspace is a reference the record holds; the registry never moves or creates one.

<a id="further-exploration"></a>
## Further Exploration

- [dsh-api-app-controller](../../api/app-controller/README.md) — the Remote face the browser reads this registry through.
- [storage-domain](../../storage/storage-domain/README.md) — the durable table facility this package is stored in.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package registers no prompt, tool, or session event.

#### KV Cache effect

Independent of live requests: this package never touches a request prefix, so it cannot invalidate provider cache reuse.

## Known Limitations and Deferred Work

- **No manifest file** — an app's icon, description, and preset live in the registry's own fields; a per-directory `workbro.app.yml` that a repository could carry alongside its code is deferred.
- **Workspace binding does not create anything** — `bindWorkspace` records a reference and fails loud on an unknown workspace; creating the directory or its first session belongs to the launch flow.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

`AppRegistry` is a `Service` with `static inject = ['storageDomain']`, so it reads the domain facility the base composition mounts rather than a constructor argument. The durable form is one `app` domain at version 1 with an `apps` key-value table plus an `appIds` order list in the domain's global section; members are branded `AppId` values minted from random UUIDs.

Reads return the domain's own records, and every write goes through the domain table's `put`, so an edit is durable before it is observable. Order is separate state: `insertBefore` rewrites the order list alone, which is why deleting an app leaves no gap to compact.

</details>
