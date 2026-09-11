# Agent Note: 应用启动选择的 preset 会在运行中的会话仍是当前会话时被保留

Status: implemented

[English](2026-09-11-workbro-app-launch-preset-hold.md) | 中文

## 问题

从 WorkBro 门户打开应用时，卡片会高亮并启动一个会话，但该会话运行的是部署默认值而非应用自带的 preset。会话日志的头部记录的是默认值，且没有 `agent-preset/selected` 事件，说明这次切换从未到达宿主。

`AgentPresetSeatController.select()` 先暂存选择再立即应用，而 `apply()` 会在当前会话非空白的瞬间消耗掉暂存——已开始的会话其组装已固定，宿主会拒绝切换。这条规则对主屏 chip 是正确的：它的选择只可能指向屏幕上那个会话。但它不适用于启动流程：选择所指向的会话尚不存在，运行中的会话只是在那个会话被创建期间仍然处于当前状态。`startSession()` 让情况更糟而非更好：新会话的摘要会在旧会话仍是当前会话时发布，因此单用 `stage()` 会被同一次列表通知丢掉选择。

## 决策

`AgentPresetSeatController.launch(id)` 暂存一个属于启动界面即将产出的会话的选择，`apply()` 在当前会话非空白时保留这样的暂存而不消耗它。保留状态在第一个能够接收它的会话处结束，在宿主拒绝时结束，并在名单报告模式选择已关闭时结束。

跨插件通道仍是服务。`ui-agent-preset` 发布 `workbroPresetLaunch.launch`，`ui-conversation` 通过 `ctx.get` 读取，门户的 `stagePreset` 调用它。Cordis 客户端事件无法承担这件事：事件只从其发射上下文向下渗透，兄弟插件永远看不到。

## 备选方案

**通过 `session.create` 携带 `agentPreset`。** `SessionCreateRequest` 已接受该字段，启动的会话可以直接以正确的组建设立，既无切换也无竞态。但客户端从 `ISessions.create` 经 manager、`connectWorkspace` 到 `startSession` 的整条链路都要补该字段——为同一结果对两个核心包做更大范围的改动。

**去掉 `apply()` 中的非空白规则。** 只要当前会话在运行就保留暂存，能修好启动，但也会把主屏上做出的选择带到之后某个会话，这与 chip 的契约相抵触。

**门户只暂存不应用。** 仅靠 `stage()` 无法挺过 `sessions.create` 的那次通知，它在旧会话仍是当前会话时就会到达。

## 后果

启动选择的 preset 现在能到达它启动的会话。`ui-home` 新增一个整客户端组装测试：打开两个会话并断言 `agentPresets/select` 落在启动的那个上；在该测试中禁用保留逻辑会精确复现上报的症状——`select` 从未被调用。`app-controller` 去掉了运行时的 `AppId` 导入，因为该 brand 是纯类型转换、线上类型已携带它；这使 registry 这条边无需进入 `SAFE_HOST_DEPENDENCY_EXPORTS`，而自动化改动不得扩展该表。
