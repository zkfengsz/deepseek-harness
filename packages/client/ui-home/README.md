---
description: "WorkBro application portal plugin: one Workspace card per app, registered into the blank-session hero."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-home

## Summary

Use this package to give the blank-session hero a full-width application portal: one card per Workspace showing its title, directory path, and session count, opening the Workspace's blank session on click. It reads the global `useWorkspaces` standard hook and the owner's `onOpen` callback; it owns no host-side behavior and registers no tools, prompts, or session events.

## Use this package

### When to use it

Use it when the product shows a landing surface that lists Workspaces as launchable applications. Skip it when there is no blank-session hero or when the existing workspace picker already covers the surface.

### Setting up

The package takes no configuration. It registers into the `conversation.hero.apps` slot declared by `ui-conversation`, so a composition that mounts both packages shows the portal in the empty state.

```yaml
- name: '@deepseek-ai/dsh-client-ui-conversation'
- name: '@deepseek-ai/dsh-client-ui-home'
```

## Model Experience

None, as the portal is a pure presentation surface over the Workspace controller and registers no tools, prompts, or session events.

### KV Cache effect

Independent of live requests: this package never touches a request prefix, so it cannot invalidate provider cache reuse.

## Known Limitations and Deferred Work

- **Portal cards carry no application metadata yet** — a card shows only the Workspace title, path, and session count; a `workbro.app.yml` manifest (icon, description, preset) is deferred to a later increment.
- **No launch feedback** — opening a Workspace relies entirely on the owner's `onOpen`; the portal shows no pending or error state of its own.
