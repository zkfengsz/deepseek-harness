# Agent Note：WorkBro 品牌插件填充侧栏与 hero 品牌 slot

Status: implemented

[English](2026-09-11-workbro-brand-plugin.md) | 中文

## 问题

默认构建下，侧栏与 hero 的品牌 slot 回退到 DeepSeek 鱼标与 "DSH Local Build" 名称。WorkBro 需要在这些界面上呈现自己的标识与名称，而不随包附带官方 DeepSeek 品牌。

## 决策

新增纯客户端包 `@deepseek-ai/dsh-client-ui-brand-workbro`，把一个圆角 "W" 徽标注册进 `sidebar.brand.mark` 与 `conversation.hero.brand.mark`，把 WorkBro 名称注册进 `sidebar.brand.name`（locale 键 `brand.name`）。node 半部是空 `apply`；该包不注册任何工具、提示或事件。

## 取舍

- 文本化徽标："W" 是样式化字形，非专门设计的 logo 素材。
- 无 hero 动画：静态徽标替换了动画鱼 fallback。
