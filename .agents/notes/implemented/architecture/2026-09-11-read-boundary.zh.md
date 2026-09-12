# Agent Note：读边界——限制一个会话能看见什么

Status: implemented

[English](2026-09-11-read-boundary.md) | 中文

## 问题

沙箱此前只约束写。`SandboxMode` 的文档写明是 file effects，而实践中 `read-only` 是一条关于"修改"的规则、而不是关于"读取"的规则：macOS 跑的是 `(allow default)` 配 `(deny file-write*)`，bwrap 把整个文件系统只读挂载，Landlock 授予 `readOnly: ['/']`。在 WorkBro 部署上实测：agent 可以读 `/etc/hosts`、列目录看操作者的家目录、读取机器上任何凭据文件；而它的写被限制在会话工作区与临时目录内。

对一个合规、KYB 或信用工作台而言，这个不对称是反的。危害不是文件被改，而是操作者的另一个项目、另一个应用的记录、或某个 `.env` 进入了模型请求。部署方本来就无法收窄读——因为根本没有这个东西。

## 决策

**读边界是独立的一根轴，不是"更宽的模式"。** `SandboxExecutionPolicy` 新增 `readRoots?: readonly string[]`。缺省表示读不受限——即该字段出现之前所有部署的行为——给了值则表示读止于工作区、这些根、以及进程运行所必需的平台根。`readRootsFor(policy)` 负责推导规范化白名单，`systemReadRoots()` 固定平台那一半，二者与 `writableRoots` 同在 `@deepseek-ai/dsh-sandbox` 中，因此进程内围栏与各内核方言不会漂移。

**用开关而不是空列表表达"启用"。** `SandboxPolicyService` 的配置在 `readRoots?: string[]` 之外新增 `confineReads?: boolean`。schema 无法区分"缺失的数组"与"空数组"——`z.array()` 会填 `[]`——而这个字段的两端含义相反，所以决定权落在一个缺省时确实为 `undefined` 的布尔上。

**边界按会话生效，无会话的调用不受限。** `resolve()` 只在有会话时才附带 `readRoots`。边界回答的是"某一个会话能看见什么"，而 harness 读取自身机制——技能发现、preset 文件、会话日志——并不是一个会话。

**批准一次越界读，不得顺带放宽写。** 升级词汇新增 `READ_ESCALATION_TARGET`（`'read-anywhere'`），刻意置于模式阶梯之外；`approveEscalation` 改为返回 `SandboxEscalationGrant` 联合：写阶梯沿用 `{ kind: 'mode' }`，单次调用放开读边界用 `{ kind: 'read' }`。写模式无法表达这种放宽——升到 `danger-full-access` 会把同一次调用的写也一并解禁。

**工具 schema 依据部署事实来广告读目标。** schema 在 `apply()` 时组装，那时还没有会话，因此枚举无法按调用收敛。`SandboxPolicyService.confineReads` 公开正是为了这个读取点；每次执行时的 `readsConfined` 前置条件仍是权威校验，它负责拒绝过期的 schema。

**由部署打开，而非随附 bundle。** WorkBro 部署给自己的 profile 打补丁，在 `sandbox-policy` 行写入 `confineReads: true` 与它的数据根——两个家目录下的技能根，加上运行本宿主的 Node 安装目录——于是每个会话的边界就是它自己的工作区，这正是"一个应用只能读它自己的数据上下文"在运行时的含义。哪些部署限制读取属于部署选择，而 DSH 已经规定了这类选择的位置：可从 `cordis.yml` 修改的、经校验的 `Config` 字段，而不是写死在共享组合里的值。若在 `packages/bundle/web-app` 中打开，还会改变模型可见输出——四个读取工具的 schema 与一句提示上下文——而仓库要求这必须与重新录制的会话语料一同提交，而重录需要本机没有的录制密钥。

## 备选方案

**把这种放宽表达成更宽的 `SandboxMode`。** 阶梯已经在 schema 里，不需要新值；但批准一次读就等于同时授予 `danger-full-access` 的写——审批弹窗写着"读取这个文件"，实际给出的权限远大于此。作为安全语义上的倒置，不采纳。

**只把会话工作区作为唯一可读根。** 表述与测试都最简单，但技能位于家目录下的根中，shell 也必须读取自己的解释器才能启动，于是边界会先弄坏 agent 而不是约束它。因此改为显式列出平台根与部署自身的数据根。

**在随附的 web bundle 里打开。** 那是 WorkBro 产品声明自身默认值的位置，也能让每个 WorkBro 安装无需部署改动即受限。但它同时改变四个读取工具的 schema、并给模型的策略上下文加一句话，于是 `snapshots/web` 下的录制会话无法重放；刷新它们需要 `DSH_SNAPSHOT=record` 与提供方密钥。现在能力先行、开关作为部署改动，语料保持一致，决定权也留在 DSH 放置部署相关策略的地方。

**只靠 fs provider 拒绝边界外的一切路径。** 进程内围栏单独并不构成边界：shell 家族是通过内核访问文件系统的，所以围栏与平台方言必须执行同一份推导出的白名单。

## 后果

开启该能力的部署会阻止会话读取其数据上下文之外的内容，且模型会在运行环境事实里被告知这一点，而不是靠被拒绝才发现。已在真实 `web` profile 上验证：带会话的读在边界内成功，越界读以 `file access denied outside this session's data boundary` 失败，无会话的读仍然成功。越界读会以"指名边界"的方式被拒绝，并且可以只针对那一次调用、在不改变该调用写权限的前提下获批一次。

边界不是容器：网络出口、进程可见性、以及沙箱之外的本机进程都不受影响；Windows ACL 后端不在本次改动范围内。无会话的调用按设计仍不受限，因此代表 harness 自身读取的能力不受影响——这也意味着不应把该边界误当作"整进程保证"。

`list()` 与名单界面依然会在各行"可解析但无法挂载"时报告 preset 健康；本次改动没有触碰这一点，而这两个缺口是同时被发现的：一个无法组装的 WorkBro preset 会让会话跑在部署默认值上，恰好与读边界的推进重叠。
