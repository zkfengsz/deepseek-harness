---
description: "MCP 服务器的 Remote 命令与状态，运行于 mcp 注册表与管理器之上。"
kind: "package-reference"
---

# @deepseek-ai/dsh-api-mcp-controller

[English](README.md) | 中文

## 概述

使用本包可以把 MCP 服务器注册表以 Remote 命令暴露给浏览器：`list`、`create`、`update` 与 `delete`，每条都附实时连接状态。宿主半部声明 `remote.mcp` 命名空间；客户端半部提供 `ctx.mcpServers`。

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

当浏览器界面需要列出、新增、编辑或删除已记录的 MCP 服务器时使用。当宿主之外无需该名单时跳过。

### 配置

把它与注册表及管理器一起挂载；浏览器组装通过 `dsh-api-remotes` 挂载客户端半部：

```yaml
- name: '@deepseek-ai/dsh-mcp-registry'
- name: '@deepseek-ai/dsh-mcp-manager'
- name: '@deepseek-ai/dsh-api-mcp-controller'
```

<a id="understand-the-implementation"></a>
## 理解实现

每个方法都是对注册表的一次命令，随后做一次管理器重新对齐，因此返回的状态反映该次写入刚产生的连接。扁平的网络请求会被校验成注册表的判别输入：stdio 请求缺 `command`、或 Streamable HTTP 请求缺 `url`，都会以 `gateway/bad-request` 失败。客户端半部把生成的 `remote.mcp` 包成 `Service`，并在每次变更后刷新快照。

<a id="further-exploration"></a>
## 进一步探索

- [dsh-mcp-registry](../../mcp/mcp-registry/README.zh.md)——持久记录。
- [dsh-mcp-manager](../../mcp/mcp-manager/README.zh.md)——实时连接。
- [dsh-api-app-controller](../app-controller/README.zh.md)——本包参照的同类 Remote 属主。

-----

<a id="model-experience"></a>
## 模型体验

无——本包不注册任何提示、工具或会话事件。

#### KV Cache 影响

与实时请求无关：本包从不触碰请求前缀，因此不会破坏提供方的缓存复用。

## 已知限制与延期工作

- **除 `enabled` 外没有独立的启停开关**——启用/禁用都走 `update`，调用方需重发完整请求而不是一个专用开关。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>供维护者查看的工作上下文——点击展开</summary>

`McpController` 是一个 `TypertRemoteService`，以 `static inject = ['typert', 'mcpRegistry', 'mcpManager']` 声明；Typert 生成器产出 `lib/typert.host.js` 与浏览器契约 `lib/typert.remote-client.js`。宿主入口不导入任何 `@deepseek-ai/dsh-mcp-registry` 值——id brand 是纯类型转换、线上类型已携带——因此该边保持仅类型，无需进入 `SAFE_HOST_DEPENDENCY_EXPORTS`。

</details>
