---
description: "WorkBro 应用门户插件：每个应用一张卡片，注册进空白会话 hero。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-home

[English](README.md) | 中文

## 概述

使用本包可以为空白会话 hero 提供一个全宽的应用门户：已记录的每个 WorkBro 应用一张卡片，点击即启动该应用的会话。它通过 app controller 的 `apps` 服务读取应用名单，并把选择结果交给 owner 的 `onOpenApp`；它不持有任何宿主侧行为，也不注册任何工具、提示或会话事件。

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

### 何时使用

当产品需要一个落地界面、把应用列为可启动的工作台时使用。当没有空白会话 hero，或已有的工作区选择器已经覆盖该界面时跳过。

### 配置

本包无需配置。它注册进由 `ui-conversation` 声明的 `conversation.hero.apps` slot，因此同时挂载这两个包的组装会在空状态显示门户。

```yaml
- name: '@deepseek-ai/dsh-client-ui-conversation'
- name: '@deepseek-ai/dsh-client-ui-home'
```

它还需要 app controller 提供的共享 `apps` 服务，该服务由 `dsh-api-app-controller` 提供。

<a id="understand-the-implementation"></a>
## 理解实现

门户只负责渲染与上报，从不启动会话。点击卡片时以该应用调用 `onOpenApp`，由 owner——`ui-conversation`——暂存应用的 preset 并启动这次落地所在的会话：应用绑定了工作区时在该工作区新建会话，否则对当前工作区调用 `startSession()`。创建应用是同样的分工：门户的内联表单调用 `apps` 服务，而注册表是"存在什么"的唯一权威。

<a id="further-exploration"></a>
## 进一步探索

- [ui-conversation](../ui-conversation/README.zh.md)——声明 hero slot 并负责启动流程。
- [dsh-api-app-controller](../../api/app-controller/README.zh.md)——`apps` 服务背后的 Remote 接口。

-----

<a id="model-experience"></a>
## 模型体验

间接地——通过应用启动所组装的会话；应用的 preset 决定一切面向模型的内容。

#### KV Cache 影响

与实时请求无关：本包从不触碰请求前缀，因此不会破坏提供方的缓存复用。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **卡片尚未渲染图标**——注册表记录了图标字段，但卡片目前只显示应用名与它的 preset；图标管线被推迟。
- **门户内没有启动反馈**——启动会通知 owner，卡片也会高亮，但门户自身不显示进行中或失败状态；被拒绝的 preset 通过预设界面自身的横幅呈现。
- **没有重排界面**——注册表维护持久顺序，`insertBefore` 可以移动单个应用，但尚无界面支持拖动或移动卡片。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>供维护者查看的工作上下文——点击展开</summary>

门户是一个 slot 注册者加一次服务读取。它渲染进 `conversation.hero.apps`——由 `ui-conversation` 以 `{ kind: 'single', scope: 'root' }` 声明——因此 owner 在渲染点传入 `onOpenApp` 与 `selectedAppId`，门户自身不持有任何会话状态。应用名单经 app controller 的 `apps` 服务（`hooks.apps`）到达，由渲染层绑定为 `useApps`；卡片边框使用细线所要求的半像素细线。

门户决定 preset，被启动会话的组装决定一切面向模型的内容。`ui-conversation` 通过 `workbroPresetLaunch` 服务把应用的 preset 交给 preset seat，因为 Cordis 客户端事件只从其发射上下文向下渗透，兄弟插件看不到。

</details>
