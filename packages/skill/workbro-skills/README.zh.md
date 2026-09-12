---
description: "WorkBro 内置业务 skill（技能）目录，供启用、使用或排查 WorkBro agent 所加载的八个领域行动手册的用户与维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-skill-workbro

[English](README.md) | 中文

## 概述

挂载该插件即可为 WorkBro agent 提供八个内置业务 skill——企业识别与核验、KYB 与查册、股权穿透与 UBO、风险筛查、信用评估、客户识别与分层、海外拓客以及持续监控与复审。每个 skill 都是一个领域行动手册：何时使用、调用哪个 MCP 工具族、操作步骤以及证据要求。这些 skill 按工具族引用 MCP 工具，而不是硬编码服务器名，因此可以配合用户在运行时添加的任意服务器使用。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

启用插件即可让八个 WorkBro skill 出现在会话 skill 目录中；随后模型可以像加载任何其他 skill 一样加载它们，并遵循各自的行动手册。

### 何时选择

当 WorkBro 组合（compliance、credit、risk 或 sales）应携带标准业务行动手册、而无需把它们存入本地 skill 目录时，选择此目录。当部署方自行编写 skill 或不需要内置业务目录时，请跳过。

### 挂载插件

该插件没有配置。把它的组合行加入一个已挂载 `dsh-skill`（注册表）和 `dsh-tool-skill`（模型访问）的组合中。

```yaml
- id: workbro-skills
  name: '@deepseek-ai/dsh-skill-workbro'
```

挂载后，八个 skill 会出现在会话目录的可用 skill 中，凭各自的 kebab-case 名称加载即可返回完整行动手册。

### 这些 skill 提供什么

- **八个领域行动手册。** `entity-resolution`、`kyb-registry`、`ubo-ownership`、`risk-screening`、`credit-assessment`、`customer-tiering`、`overseas-acquisition` 与 `continuous-monitoring`。
- **MCP 工具族路由。** 每个 skill 都指明要调用的 MCP 工具族（如 `mcp__*__*screening*`、`mcp__*__*ownership*`），而不硬编码服务器名。
- **证据与升级规则。** 每个 skill 都要求每条结论携带来源引用、硬规则优先于模型判断、模糊结果交由人工复核。

### 可观察的成功与失败

挂载插件会使八个 skill 出现在目录中并可凭名称加载；处置插件的 fiber 会移除它们。由于目录不可变，注册始终成功且恰好返回八个 skill，绝不会报告部分结果。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

本节解释内置目录如何接线；可观察行为已在[使用本包](#use-this-package)中完整说明。

### 设计理念

该插件是一个固定的、同步注册的运行时 skill 目录：它通过 `ctx.skills.register(...)` 注册八个 `SkillRegistration` 条目，每个都包在 `ctx.effect(...)` 中，因此插件 fiber 的处置会移除它。skill 正文以内联方式嵌入 `src/index.ts`；每个都使用 `bundled` 来源与注册表默认的 `runtime` 提供方。

### 源码地图

| 文件 | 职责 |
|---|---|
| [`src/index.ts`](src/index.ts) | 插件入口与八个内置 skill：名称、路由描述、正文以及注册循环 |
| — | 不发布运行时不变式伴生入口；本包只持有固定内容，注册唯一性与生命周期检查由 skill 注册表负责。 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

当包级约定不够用时，请阅读以下页面。这些页面先介绍该目录注册到的注册表，再说明 skill 如何到达模型。

- [skill 子系统参考](../../../docs/subsystems/skills.zh.md)——该目录所注册到的注册表与提供方约定。
- [skill 包](../skill/README.zh.md)——该目录所注册到的注册表，以及已加载 skill 的共享渲染。
- [tool-skill 包](../tool-skill/README.zh.md)——每个 skill 如何到达会话目录与模型。

-----

<a id="model-experience"></a>
## 模型体验

通过 `dsh-tool-skill` 间接影响模型；该包会把已注册 skill 的摘要渲染到持久会话目录中，并把每个已加载 skill 的正文渲染到保留的工具结果中。

#### KV Cache 影响

八个目录条目会在各自插入点改变会话目录的 KV 前缀，而每个已加载 skill 的正文会追加一个新的保留工具结果，而不是替换目录。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>


这些限制说明内置目录不做什么。它们是当前包约束，不是任务积压。

- **固定内容，无运行时自定义**——该目录恰好随附这八个行动手册；需要其他变体的部署请自行编写 skill，或直接注册到 `ctx.skills`。
- **不随附 MCP 服务器**——每个 skill 都按工具族引用 MCP 工具，因此在用户于运行时配置相应 MCP 服务器之前，行动手册无法执行其步骤。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
