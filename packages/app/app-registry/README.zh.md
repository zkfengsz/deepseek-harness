---
description: "WorkBro 应用注册表：基于 domain 数据形态的持久化一等应用记录（名称、图标、描述、preset、可选工作区）。"
kind: "package-reference"
---

# @deepseek-ai/dsh-app-registry

[English](README.md) | 中文

## 概述

使用本包可以维护一份持久且有序的 WorkBro 应用清单：一等、可启动的工作台，每条记录带显示名称、可选图标、描述与 agent preset，并可绑定一个工作区，让某个目录成为它的数据上下文。它导出 `ctx.appRegistry`，并依赖 storage-domain 设施。

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

当产品把应用作为独立于任何单一目录的一等对象呈现时使用——一个可绑定工作区、也可不绑定的领域专家。当一份普通的工作区列表已经覆盖该界面时跳过。

### 配置

本包无需配置；它需要 storage-domain 设施，而共享的基础组装已经挂载：

```yaml
- name: '@deepseek-ai/dsh-storage-domain'
- name: '@deepseek-ai/dsh-app-registry'
```

<a id="understand-the-implementation"></a>
## 理解实现

应用是"被记录"的，而非"被发现"的：磁盘上没有任何文件声明一个应用，列举它们也不读取任何目录。每条记录携带启动时用于组装会话的 agent preset，并可选携带一个工作区，其目录成为这次启动的数据上下文。工作区只是记录持有的一次引用；注册表既不移动也不创建它。

<a id="further-exploration"></a>
## 进一步探索

- [dsh-api-app-controller](../../api/app-controller/README.zh.md)——浏览器读取本注册表所用的 Remote 接口。
- [storage-domain](../../storage/storage-domain/README.zh.md)——本包所存放的持久表设施。

-----

<a id="model-experience"></a>
## 模型体验

无——本包不注册任何提示、工具或会话事件。

#### KV Cache 影响

与实时请求无关：本包从不触碰请求前缀，因此不会破坏提供方的缓存复用。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **没有清单文件**——应用的图标、描述与 preset 存放在注册表自身的字段里；让仓库随代码携带的按目录 `workbro.app.yml` 被推迟。
- **工作区绑定不创建任何东西**——`bindWorkspace` 只记录引用，遇到未知工作区即显式失败；创建目录或它的首个会话属于启动流程。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>供维护者查看的工作上下文——点击展开</summary>

`AppRegistry` 是一个 `Service`，带 `static inject = ['storageDomain']`，因此它读取基础组装挂载的 domain 设施，而不是接收构造参数。持久形态是版本 1 的单个 `app` domain：一张 `apps` 键值表，加上该 domain 全局段中的 `appIds` 顺序列表；成员是由随机 UUID 铸造的 `AppId` 品牌值。

读取返回 domain 自身的记录，每次写入都经 domain 表的 `put`，因此改动在可被观测之前就已持久化。顺序是独立状态：`insertBefore` 只重写顺序列表，这也是删除应用后不需要压缩空洞的原因。

</details>
