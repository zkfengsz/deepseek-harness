---
description: "WorkBro brand plugin: fills the sidebar and hero brand slots with the WorkBro mark and name."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-workbro

English | [中文](README.zh.md)

## Summary

Use this package to replace the shipped DeepSeek fish branding with the WorkBro brand: a rounded "W" monogram in the sidebar and hero brand-mark slots and the WorkBro name in the sidebar brand-name slot. It registers no tools, prompts, or session events.

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

Use it when the product surfaces the generic sidebar and hero brand slots and should present the WorkBro brand. Skip it when the official DeepSeek branding should remain.

### Setting up

The package takes no configuration. Mount it beside the packages that declare the brand slots (`ui-sidebar`, `ui-conversation`):

```yaml
- name: '@deepseek-ai/dsh-client-ui-sidebar'
- name: '@deepseek-ai/dsh-client-ui-conversation'
- name: '@deepseek-ai/dsh-client-ui-brand-workbro'
```

<a id="understand-the-implementation"></a>
## Understand the implementation

The plugin contributes three registrations and no behavior: two fills for `sidebar.brand.mark` and `conversation.hero.brand.mark`, and one name for `sidebar.brand.name`. The mark is one component shared by both marks, because a second near-identical one trips the repository's cross-file clone gate. The node half is an inert `apply`.

<a id="further-exploration"></a>
## Further Exploration

- [Client package map](../README.md) — adjacent browser UI packages.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package registers no prompt, tool, or session event.

#### KV Cache effect

Independent of live requests: this package never touches a request prefix, so it cannot invalidate provider cache reuse.

## Known Limitations and Deferred Work

- **Text-based mark** — the mark is a styled "W" glyph, not authored logo artwork; a dedicated WorkBro logo is deferred.
- **No hero animation** — the hero mark replaces the animated fish fallback with a static monogram.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Both brand slots are single-registration and arrive from different plugins (`ui-sidebar` for the sidebar pair, `ui-conversation` for the hero mark), so the plugin registers the same component into each. The name string goes through the locale dictionary rather than a literal, which the client copy gate requires.

No runtime invariant companion is published: the package registers components and no service, event, or mutable state, so there is nothing whose independent observations could diverge.

</details>
