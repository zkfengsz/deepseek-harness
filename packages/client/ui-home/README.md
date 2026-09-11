---
description: "WorkBro application portal plugin: one card per app, registered into the blank-session hero."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-home

English | [中文](README.zh.md)

## Summary

Use this package to give the blank-session hero a full-width application portal: one card per recorded WorkBro app, each launching that app's session on click. It reads the app roster through the app controller's `apps` service and reports the pick to the owner's `onOpenApp`; it owns no host-side behavior and registers no tools, prompts, or session events.

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

Use it when the product shows a landing surface that lists applications as launchable workbenches. Skip it when there is no blank-session hero, or when the existing workspace picker already covers the surface.

### Setting up

The package takes no configuration. It registers into the `conversation.hero.apps` slot declared by `ui-conversation`, so a composition that mounts both packages shows the portal in the empty state.

```yaml
- name: '@deepseek-ai/dsh-client-ui-conversation'
- name: '@deepseek-ai/dsh-client-ui-home'
```

It also needs the app controller's shared `apps` service, which `dsh-api-app-controller` provides.

<a id="understand-the-implementation"></a>
## Understand the implementation

The portal renders and reports; it never starts a session. Opening a card calls `onOpenApp` with the app, and the owner — `ui-conversation` — stages the app's preset and starts the session the launch lands on: a new session in the app's bound workspace when it has one, otherwise `startSession()` on the current workspace. Creating an app is the same split: the portal's inline form calls the `apps` service, and the registry is the only authority for what exists.

<a id="further-exploration"></a>
## Further Exploration

- [ui-conversation](../ui-conversation/README.md) — declares the hero slot and owns the launch flow.
- [dsh-api-app-controller](../../api/app-controller/README.md) — the Remote face behind the `apps` service.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through the session an app launch composes; the app's preset owns every model-facing effect.

#### KV Cache effect

Independent of live requests: this package never touches a request prefix, so it cannot invalidate provider cache reuse.

## Known Limitations and Deferred Work

- **Cards carry no icon rendering yet** — the registry records an icon field, but the card shows the app name and its preset only; an icon pipeline is deferred.
- **No launch feedback in the portal** — a launch is reported to the owner and the card highlights, but the portal itself shows no pending or failure state; a refused preset surfaces through the preset surface's own banner.
- **No reordering UI** — the registry keeps a durable order and `insertBefore` moves one app, but no surface drags or moves a card yet.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The portal is one slot registrant and one service read. It renders into `conversation.hero.apps`, which `ui-conversation` declares with `{ kind: 'single', scope: 'root' }`, so the owner passes `onOpenApp` and `selectedAppId` at the render site and the portal keeps no session state. The app list arrives through the app controller's `apps` service (`hooks.apps`), which the renderer binds to `useApps`; card chrome uses the half-pixel hairline that the styling gate requires of hairline borders.

The portal decides the preset; the launched session's composition decides everything model-facing. `ui-conversation` hands the app's preset to the preset seat over the `workbroPresetLaunch` service, because a Cordis client event only trickles down from its emitting context and a sibling plugin never sees one.

</details>
