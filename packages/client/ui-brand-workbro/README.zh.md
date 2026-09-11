---
description: "WorkBro 品牌插件：用 WorkBro 标识与名称填充侧栏和 hero 的品牌 slot。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-workbro

[English](README.md) | 中文

## 概述

使用本包可以把随附的 DeepSeek 鱼标替换为 WorkBro 品牌：侧栏与 hero 的品牌标识 slot 显示一个圆角 "W" 徽标，侧栏品牌名称 slot 显示 WorkBro 名称。它不注册任何工具、提示或会话事件。

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

当产品呈现通用的侧栏与 hero 品牌 slot，且应当展示 WorkBro 品牌时使用。当应当保留官方 DeepSeek 品牌时跳过。

### 配置

本包无需配置。把它与声明品牌 slot 的包挂载在一起（`ui-sidebar`、`ui-conversation`）：

```yaml
- name: '@deepseek-ai/dsh-client-ui-sidebar'
- name: '@deepseek-ai/dsh-client-ui-conversation'
- name: '@deepseek-ai/dsh-client-ui-brand-workbro'
```

<a id="understand-the-implementation"></a>
## 理解实现

本插件只做三项注册，不含行为：两处填充 `sidebar.brand.mark` 与 `conversation.hero.brand.mark`，一处填充 `sidebar.brand.name`。两处标识共用同一个组件，因为再写一个近乎相同的组件会触发仓库的跨文件克隆门禁。node 半部是空 `apply`。

<a id="further-exploration"></a>
## 进一步探索

- [客户端包地图](../README.zh.md)——相邻的浏览器 UI 包。

-----

<a id="model-experience"></a>
## 模型体验

无——本包不注册任何提示、工具或会话事件。

#### KV Cache 影响

与实时请求无关：本包从不触碰请求前缀，因此不会破坏提供方的缓存复用。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **文本化标识**——该标识是样式化 "W" 字形，而非专门设计的 logo 素材；专用的 WorkBro logo 被推迟。
- **无 hero 动画**——hero 标识以静态徽标取代了动画鱼 fallback。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>供维护者查看的工作上下文——点击展开</summary>

两个品牌 slot 都是单次注册，且来自不同插件（侧栏两个来自 `ui-sidebar`，hero 徽标来自 `ui-conversation`），因此本插件向每一处注册同一个组件。名称字符串走 locale 字典而非字面量，这是客户端文案门禁的要求。

本包不发布运行时不变式伴生模块：它只注册组件，不含服务、事件或可变状态，因此不存在可独立观测而相互背离的关系。

</details>
