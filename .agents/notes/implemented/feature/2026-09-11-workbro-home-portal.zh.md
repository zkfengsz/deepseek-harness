# Agent Note：WorkBro 主页门户——空白会话 hero 中的应用网格

Status: implemented

[English](2026-09-11-workbro-home-portal.md) | 中文

## 问题

空白会话 hero 原本只有工作区选择器与 Agent 预设控件，没有应用式的落地界面。WorkBro 需要一个门户，把它的应用列为可启动的卡片并在点击时打开其中之一，且不新增宿主服务或会话事件：harness 依据 Agent 预设组装会话，工作区只是其中一个输入。

## 决策

新增全宽 single slot `conversation.hero.apps`，由 `ui-conversation` 声明、在 `ConversationRoot.tsx` 中渲染于 hero 工作区行与输入框之间。它的 owner props 是 `onOpenApp(app)` 与 `selectedAppId`，因此门户本身不决定任何会话相关的事。

纯客户端包 `@deepseek-ai/dsh-client-ui-home` 填充该 slot：`HomePortal` 通过 app controller 的 `apps` 服务读取应用名单，为每个应用渲染一张卡片并调用 `onOpenApp`。owner 随后暂存该应用的 preset 并启动这次落地所在的会话——应用绑定了工作区时在该工作区新建会话，否则对当前工作区调用 `startSession()`。

## 备选方案

**列工作区而不是列应用。** 工作区是 Agent 可读取的目录，不是应用；一个有 2 个工作区、4 个应用的部署无法用工作区表达这 4 个应用，卡片也没有地方承载 preset 或图标。

**把门户注册为独立的根界面。** 独立于对话之外的落地页需要自己的导航、会话启动路径与输入框交接。复用 hero 的空白会话位置可以全部继承，并让门户留在启动本来就该在的地方。

## 后果

应用现在是一条持久注册，带有名称、可选 preset 与可选绑定工作区，因此启动一个应用是一项组装选择而非一次目录选择。门户不持有任何会话逻辑，也不显示自己的启动进度；被拒绝的 preset 通过预设界面自身的横幅呈现。卡片边框使用主题的半像素细线，这是样式门禁的要求。用于图标与描述覆盖的 `workbro.app.yml` 清单被推迟；当前由注册表自身的字段承载这两项。
