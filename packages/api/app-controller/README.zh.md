---
description: "在应用注册表之上的 WorkBro 应用 Remote 命令：列举、创建、重命名、绑定工作区、删除、重排。"
kind: "package-reference"
---

# @deepseek-ai/dsh-api-app-controller

[English](README.md) | 中文

## 概述

使用本包可以把应用注册表以显式 Remote 命令的形式暴露给浏览器：`list`、`create`、`rename`、`bindWorkspace`、`delete` 与 `insertBefore`。宿主半部声明服务，其生成的命名空间为 `remote.app`；客户端半部提供 `AppsService` 作为 `ctx.apps`，也就是门户读取的名单。

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

当浏览器界面需要读取或修改已记录的 WorkBro 应用时使用。当宿主之外无需该名单时跳过；在进程内可以通过 `ctx.appRegistry` 访问注册表。

### 配置

本包无需配置。把它与注册表一起挂载，浏览器组装会通过 `dsh-api-remotes` 挂载客户端半部：

```yaml
- name: '@deepseek-ai/dsh-app-registry'
- name: '@deepseek-ai/dsh-api-app-controller'
```

客户端半部需要 `@deepseek-ai/dsh-api-remotes` 来 `$mount` 它生成的契约，这正是页面中 `remote.app` 可被解析的原因。

<a id="understand-the-implementation"></a>
## 理解实现

每个方法都是对注册表的一次显式命令，并返回投影后的 `AppView`，因此浏览器永远看不到注册表记录本身，也不会持有可以就地修改的对象。注册表始终是唯一权威：本包不存储任何东西，命名了未知应用的命令会以 `app/not-found` 显式失败，而不是报告一次空的成功。

客户端半部把生成的 `remote.app` 命名空间包装成 `Service`，使 slot 注册者通过一个可注入值读取名单，而不必直接调用传输层。

<a id="further-exploration"></a>
## 进一步探索

- [dsh-app-registry](../../app/app-registry/README.zh.md)——这些命令所指向的持久记录。
- [dsh-api-workspace-controller](../workspace-controller/README.zh.md)——本包所参照的同类 Remote 属主。

-----

<a id="model-experience"></a>
## 模型体验

无——本包不注册任何提示、工具或会话事件。

#### KV Cache 影响

与实时请求无关：本包从不触碰请求前缀，因此不会破坏提供方的缓存复用。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **没有归属与共享模型**——名单中的每个应用对所有浏览器会话可见；按用户划分的应用与授权被推迟。
- **没有图标管线**——记录中的图标字段会跨线传输，但尚无任何东西为其上传、存储或渲染图片。
- **`insertBefore` 一次移动一个应用**——多应用重排是调用方发起的命令序列，而不是一条事务性命令。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>供维护者查看的工作上下文——点击展开</summary>

`AppController` 是一个 `TypertRemoteService`，以 `static inject = ['typert', 'appRegistry']` 声明。Typert 生成器读取它的 `@Remote` 方法，产出 `lib/typert.host.js` 以及浏览器契约 `lib/typert.remote-client.js`；传给基类构造函数的属性名（`appController`）是 Cordis 服务名，而命名空间（`app`）是浏览器看到的 `remote.app`。本包把 `zod` 作为运行时依赖发布，因为生成后的宿主契约会导入它。

宿主入口在运行时不再导入 `AppId`：该 brand 是纯类型转换，请求类型已经携带它，而让 registry 这条边保持"仅类型"可以避免向 `SAFE_HOST_DEPENDENCY_EXPORTS` 添加条目，而自动化改动不得扩展该表。

本包不发布运行时不变式伴生模块：持久关系由注册表持有，本包只转发命令，因此不存在第二个可背离的观测。

</details>
