---
description: "用户自行添加的 MCP 服务器的持久注册表：名称、传输方式与连接字段，基于 domain 数据形态。"
kind: "package-reference"
---

# @deepseek-ai/dsh-mcp-registry

[English](README.md) | 中文

## 概述

使用本包可以维护一份用户已添加的外部 MCP 服务器持久列表：每条记录携带稳定的服务器名称、stdio 或 Streamable HTTP 传输方式及其连接字段。它导出 `ctx.mcpRegistry` 并依赖 storage-domain 设施；本包不持有任何连接。

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

当用户需要自行增删 MCP 服务器、且这些记录要跨重启保留时使用。当每个服务器都固定写死在 `cordis.yml` 的 `@deepseek-ai/dsh-mcp-client` 行里时跳过。

### 配置

本包无需配置；它需要 storage-domain 设施，而共享的基础组装已经挂载：

```yaml
- name: '@deepseek-ai/dsh-storage-domain'
- name: '@deepseek-ai/dsh-mcp-registry'
```

<a id="understand-the-implementation"></a>
## 理解实现

记录是"被持久化"的，不是"被发现"的：不读取任何文件系统，也不在这里持有连接。每条记录携带 `serverName`、`enabled`、`transport`、传输相关的连接字段、单次调用超时以及可选的重连策略；stdio 记录存储已解析的默认值，以便消费方直接展开使用。`mcp-manager` 包读取这些记录并持有实时连接。

<a id="further-exploration"></a>
## 进一步探索

- [dsh-mcp-manager](../mcp-manager/README.zh.md)——持有实时连接。
- [dsh-api-mcp-controller](../../api/mcp-controller/README.zh.md)——浏览器读取本注册表所用的 Remote 接口。
- [storage-domain](../../storage/storage-domain/README.zh.md)——持久表设施。

-----

<a id="model-experience"></a>
## 模型体验

无——本包不注册任何提示、工具或会话事件。

#### KV Cache 影响

与实时请求无关：本包从不触碰请求前缀，因此不会破坏提供方的缓存复用。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **没有按用户归属**——记录是部署级的；按用户划分的 MCP 列表需要先有租户原语。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>供维护者查看的工作上下文——点击展开</summary>

`McpRegistry` 是一个带 `static inject = ['storageDomain']` 的 `Service`，镜像 `@deepseek-ai/dsh-app-registry`。持久形态是版本 1 的单个 `mcp` domain：一张 `servers` 键值表加一份 `serverIds` 顺序列表。每次写入都经操作串行队列，并发出 `domain/changed`，由 `mcp-manager` 监听。

</details>
