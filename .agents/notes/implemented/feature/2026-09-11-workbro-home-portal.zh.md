# Agent Note：WorkBro 首页门户 —— 空状态 hero 中的工作区卡片网格

Status: implemented

[English](2026-09-11-workbro-home-portal.md) | 中文

## 问题

空状态 hero 目前只有工作区选择器与 agent-preset 控件，缺少"应用式"的落地页。WorkBro 需要一个门户，把每个工作区呈现为可启动的"应用"卡片（标题、路径、会话数），点击即打开其空白会话，且不新增 host 服务或 session 事件。

## 决策

新增一个全宽 single slot `conversation.hero.apps`，由 `ui-conversation` 在 `apply.ts` 中声明、在 `ConversationRoot.tsx` 中渲染于 hero 工作区行与 composer 之间，owner props 为 `onOpen(workspaceId)` 与 `selectedId`。新客户端包 `@deepseek-ai/dsh-client-ui-home` 填充该 slot：`HomePortal` 读取全局 `useWorkspaces` 标准 hook，通过 owner 的 `onOpen` 启动，后者复用 `ui-conversation` 既有的 `selectWorkspace` 导航。node 半部是空 `apply`；该包不注册任何工具、提示或事件。

## 取舍

- 暂无应用元数据：卡片只显示工作区标题、路径与会话数；`workbro.app.yml` 清单（图标、描述、preset）后置。
- 无启动反馈：门户自身不展示 pending/error 状态，完全依赖 owner 的 `onOpen`。
