---
description: "Web GUI 的 MCP 服务器设置分区：通过共享的 mcpServers 客户端服务列出、添加、编辑和删除用户添加的 MCP 服务器。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-mcp-servers

[English](README.md) | 中文

## 概述

使用本包可以让用户在 Web GUI 的设置中自助管理 MCP 服务器。它新增一个「MCP 服务器」分区，列出每个用户添加的服务器及其传输方式与连接状态，并提供内联表单来添加或编辑——stdio 需要命令、参数、环境变量和工作目录，streamable-http 需要 url 和请求头。每次改动都通过共享的 `mcpServers` 客户端服务写入；浏览器自身不持有名单。

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

与设置外壳和 MCP 控制器的客户端半边一起挂载本插件。分区会出现在设置中，顺序紧跟在 Agent 预设之后。

```yaml
- name: '@deepseek-ai/dsh-client-ui-settings'
- name: '@deepseek-ai/dsh-client-ui-agent-preset'
- name: '@deepseek-ai/dsh-client-ui-mcp-servers'
```

它读取由 `dsh-api-mcp-controller` 提供的 `mcpServers` 服务，无需任何配置。

<a id="understand-the-implementation"></a>
## 理解实现

分区注册进 `settings.section`，通过注入的 `hooks.servers` 源（绑定为 `useServers`）接收共享的服务器快照，并获得 `create`/`update`/`delete` 回调与一个绑定好的翻译函数。打开中的表单作为组件本地状态保存，提交时构造 `McpServerCreateRequest`：args/env/headers 文本框被拆分成数组与记录，被拒绝的提交则把拒绝原因显示为错误信息。名单本身位于控制器服务的快照中，因此每次写入后分区都会从该源重新渲染。

<a id="further-exploration"></a>
## 进一步探索

- [dsh-api-mcp-controller](../../api/mcp-controller/README.zh.md) — Remote 接口与客户端 `mcpServers` 服务。
- [ui-settings](../ui-settings/README.zh.md) — 承载该分区的设置外壳。

-----

<a id="model-experience"></a>
## 模型体验

无，本包不注册任何提示、工具或会话事件。

#### KV Cache 影响

无：本包从不触碰请求前缀。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **没有删除确认** — 删除操作会立即移除服务器；持久化注册表是唯一权威，误操作在浏览器侧没有撤销。
- **没有字段校验** — 表单提交所输入的内容，并把宿主的拒绝显示为错误字符串；客户端必填校验被推迟。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>供维护者查看的工作上下文——点击展开</summary>

分区是一个 slot 注册者加一次服务读取。它渲染进 `settings.section`，`id: 'mcp-servers'`、`order: 21`，紧跟在 Agent 预设之后。名单通过 `hooks.servers`（控制器的 `mcpServers.list` 源）到达，注入面只携带普通回调加一个绑定好的翻译函数；组件永远看不到上下文。状态值通过判别键映射到本地化字符串，绝不匹配本地化文本。

</details>
