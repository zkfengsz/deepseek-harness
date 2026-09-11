# Agent Note：WorkBro 品牌插件填充侧栏与 hero 品牌 slot

Status: implemented

[English](2026-09-11-workbro-brand-plugin.md) | 中文

## 问题

默认构建下，侧栏与 hero 的品牌 slot 回退到 DeepSeek 鱼标与内置的 harness 名称。WorkBro 需要在这些界面上呈现自己的标识与名称，而不随包附带官方 DeepSeek 品牌。

## 决策

新增纯客户端包 `@deepseek-ai/dsh-client-ui-brand-workbro`，把一个圆角 "W" 徽标注册进 `sidebar.brand.mark` 与 `conversation.hero.brand.mark`，把 WorkBro 名称注册进 `sidebar.brand.name`（locale 键 `brand.name`）。两个 slot 共用同一个组件，因为再写一个近乎相同的组件会触发仓库的跨文件克隆门禁。node 半部是空 `apply`；该包不注册任何工具、提示或事件。

## 备选方案

**就地替换官方品牌包。** 修改 `client-ui-brand-official` 会为所有部署改变随附的 DeepSeek 标识，而不是新增一个由 profile 选择加入的标识；而且品牌 slot 是单次注册，第二个注册者会与第一个冲突。

**附带专门设计的 logo 素材。** 门户只需要一个可辨识且不属于厂商的标识；样式化字形不引入二进制资源、资源管线与授权问题。

## 后果

两个品牌 slot 读取同一份已注册的标识与名称，因此挂载该插件的 profile 处处显示 WorkBro，未挂载的 profile 保持随附品牌。该标识是样式化字形而非 logo 素材，并以静态形式取代了动画 fallback。
