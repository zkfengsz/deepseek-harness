---
description: "WorkBro brand plugin: fills the sidebar and hero brand slots with the WorkBro mark and name."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-workbro

## Summary

Use this package to replace the shipped DeepSeek fish branding with the WorkBro brand: a rounded "W" monogram in the sidebar and hero brand-mark slots and the WorkBro name in the sidebar brand-name slot. It registers no tools, prompts, or session events.

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

## Model Experience

None, as the brand plugin is a pure presentation surface and registers no tools, prompts, or session events.

### KV Cache effect

Independent of live requests: this package never touches a request prefix, so it cannot invalidate provider cache reuse.

## Known Limitations and Deferred Work

- **Text-based mark** — the mark is a plain "W" glyph, not authored logo artwork; a dedicated WorkBro logo is deferred.
- **No hero animation** — the hero mark replaces the animated fish fallback with a static monogram.
