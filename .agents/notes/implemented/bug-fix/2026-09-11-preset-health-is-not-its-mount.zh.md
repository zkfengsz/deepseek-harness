# Agent Note：随附 preset 的"健康"不等于"能挂载"

Status: implemented

[English](2026-09-11-preset-health-is-not-its-mount.md) | 中文

## 问题

四个 WorkBro 起步 preset（`compliance`、`credit`、`kyb`、`growth`）随附时，其 `tool-todo` 行都漏了 `@deepseek-ai/dsh-tool-todo` 所必需的 `allowParallelInProgress`。于是这些 preset 成了"能列出但不能用"：`agentPresets/list` 报告它们全部健康，名单界面照常渲染卡片；而任何一次由它们组装会话的尝试都以 `agent-preset/invalid` 失败，并给出指名该行的配置错误。

这个失败在线路两端都不可见。`list()` 只问每一行的包能否解析——随附 preset 自己的测试套件已如此说明，并且刻意容忍无法解析的行，因为它的 fixture 基座并不是部署的实际安装。真正应用每一行 `Config` 的动作是组装。而被拒绝的切换不留下任何会话事件：宿主只在挂载成功后才追加 `agent-preset/selected`，因此"被拒绝的切换"与"从未尝试的切换"留下的会话日志完全一样。

## 决策

每个随附 preset 都必须携带其各行所需的配置；`tool-todo` 补上 `allowParallelInProgress: true`，与 `standard` preset 一致。

这四个 preset 其余部分不变：它们的行是 `standard` 面向模型的工具的子集，外加各自的 persona，因此不需要 realm，也不提供任何服务。

## 备选方案

**让 `agentPresets/list` 通过挂载每个 preset 来报告健康度。** 那样就能在读取名单时发现此问题，浏览器也会显示"损坏"标记而不是一张卡片。但它会让每次名单读取都挂载全部 preset，而设置界面与 main chip 都会走到这条路径；现有名单已经把挂载推迟到第一个需要它的 agent。代价与这条事实不相称，故不采纳。

**在本包测试套件里为这些 preset 增加挂载测试。** 该套件的 harness 组装的是 fixture 基座——恰恰是无法解析这些行的基座；部署是通过 profile 修复后的模块回退来解析它们的，只有启动真实 profile 才能到达。

**静态地按插件 schema 校验每一行的 `config`。** 通用实现需要为每个插件准备一种方言，而插件导出的 schema 并不统一。

## 后果

这四个 preset 现在可以组装。仍然存在的缺口是：本仓库中没有任何东西会启动真实 profile 并挂载每一个随附 preset，因此配置被拒绝的行依然只有部署才能发现——本次发现它的检查是启动 `web` profile 并对每个 preset 调用 `standingKeyFor`。`list()` 只做解析层的健康判定这一点未变，其测试套件的注释记录了原因。
