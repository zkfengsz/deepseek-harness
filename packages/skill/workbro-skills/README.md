---
description: "The WorkBro embedded business skill catalog for users and maintainers enabling, using, or debugging the eight domain playbooks WorkBro agents load."
kind: "package-reference"
---

# @deepseek-ai/dsh-skill-workbro

English | [中文](README.zh.md)

## Summary

Mount this plugin to give WorkBro agents eight embedded business skills — entity resolution, KYB and official records, UBO ownership, risk screening, credit assessment, customer tiering, overseas acquisition, and continuous monitoring. Each skill is a domain playbook: when to use it, which MCP tool family to call, the procedure, and the evidence requirement. Skills reference MCP tools by family instead of hard-coding a server name, so they work with any server a user adds at runtime.

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

Enable the plugin to make eight WorkBro skills available in the session skill catalog; the model can then load each one like any other skill and follow its playbook.

### When to choose it

Choose this catalog when a WorkBro composition (compliance, credit, risk, or sales) should carry the standard business playbooks without storing them in a local skill directory. Skip it when a deployment authors its own skills or wants no embedded business catalog.

### Mount the plugin

The plugin has no configuration. Add its composition row to a composition that already mounts `dsh-skill` (the registry) and `dsh-tool-skill` (model access).

```yaml
- id: workbro-skills
  name: '@deepseek-ai/dsh-skill-workbro'
```

After mounting, the eight skills appear in the available skills of the session catalog, and loading one by its kebab-case name returns its full playbook.

### What the skills provide

- **Eight domain playbooks.** `entity-resolution`, `kyb-registry`, `ubo-ownership`, `risk-screening`, `credit-assessment`, `customer-tiering`, `overseas-acquisition`, and `continuous-monitoring`.
- **MCP tool-family routing.** Each skill names the MCP tool family to call (`mcp__*__*screening*`, `mcp__*__*ownership*`, and so on) without hard-coding a server name.
- **Evidence and escalation rules.** Every skill requires a source reference for each finding, hard rules over model judgment, and human review for ambiguous results.

### Observable success and failures

Mounting the plugin makes the eight skills appear in the catalog and loadable by name; disposing the plugin's fiber removes them. Because the catalog is immutable, registration always succeeds with exactly eight skills and never reports partial results.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

This section explains how the embedded catalog is wired; the observable behavior is fully covered in [Use this package](#use-this-package).

### Design concept

The plugin is a fixed, synchronously registered runtime skill catalog: it registers eight `SkillRegistration` entries through `ctx.skills.register(...)`, each wrapped in `ctx.effect(...)` so the plugin fiber's disposal removes it. The skill bodies are embedded inline in `src/index.ts`; each uses the `bundled` source and the registry's default `runtime` provider.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Plugin entry and the eight embedded skills: names, routing descriptions, bodies, and the registration loop |
| — | No runtime invariant companion is published; the package owns fixed content, while the skill registry owns registration uniqueness and lifecycle checks. |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these pages when the package-level contract is not enough. They move from the registry this catalog registers on to how a skill reaches the model.

- [Skill subsystem reference](../../../docs/subsystems/skills.md) — the registry and provider contract this catalog registers against.
- [skill package](../skill/README.md) — the registry the catalog registers on, and the shared rendering of loaded skills.
- [tool-skill package](../tool-skill/README.md) — how each skill reaches the session catalog and the model.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through `dsh-tool-skill`, which renders the registered skill summaries into the durable session catalog and each loaded skill body into a retained tool result.

#### KV Cache effect

The eight catalog entries change the session-catalog KV prefix at their insertion point, and each loaded skill body appends a new retained tool result rather than replacing the catalog.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define what the embedded catalog does not do. They are current package constraints, not a task backlog.

- **Fixed content, no runtime customization** — the catalog ships exactly these eight playbooks; deployments that need another variant author their own skill or register it directly on `ctx.skills`.
- **No bundled MCP servers** — every skill names MCP tools by family, so a playbook cannot run its procedure until the user configures the corresponding MCP servers at runtime.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
