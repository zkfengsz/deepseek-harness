---
description: "为注册表中每个启用的 MCP 服务器持有一条受监管连接，让用户能在运行时增删服务器。"
kind: "package-reference"
---

# @deepseek-ai/dsh-mcp-manager

[English](README.md) | 中文

## 概述

使用本包可以为 MCP 注册表中每个启用的服务器持有一条实时、受监管的连接。它会随记录变化启动/停止连接，并复用 `@deepseek-ai/dsh-mcp-client` 的连接、重连与工具注册逻辑。它导出 `ctx.mcpManager`。

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

当服务器在运行时增删、因而需要把连接与持久注册表对齐时使用。当每个服务器都是固定的 `cordis.yml` 行时跳过。

### 配置

把它与注册表及工具注册表挂载在一起：

```yaml
- name: '@deepseek-ai/dsh-tools'
- name: '@deepseek-ai/dsh-mcp-registry'
- name: '@deepseek-ai/dsh-mcp-manager'
```

<a id="understand-the-implementation"></a>
## 理解实现

本包做的是"对齐"而非"配置"：它读取 `ctx.mcpRegistry.list()`，为每个启用的记录持有一个 `startConnection` 句柄，并释放被删除或禁用记录的句柄。每次写入后由变更路径重新对齐，管理器还监听 `mcp` domain 的 `domain/changed`。工具名遵循客户端的 `mcp__<serverName>__<tool>` 契约，重复的 `serverName` 会让新连接失败而不是让旧连接失败。

<a id="further-exploration"></a>
## 进一步探索

- [dsh-mcp-client](../mcp-client/README.zh.md)——本包复用的连接与重连逻辑。
- [dsh-mcp-registry](../mcp-registry/README.zh.md)——持久记录。

-----

<a id="model-experience"></a>
## 模型体验

间接地——通过已连接的 MCP 服务器，其工具以 `mcp__<serverName>__<tool>` 形式出现在模型目录中。

#### KV Cache 影响

每个已连接服务器的工具定义都会给模型请求增加 token；增删服务器会改变目录，从而改变下一轮的请求前缀。

## 已知限制与延期工作

- **状态是粗粒度的**——`states()` 只反映首次连接结果；之后的重连掉线要到下一次对齐才会呈现。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>供维护者查看的工作上下文——点击展开</summary>

`McpManager` 是一个带 `static inject = ['mcpRegistry', 'tools']` 的 `Service`。`sync()` 通过 promise 串行队列串行化对齐；每个存活句柄根据 `startConnection` 的 `ready` 结果记录 `starting`/`connected`/`failed`。控制器在每次变更后调用 `sync()`，使状态确定。

</details>
