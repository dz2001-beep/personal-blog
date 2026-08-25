---
title: 'DeepSeek Harness 关键技术点详解:概念、机制与术语'
description: '专业深度向技术详解:14 个关键技术点,按「概念→机制→深入」由浅入深,全篇 30+ 专业术语精确定义,附术语表。'
pubDate: 2026-08-25
tags: ['DeepSeek Harness', '技术详解', '架构', '术语']
---

# DeepSeek Harness 关键技术点详解:概念、机制与术语

> 本文以专业术语系统梳理 DeepSeek Harness(`dsh`)的关键技术点,面向有经验的工程师与研究者。
> 行文约定:每个技术点按「**概念 → 机制 → 深入**」三层由浅入深展开;**新术语首次出现时以"术语"标注并给出精确定义**,文末附全篇术语表。
> 资料来源:官方[架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md)、[子系统文档](https://github.com/deepseek-ai/deepseek-harness/tree/master/docs/subsystems)与 `@deepseek-ai/dsh` 包源码;项目处于开发者预览期,接口可能变更。

## 0. 系统定位与设计原则

### 0.1 定位

**DeepSeek Harness** 是一个开源 **agent harness**——术语"harness"在此指"承载智能体运行时全部非模型能力的框架层"——由 DeepSeek AI 开发,以 Cordis 插件框架为内核驱动。

### 0.2 三条设计原则

1. **一切皆插件**:模型适配器、工具注册表、会话日志、agent loop 本体均为插件,系统中不存在特权内核。
2. **事件溯源**:会话状态以仅追加的 `SessionEvent` 日志为唯一真源,一切视图(模型历史、UI、回放)均为其投影。
3. **能力可替换(seam)**:可替换能力被抽象为"定义 / 提供 / 消费"三角色,替换提供方即改变系统行为,消费者零改动。

## 1. 插件化架构与 IoC 容器

### 1.1 概念

**插件**(Plugin):可注册、可卸载的扩展单元,向共享**上下文**贡献服务与事件。**上下文(Context, `ctx`)**:插件共享的运行时对象,是服务注册与访问的载体。**服务**(Service):插件提供的可编程接口,按约定键挂载于 `ctx`(如 `ctx.tools`、`ctx.sessions`、`ctx.agents`)。

这是典型的**控制反转(IoC)**实现:插件不主动查询依赖,而是由容器注入共享上下文。

### 1.2 机制

- **服务注册**:插件通过 `ctx` 注册服务与工具,消费方经同一 `ctx` 获取。
- **类型化事件**(Typed Event):事件名与载荷类型静态绑定,`SessionEventMap`、`agent/*`、`tools/*` 等事件域各自声明类型签名;写错载荷类型在编译期即报错。
- **可逆副作用**(Reversible Side Effect):插件的每次注册均登记副作用,插件卸载时按序撤销——保证"卸载即清理",不残留僵尸注册。

### 1.3 深入

"无特权内核"是架构决策而非口号:扩展 dsh 的唯一方式是"把插件挂载到其他插件旁边",因此**不存在需要 fork 源码才能触达的改动面**。代价是运行时多一层间接:每次模型请求都要经 `system-prompt` 组装、`tools` 分派、`agent` 注册表路由,系统以间接性换取可组合性——这与操作系统的驱动模型是同一类权衡。

## 2. Profile 组装与配置叠加

### 2.1 概念

- **Profile**:Harness home 下的具名组装方案,列出组合包清单、持有树外插件与用户级 `cordis.patch.yml`。`web`、`headless` 为随发行版交付的模板。
- **组合包(Bundle)**:Cordis 配置项与挂载代码的**分发单元**,`dsh.bundle` 字段指向其 patch 文件。
- **补丁层(patch)**:配置覆盖层,按条目 id 定位并整体替换 config 或插入新条目。

### 2.2 机制

配置树以空条目列表为根,按固定顺序叠加:

```text
空根 → bundles(按 profile 声明顺序)→ profile 的 cordis.patch.yml
      → home 级的 cordis.patch.yml → 命令行 --patch 覆盖层
```

**覆盖语义**:后应用的层覆盖先应用的层;一条 patch 以 id 定位条目,可整体替换其 config。

### 2.3 深入

- 清单字段:profile 的 `package.json` 中以 `dsh.profile` 声明组合包顺序;bundle 以 `dsh.bundle` 声明 patch 路径。
- 内置三层:`dsh-base`(模型适配/工具/持久化/沙箱与审批/设置/凭据/遥测)→ `dsh-web-app`(浏览器应用)→ `dsh-headless`(一次性运行器,无服务器)。
- 运行时检查:`dsh --profile web --dump-config` 打印组合后的完整配置树,其中**任意条目**都可由用户 patch 覆盖——这是"无需 fork 即可定制一切"的落地机制。

## 3. Agent 循环:事件溯源驱动的状态机

### 3.1 概念

- **步骤(Step)**:一次模型请求 + 该请求调用的一组工具。
- **轮次(Turn)**:零个或多个步骤构成的完整回合,在领取首条输入时开启,在"不再欠下任何工作"时关闭。
- **Inbox**:输入队列,驱动器认领输入的来源;消息可立即唤醒驱动器,注入的上下文则滞留至被唤醒。

### 3.2 机制:轮次完整时序

```text
turn/start
  claim next-step input plus one queued message
  assemble prompt sections + tool schemas
  -> agent/pre-step                   reject | enter(messages)
     step/start
     append entered messages as user/message
     derive model history from the log
     agent/request -> llm/stream -> assistant/chunk* -> assistant/message
     tool/call* -> tools/pre-execute -> tools/execute -> tools/post-execute -> tool/result*
     step/end
     tools owe another request, or next-step input arrived -> claim -> next step
  -> agent/turn-stopping
turn/end
```

### 3.3 深入

- **事件分类**:`turn/*`、`step/*`、`user/message`、`assistant/*`、`tool/*` 为**持久会话事件**;`agent/pre-step`、`agent/request`、`llm/stream`、三个 `tools/*` 事件为 **waterfall 事件**(监听器必须调用 `next()` 委托下去,形成链式流水线);`agent/turn-stopping` 为 **serial 事件**(无 `next()`,是轮次的终结闸门)。
- **`agent/pre-step` 决定模型所见**:监听器可改写已领取消息或直接拒绝;即使首次领取被拒绝或改写为空,仍会关闭一个"不含步骤"的持久轮次——日志记录这次尝试,保证可审计。
- **循环条件**:工具请求了另一次模型请求,或新的 next-step 输入到达 → 认领 → 进入下一步;否则轮次收敛关闭。

## 4. 会话日志:唯一真源

### 4.1 概念

**会话日志**是仅追加的 `SessionEvent` 事件流(`ctx.sessions`),是模型上下文的**唯一真源**,承载事件溯源(Event Sourcing)模式。

### 4.2 机制

- **模型可见即已记录**:抵达模型请求的一切内容必须能从日志重建,该性质由运行时不变量断言——新增模型可见输入必须扩展 `SessionEventMap` 并从日志渲染。
- **派生(Projection)**:模型历史由 `deriveMessages()` 从日志投影,而非维护独立副本;原始 `assistant/chunk` 流事件被保留,保证回放与 UI 保真。

### 4.3 深入

- **派生能力**:fork(以指定边界克隆会话)、resume(恢复持久会话)、transcript(导出文本记录)、遥测、持久化**全部**派生自同一事件流。
- **设计含义**:该模型直接消灭"模型上下文与系统记录漂移"这一类 bug;代价是每次请求需重建历史(成本由 `deriveMessages` 与可选的 `compaction` 上下文压缩机制控制)。

## 5. 工具系统:注册表与执行流水线

### 5.1 概念

- **ToolSchema**:面向模型的工具描述(名称/描述/参数),随模型请求组装。
- **ToolDefinition**:注册表中工具的完整定义——schema 之外还包含输出契约、执行函数与宿主调度元数据。
- **工具注册表**(`ctx.tools`):持有定义、构建模型视图、分派调用的中枢。

### 5.2 机制

- **允许列表投影**:`schemas()` 通过显式允许列表构建面向模型的 `ToolSchema[]`;`output`、`execute`、`finalizeContent`、`timeoutMs`、`isConcurrencySafe`、`presentCall`、`presentResult` **绝不泄漏到模型请求**——协议面与宿主面严格隔离。
- **输出契约**(ToolOutputDefinition):必填,包含原始 JSON Schema(对每个成功规范值强制执行)+ 纯函数投影 `render`(参数+值 → 模型内容块)+ 可选的重放元数据。
- **执行生命周期**:`execute` 返回规范的无损 JSON 值;`finalizeContent` 在结果物化前被调用一次,即使流水线失败也执行;`timeoutMs` 由 `tools/execute` 包装器(`tool-call-timeout-policy`)强制执行,永不发送给模型。

### 5.3 深入

- **类型化 schema DSL**:插件作者用 `ValueSchemaSpec`(`string/number/integer/boolean/null/array/object/json/oneOf`)声明参数与输出;`InferValue<S>` 做类型推断,**精确推断保持至 16 层容器,之后回退为 `JsonValue`**,避免耗尽 TS 类型实例化栈;`InferArgs<P>` 依据逐属性必填标记推导参数对象。
- **错误模型**:参数不匹配抛 `ToolArgsError`(`INVALID_ARGS`),输出无效抛 `ToolOutputError`(`INVALID_TOOL_OUTPUT`);原始 JSON Schema 不支持的关键字**被拒绝而非"不强制放行"**——宁可显式失败,不静默降级。
- **作用域过滤**:`ToolRestriction`(allow/deny)作用于作用域继承的工具:多限制取交集,叠加作用域自身注册(不受约束)——保证**被委派的子代理保留其回报通道依赖的工具**。
- **执行 waterfall**:`tools/pre-execute → execute → post-execute` 三段瀑布式事件,可在任意段插入策略(超时、审批、限流);注册表通过 around-dispatch 信号替换保留调用方取消语义,但无法硬杀同进程代码,故契约要求工具协作转发 `exec.signal`。
- **并发契约**:`isConcurrencySafe` 为纯同步分类器,仅 `true` 选择加入并行组;并行的执行不得突变父作用域状态。

## 6. 能力 Seam:可替换能力的抽象

### 6.1 概念

**Seam**(接缝):一项可替换能力的完整抽象,含三种角色——**Service Definition**(声明接口)、**Service Provider**(实现接口)、**Consumer**(消费接口,通常是面向模型的工具)。

### 6.2 机制

消费者只依赖 Service Definition;替换 Provider 即可整体改变能力行为。典型实例:

- **文件系统与进程**共享同一执行世界:`ctx.fs` 指向远程沙箱时,Bash、PTY、LSP 一并迁移,无需提供方专用 fork。
- **子代理**:同一 `ctx.subagents` 接口下,从进程内生成到委派给 Codex / Claude Code 等外部产品。

### 6.3 深入

单一角色本身不是 seam;新增一项能力意味着**将定义/提供/消费三者一并设计**(见官方"能力图")。这是 dsh 可扩展性的核心:所有面向模型的能力(工具、shell、终端、文件、目标、工作流、子代理)均按此模式建模,保证"换提供方零消费者改动"。

## 7. 子代理系统

### 7.1 概念

**子代理(Subagent)**:由父 agent 启动、承担委派任务的独立 agent。子代理 seam 是**可选能力**(不属于 agent loop),且与 bash 不同——**同一上下文可共存多个提供方实现**,按名称注册于 `ctx.subagents`。

### 7.2 机制

- **六个提供方**:`spawn-in-process`(进程内生成)、`fork`(会话 fork)、`acp`(经 ACP 协议委派)、`codex`、`claude-code`(外部产品)、`dsh-sdk`。
- **能力声明**(SubagentCapabilities):提供方静态公布 `outputSchema` / `depthLimit` / `toolFilter` / `persona` 四项启动时能力。
- **Fail Loud 原则**:请求依赖提供方不具备的能力时,在启动前以 `SubagentError('UNSUPPORTED_CAPABILITY')` 明确拒绝——**绝不接受后静默忽略**。

### 7.3 深入

- **启动请求契约**(SubagentStartRequest):`label`(持久化展示标签)、`prompt`(子 agent 的 user 消息)、`parent`(提供 cwd/谱系/委派深度)、`signal`(就绪前后的唯一取消通道)、可选的 `outputSchema`(受约束的 object-rooted JSON Schema)、`maxDepth`(绝对委派深度上限)、`toolFilter`、`persona`。
- **取消语义**:`signal` 在 run 发布前触发 → 提供方清理部分资源后拒绝 `start()`;发布后触发 → 取消该 run 剩余回合工作。
- **可继续子代理**(Continuable):由继续执行管理器组合,经唯一可选方法 `prepareContinuable` 把关(方法存在即能力,以 TS 类型收窄为发现机制);`listChildren()` / `listDescendants()` 提供持久化枚举。
- **控制面**:`dsh-tool-subagent-control` 暴露全局 `send_message` / `interrupt_agent` / `list_agents`;`dsh-tool-subagent-report` 提供子作用域 `report` 返回通道。
- **工具过滤语义**:in-process 后端在子代理创建窗口内应用 `tools.restrict()`,过滤的工具从子代理提示词中消失**且拒绝执行**(可见性而非权限模型)。

## 8. 目标系统(Goal)

### 8.1 概念

**同会话目标**是事件溯源服务:管理"同一会话内需要跨轮次持续追踪"的长期任务。

### 8.2 机制

- **标识与并发**:`GoalId` 为品牌化 ID(见术语表);调用方经 `GoalRef`(id + revision)以 **CAS(比较并交换)** 语义修改确切修订版本,每次获准的持久变更递增 revision。
- **生命周期阶段**(GoalPhase):`active` / `paused` / `blocked` / `complete`;`blocked` 是唯一"因问题而停止"的持久状态,原因含机器可路由的 **lower-kebab-case code** + 供人/模型阅读的自由文本。

### 8.3 深入

- **持久与激活分离**:持久阶段回答"目标发生了什么";进程本地激活状态另行回答"续跑消费方能否开始下一个 Round"。这使目标在进程重启后可恢复,且激活策略可替换。
- 续跑经 `agent/*` 事件驱动:目标完成/阻塞/暂停均转化为对 agent 的续跑请求,形成"目标 — 轮次 — 工具"的闭环。

## 9. 工作流引擎

### 9.1 概念

**工作流(Workflow)** seam 允许 agent 运行**由模型编写的编排脚本**(可启动子代理的脚本),为可选能力、不属于 agent loop;与 bash 相同,每上下文仅允许一个引擎实现提供 `ctx.workflowEngine`。

### 9.2 机制

- **Provider**:`dsh-workflow-worker-thread`——基于 `node:worker_threads`,**每个 run 一个 worker**,脚本的 vm 上下文位于其中(与宿主隔离)。
- **Consumer**:`dsh-tool-workflow`,模型以 `{ script, meta, args }` 发起调用。
- **启动请求**(WorkflowStartRequest):`script`(plain JS,允许顶层 await,以 `return <json-value>` 结尾)、`meta`/`args`(普通 JSON 数据)、可选 `subagentProvider` / `maxTotalAgents`(引擎级策略,脚本不可观察或替换)、必填 `parent`、`signal`。

### 9.3 深入

- **元数据安全**:引擎以 schema 校验 `meta`,并在任何工作开始前显式拒绝无效数据;**绝不通过对脚本文本求值**获取元数据——杜绝"脚本即配置"类注入。
- **编排原语**:脚本内可调用 `agent(prompt)`(启动子代理并等待)、`parallel(thunks)`(屏障式并发)、`pipeline(items, ...stages)`(无屏障多阶段流水线)、`phase()`/`log()`(进度叙事)。
- **归属语义**:脚本启动的每个子 agent 均归属于 `parent`,cwd、谱系与深度经子代理 seam 传递——工作流的执行边界可完整审计。

## 10. 进程沙箱

### 10.1 概念

**进程沙箱**(`ctx.sandbox`)将与宿主共享文件系统/内核的子进程 argv 包装进**文件效果策略**,而不将消费方耦合到特定平台运行器。

### 10.2 机制

- **模式词汇**(SandboxMode):`read-only`(拒绝写入,仅授予必需 sink,如 POSIX 的 `/dev/null`)、`workspace-write`(允许工作区根 + 后端承诺的临时区)、`danger-full-access`(绕过隔离)。
- **平台后端**:`sandbox-local` 提供 Linux bwrap/Landlock、macOS Seatbelt、Windows ACL 受限令牌;`bash-sandbox` / `pwsh-sandbox` 为其消费方。
- **发送边界**:仅前两种(confined)模式可发送给提供方;`danger-full-access` 消费方直接 spawn 原始 argv,不调用 `ctx.sandbox`。

### 10.3 深入

- **强制执行完整性**(Enforcement Completeness):后端报告 `full`(管控该模式承诺的全部文件效果)或 `partial`(如旧 Landlock ABI、Windows ACL 的 Everyone/硬链接边界);要求绝对保证的消费方必须拒绝或向上暴露 `partial`——避免"以为被隔离其实没有"的虚假安全。
- **词汇边界**:沙箱仅定义**文件效果**策略;网络与进程可见性不在此词汇表内,由系统其他层负责——能力边界刻意收窄,防止职责蔓延。

## 11. 后台任务(Jobs)

### 11.1 概念

**后台任务**(`ctx.jobs`)是脱离模型轮次执行的异步工作单元,面向耗时/阻塞性操作(长命令、批量处理)。

### 11.2 机制

- 插件在 `ctx.jobs` 注册任务类型;`job_*` 工具族(如 `job_output`、`job_kill`、`job_list`)负责**收集结果与终止任务**。
- 任务在后台运行,完成后向调用方通知;调用方可在等待期间继续其他工作——将"轮次内同步等待"转换为"事件驱动收集"。

### 11.3 深入

任务执行与 agent 循环解耦:模型不持有任务句柄的生命周期,取消/读取经工具显式完成,配合会话日志保证任务结果可回放。

## 12. 事件驱动 UI 与客户端架构

### 12.1 概念

Web UI(`web`/`client` 包)是**会话日志的消费者**:从 `ctx.agents` 读取活跃 agent,从 `session/event` 渲染对话。

### 12.2 机制

- **一致性保证**:UI 实时渲染与回放消费同一事件流,故"实时所见 = 历史重演",无需单独维护 UI 状态机。
- **启动链路**:`npx @deepseek-ai/dsh web` 默认在 `http://127.0.0.1:3080` 启动;SSH 场景仅打印宿主 URL;`--no-open` 只起服务不开浏览器。

### 12.3 深入

- **客户端插件与 HMR**:浏览器端插件支持热模块替换,客户端插件变更无需整页刷新即生效;Web 入口由宿主注入启动机制(如 `window.__DSH_BOOT__`)完成引导。
- **协议层**:`acp`(Agent Client Protocol 客户端)、`sdk`、`api` 包将 harness 暴露给外部应用与编辑器集成——UI/CLI/IDE 均通过同一事件与服务面接入,不持有私有协议。

## 13. 安全模型

### 13.1 审批(guard)

危险操作(高权限工具调用、`danger-full-access` 执行)经审批策略把关;审批作为 `tools/*` 或 `agent/*` 事件的策略挂载,与执行流水线解耦。

### 13.2 凭据与身份

`credentials` 包负责凭据的持久化与安全存储,`identity` 包管理身份;凭据访问受策略约束,不随会话日志明文外泄。

### 13.3 纵深防御关系

- **文件效果**:`ctx.fs` seam + `fs/*` 事件策略;
- **进程**:`ctx.sandbox` 包装 argv;
- **工具**:审批与 `ToolRestriction` 过滤;
- **协议**:schema 拒绝不支持的语法 + fail loud。

各层职责收窄、可独立替换,构成纵深防御而非单一检查点。

## 14. 全篇术语表

| 术语 | 定义 |
| --- | --- |
| Harness | 承载智能体运行时全部非模型能力的框架层 |
| 插件(Plugin) | 可注册、可卸载的扩展单元,向上下文贡献服务与事件 |
| 上下文(Context) | 插件共享的运行时对象,服务注册与访问的载体 |
| 类型化事件 | 事件名与载荷类型静态绑定的事件 |
| 可逆副作用 | 注册操作可在插件卸载时自动撤销 |
| IoC | 控制反转,依赖由容器注入而非主动查询 |
| Profile | 具名插件组装方案 |
| 组合包(Bundle) | 配置项与挂载代码的分发单元 |
| patch | 按条目 id 定位的配置覆盖层 |
| 事件溯源(Event Sourcing) | 以追加式事件日志为唯一真源的状态管理范式 |
| Step / Turn | 一次模型请求+工具调用 / 多个 step 的完整回合 |
| Inbox | 输入队列,轮次的输入来源 |
| Waterfall 事件 | 须调用 next() 委托的链式事件 |
| Serial 事件 | 无 next() 的终结事件 |
| 投影(Projection) | 从事件日志派生的视图 |
| ToolSchema | 面向模型的工具描述 |
| ToolDefinition | 注册表中工具的完整定义(含宿主元数据) |
| 允许列表(Allowlist) | schemas() 构建模型视图的显式白名单机制 |
| ToolRestriction | 作用域级工具过滤(allow/deny 交集) |
| Seam | 可替换能力抽象(定义/提供/消费三角色) |
| SubagentCapabilities | 子代理提供方启动时能力声明 |
| Fail Loud | 能力不匹配即启动前明确报错,拒绝静默降级 |
| AbortSignal | 取消信号,就绪前后的唯一取消通道 |
| Continuable | 可继续执行(子代理干完可再派活) |
| 品牌化 ID(Branded ID) | 以类型系统强化的不透明 ID |
| CAS | 比较并交换,基于版本的并发安全修改 |
| Worker Threads | Node 工作线程,工作流脚本的隔离执行环境 |
| SandboxMode | 沙箱模式词汇(read-only / workspace-write / danger-full-access) |
| 强制执行完整性 | 后端报告 full/partial 的强制程度 |
| ACP | Agent Client Protocol,agent 客户端协议 |
| HMR | 热模块替换,客户端插件热更新机制 |

## 参考链接

- 官方仓库:https://github.com/deepseek-ai/deepseek-harness
- 架构文档:https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md
- 子系统文档:https://github.com/deepseek-ai/deepseek-harness/tree/master/docs/subsystems
- Cordis:https://github.com/cordiverse/cordis
- 配套文章:本站《DeepSeek Harness 源码解析》(`/blog/deepseek-harness-source-analysis/`)与《新手学习笔记》(`/blog/deepseek-harness-interview-notes/`)
