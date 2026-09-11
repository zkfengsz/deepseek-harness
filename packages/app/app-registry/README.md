---
description: "WorkBro application registry: durable first-class app records (name, icon, description, preset, optional workspace) over the domain data form."
kind: "package-reference"
---

# @deepseek-ai/dsh-app-registry

## Summary

Use this package to keep a durable, ordered list of WorkBro applications: first-class launchable workbenches, each with a display name, optional icon, description, and agent preset, plus an optional bound workspace that makes a directory its data context. It exposes `ctx.appRegistry` and requires the storage-domain facility.

## Use this package

### When to use it

Use it when the product surfaces applications as first-class objects independent of any single directory — a domain expert (合规/信用/KYB/拓客) opened with or without a bound workspace. Skip it when a plain workspace list already covers the surface.

### Setting up

The package takes no configuration; it needs the storage-domain facility, which the shared base composition already mounts:

```yaml
- name: '@deepseek-ai/dsh-storage-domain'
- name: '@deepseek-ai/dsh-app-registry'
```

## Model Experience

None, as the app registry is host-side durable state and registers no tools, prompts, or session events.

### KV Cache effect

Independent of live requests: this package never touches a request prefix, so it cannot invalidate provider cache reuse.

## Known Limitations and Deferred Work

- **No remote API or UI yet** — this package exposes only the host `ctx.appRegistry`; the browser-facing controller, portal cards, and preset staging are deferred to later increments.
