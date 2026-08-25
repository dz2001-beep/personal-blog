---
title: 'DeepSeek Harness 源码解析:一个「一切皆插件」的 Agent 运行时'
description: '基于官方文档与源码,拆解 DeepSeek Harness(一切皆插件)的核心技术点:插件架构、轮次循环、工具流水线、子代理、目标/工作流、沙箱与 Web UI。'
pubDate: 2026-08-25
tags: ['DeepSeek Harness', '源码解析', '架构', 'AI Agent']
---

# DeepSeek Harness 源码解析:一个「一切皆插件」的 Agent 运行时

> 本文基于 DeepSeek Harness 官方文档([架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md)、[子系统文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/))与 `@deepseek-ai/dsh` 包源码整理,并结合在 dsh 环境中的实际运行体验,拆解其核心技术点。当前版本处于**开发者预览**阶段,接口仍在快速迭代。

## 一、项目概览:Harness 是什么

**DeepSeek Harness**(简称 `dsh`)是 [DeepSeek AI](https://deepseek.com) 开源的 **agent harness(智能体框架)**,官方一句口号概括了全部设计哲学:**Everything is a Plugin(一切皆插件)**。

- 仓库:https://github.com/deepseek-ai/deepseek-harness(许可证 MIT)
- 驱动内核:[Cordis](https://github.com/cordiverse/cordis) 插件框架,设计思想来自论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)
- 一键启动:本地安装 Node.js 后执行 `npx @deepseek-ai/dsh web`,默认在 `http://127.0.0.1:3080` 启动 Web UI
- 三种形态:`web`(浏览器应用)、`headless`(无服务器的一次性运行器)、自定义 profile(按需组装插件树)

一个 "harness" 与单纯的 "LLM 调用封装" 的本质区别在于:**它把 agent 运行所需的一切——模型适配、工具执行、持久化、沙箱、审批、会话、UI——全部做成了可插拔的插件**。你不需要 fork 内核来定制行为,只需要在配置树里挂载/替换一个插件。

## 二、架构基石:一切皆插件

### 2.1 Cordis:无特权内核的插件模型

Cordis 是 dsh 的地基。它的核心抽象是:**插件向共享上下文(ctx)贡献服务、类型化事件与可逆的副作用**。在 dsh 里:

- **模型适配器**是插件
- **工具注册表**是插件
- **会话日志**是插件
- **agent loop(智能体循环)本身**也是插件

这意味着**不存在需要打补丁的特权内核**:注册是一种副作用,当插件卸载时,它的全部注册会被自动撤销(可逆副作用)。官方文档特别强调:扩展 dsh 的方式是把新插件"挂载到其他插件旁边",而不是修改内核。

### 2.2 Profile、组合包与 patch 层

运行中的 dsh 是一棵**插件树**,由启动时按序叠加的若干配置层组合而成:

```text
空条目列表
  └─ 组合包 bundles(按 profile 列出的顺序)
       └─ profile 的 cordis.patch.yml
            └─ home 级的 $DSH_HOME/cordis.patch.yml
                 └─ 命令行 --patch 覆盖层
```

- **Profile**:Harness home 下的具名组装,`dsh.profile` 字段列出组合包,自带树外插件与用户 patch。`web`、`headless` 作为模板随发行版交付。
- **组合包(Bundle)**:Cordis 配置项 + 挂载代码的分发格式,`dsh.bundle` 指向其 patch 文件。
- **内置三层**:
  - `dsh-base`:每个 profile 的第一层——模型适配器、工具、持久化、沙箱与审批策略、设置、凭据、遥测
  - `dsh-web-app`:叠加浏览器应用
  - `dsh-headless`:叠加一次性运行器,完全不带服务器

查看自己机器上实际组合出的配置树:`dsh --profile web --dump-config`,打印出的任何条目都可以被你的 patch 替换——这就是"无需 fork"的落地方式。

### 2.3 五十多个核心包的架构地图

仓库 `packages/` 下的包按职责清晰分层:

| 领域 | 包 |
| --- | --- |
| 核心循环 | `core/session`、`core/system-prompt`、`core/tools`、`core/agent`、`core/agent-loop`、`core/scope` |
| LLM | `llm/llm`(消息与流式词汇、适配器 seam) |
| 智能体能力 | `subagent/`、`goal/`、`plan/`、`workflow/`、`schedule/`、`todo/` |
| 执行与安全 | `sandbox/`、`fs/`、`guard/`、`code-runtime/`、`subprocess/`、`shell/`、`terminal/`、`e2b/`、`jobs/` |
| 协议与集成 | `mcp/`、`lsp/`、`acp/`、`sdk/`、`api/` |
| 会话与上下文 | `context/`、`compaction/`、`session-query/`、`spill/`、`attachment/`、`feedback/`、`interaction/` |
| 基础设施 | `web/`、`client/`、`host/`、`storage/`、`credentials/`、`identity/`、`settings/`、`workspace/`、`bundle/`、`preset/`、`boot/`、`typert/` |

核心循环的六件套:`session`(会话日志,唯一真源)→ `system-prompt`(提示词组装)→ `tools`(工具注册表)→ `agent`(Agent 接口与注册表)→ `agent-loop`(默认驱动实现)→ `scope`(按 agent 作用域的原语)。其中 `agent-loop` 是公开 `Agent` 约定的**唯一具体实现**,但扩展插件只依赖 `agent` 接口而非 `agent-loop`,因此循环本身是可替换的。

## 三、核心循环:轮次与步骤

### 3.1 两个基本单位

- **Step(步骤)**:一次模型请求 + 它调用的工具。
- **Turn(轮次)**:零个或多个 step。它在领取首条输入时打开,在"不再欠下任何工作"时关闭。

### 3.2 轮次流程时序

官方文档给出了一条完整的时序图,这是理解整个循环的关键:

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

要点拆解:

1. **领取输入**:输入通过统一的 inbox 到达驱动器,有些消息立即唤醒它,注入的上下文则留在 inbox 等待被唤醒。
2. **`agent/pre-step` 决定模型看到什么**:监听器可以改写已领取的消息或拒绝它们;即使首次领取被拒绝/改空,也会关闭一个"不含步骤"的持久轮次,保证日志记录这次尝试。
3. **历史从日志派生**:每次请求都从会话日志投影出模型历史(`deriveMessages()`),而不是维护一份独立的"记忆"。
4. **工具执行经过三道关卡**:`tools/pre-execute`(前置策略)→ `tools/execute`(实际执行)→ `tools/post-execute`(后置策略),三者为 **waterfall(瀑布式)事件**,监听器必须调用 `next()` 才能委托下去;而 `agent/turn-stopping` 是 serial 事件,没有 `next()`——它是轮次的"刹车"。
5. **循环继续的条件**:工具请求了另一次模型请求,或者新的 next-step 输入到达 → 认领 → 进入下一步。

### 3.3 事件三域:会话事件 / Agent 事件 / 能力事件

dsh 的事件就是扩展点,选对事件域是大多数改动的第一个决定:

| 域 | 特性 | 典型用途 |
| --- | --- | --- |
| **会话事件**(`session/event`) | 追加到日志的**持久事实** | 需要在重新加载后仍存在的事实 |
| **Agent 事件**(`agent/*`) | 携带活跃 Agent:inbox、步骤、状态、请求、验证、续跑 | 观察或拦截进行中的工作 |
| **能力事件**(`fs/*`、`tools/*`、`telemetry/*`) | 无需导入循环即可附加策略与适配器 | 给 seam 挂策略 |

### 3.4 会话日志:"模型可见即已记录"

这是 dsh 最硬核的不变式之一:**凡是抵达模型请求的一切,都必须能从日志重建**。实现上:

- 会话日志是**仅追加**的 `SessionEvent` 事件流,是模型所见的唯一上下文来源
- 原始的 `assistant/chunk` 事件被保留,保证回放(UI 重演)和转录(transcript)的保真度
- **fork**(分支新会话)、**resume**(恢复)、**transcript**(导出文本)、遥测、持久化全部派生自这同一个事件流
- 因此新增一项"模型可见输入"就必须新增一个会话事件,并扩展 `SessionEventMap` 从日志渲染——架构上杜绝了"模型看到了但日志里没有"的状态漂移

## 四、工具系统:带守卫的执行流水线

工具系统(`packages/core/tools`)是 dsh 中我最欣赏的部分之一,它在"模型自由度"和"宿主可控性"之间划出了一条清晰的分界线。

### 4.1 `ToolDefinition` 的完整契约

一个已注册的工具由几部分组成:

- **`ToolSchema`**:面向模型的字段(名称/描述/参数),由注册表的 `schemas()` 通过**显式允许列表**构建——`output`、`execute`、`finalizeContent`、`timeoutMs`、`isConcurrencySafe`、`presentCall`、`presentResult` 这些宿主内部字段**绝不会泄漏到模型请求中**
- **`output`(必填)**:规范的输出契约,包含原始 JSON Schema 校验 + 纯函数投影 `render`(参数+值 → 模型内容)+ 可选的重放元数据
- **`execute`**:执行一次被接受的调用,返回规范的无损 JSON 值;必须响应 `exec.signal` 取消信号
- **`finalizeContent`**:最后一步内容转换,在结果物化前被调用一次,即使流水线失败也会执行
- **`timeoutMs`**:协作式超时预算,由 `dsh-tool-call-timeout-policy`(一个 `tools/execute` 包装器)强制执行,永不发送给模型
- **`isConcurrencySafe`**:声明该调用能否加入并行组(纯同步分类器)
- **`presentCall` / `presentResult`**:UI 展示函数,纯函数且无副作用——因为 UI 既要在流式过程中调用它,也要在会话日志回放时调用它

### 4.2 `defineTool` 与类型化 schema DSL

第一方工具不需要手写校验,而是用 `defineTool`——它会:

- 用 `ValueSchemaSpec` 词汇表(`string/number/integer/boolean/null/array/object/json/oneOf`)描述参数与输出
- 通过 `InferValue<S>` / `InferArgs<P>` 做**类型推断**:精确推断保持到 16 层容器,之后回退为 `JsonValue`,避免耗尽 TypeScript 类型实例化栈;运行时校验仍会遍历完整 schema
- 参数不匹配抛 `ToolArgsError`(`INVALID_ARGS`),输出无效抛 `ToolOutputError`(`INVALID_TOOL_OUTPUT`)

一个很硬的设计:**原始 JSON Schema 默认保持开放,不支持的关键字会被拒绝,而不是"不强制就放行"**——宁可报错,也不静默降级。

### 4.3 作用域与 `ToolRestriction`

`ToolRestriction` 是单个作用域对其继承工具的**实时过滤器**(`allow`/`deny` 列表):

- 多个限制取交集,再叠加该作用域**自身**的注册——自身注册不受约束
- 这保证了**被委派的子 agent 会保留其回报(report)所依赖的工具**:父 agent 可以限制子 agent 的工具集,但不会切断它的回报通道

### 4.4 执行 waterfall

一次工具调用经过 `tools/pre-execute → tools/execute → tools/post-execute` 三个瀑布式事件,每个阶段都可以被插件插入策略(超时、审批、沙箱包装、限流)。注册表通过"around-dispatch 信号替换"保留调用方的取消语义,但它无法硬杀同进程代码——所以契约要求工具必须协作地观察并转发 `exec.signal`。

## 五、子代理系统:能力 seam 的典范

### 5.1 seam 三角色模型

dsh 把"可替换能力"抽象为 **seam**,包含三个角色:

- **Service Definition**:声明接口(如 `ctx.subagents`)
- **Service Provider**:实现接口(如 in-process、Codex、Claude Code 后端)
- **Consumer**:使用接口的面向模型的工具

一个 seam 之所以能"替换一个提供方就改变整个产品",是因为消费者只依赖定义。文件系统与进程提供方共享同一个执行世界——把 `ctx.fs` 指向远程沙箱,也就把 Bash、PTY 和 LSP 一起搬了过去。

### 5.2 六个 subagent 提供方

`ctx.subagents` 与 bash 不同,**同一上下文中可共存多个提供方实现**,按名称注册:

- `dsh-subagent-spawn-in-process`:进程内生成
- `dsh-subagent-fork`:fork 子会话
- `dsh-subagent-acp`:通过 [ACP 协议](https://agentclientprotocol.com) 委派
- `dsh-subagent-codex` / `dsh-subagent-claude-code`:委派给其他产品
- `dsh-subagent-dsh-sdk`:通过 SDK 委派

面向模型的消费方包括:`dsh-tool-subagent`(按提供方委派)、`dsh-tool-subagent-control`(全局的 `send_message` / `interrupt_agent` / `list_agents` 控制工具)、`dsh-tool-subagent-report`(子作用域的 `report` 返回通道)。

### 5.3 能力声明与 "fail loud"

提供方通过静态描述符公布其启动时能力(`SubagentCapabilities`):`outputSchema`、`depthLimit`、`toolFilter`、`persona`。如果请求依赖提供方不具备的能力,会**在启动前被明确拒绝**(`SubagentError('UNSUPPORTED_CAPABILITY')`),绝不会"接受了再静默忽略"——这就是 dsh 反复强调的 **"fail loud, no silent degradation"** 原则。

### 5.4 单次启动请求与取消

`SubagentStartRequest` 包含 `label`、`prompt`、`parent`(提供 cwd、谱系与委派深度)、`signal`(取消通道)、以及可选的 `outputSchema` / `maxDepth` / `toolFilter` / `persona`。注意:`signal` 是**就绪前后唯一的取消通道**——在 run 发布前触发,提供方清理部分资源后拒绝 `start()`;在发布后触发,则取消该 run 剩余回合的工作。

### 5.5 可继续子代理

普通子 agent 是一次性 `start()`;而**可继续**子 agent 由"继续执行管理器"自行组合,通过唯一可选方法 `prepareContinuable` 把关(方法存在即能力,以 TypeScript 类型收窄作为发现机制)。配合 `listChildren()` / `listDescendants()` 的持久化枚举,父 agent 可以在子 agent 工作后继续给它派活——这就是"可继续 agent"生态(如多角色编排预设)的基础。

## 六、长期目标、计划与工作流

### 6.1 同会话目标(Goal)

目标系统是**事件溯源**的:`GoalId` 是品牌化 ID,调用方通过 `GoalRef`(id + revision)以 **CAS 语义**修改一个确切修订版本,每次获准的持久变更都会递增修订号。

- 持久阶段:`active` / `paused` / `blocked` / `complete`
- `blocked` 是唯一表示"因问题而停止"的持久状态,原因携带**机器可路由的 lower-kebab-case code** + 供人/模型阅读的说明
- 进程本地激活状态与持久阶段分离:持久阶段回答"目标发生了什么",激活状态回答"续跑消费方能否开始另一个 Round"——这对应实际运行中"每轮自动续跑,直到完成或被阻塞"的目标机制

### 6.2 工作流(Workflow)

工作流 seam 允许 agent 运行**由模型编写的编排脚本**(会启动子 agent 的脚本),同样是可选能力、不属于 agent loop:

- Provider:`dsh-workflow-worker-thread` —— 基于 `node:worker_threads`,**每个 run 一个 worker**,脚本的 vm 上下文位于其中
- Consumer:`dsh-tool-workflow`(模型通过 `{ script, meta, args }` 发起)
- 关键安全设计:引擎用 schema 校验 `meta`,且**绝不会通过对脚本文本求值**来获取元数据;`parent` 必填,脚本启动的每个子 agent 都归属于它

### 6.3 计划与定时

- `plan/`:计划能力(规划、审批、执行分离)
- `schedule/`:定时任务调度
- `todo/`:待办事项状态跟踪(对应运行时中的 `todo_write` 工具)

## 七、安全与沙箱

### 7.1 进程沙箱(Seam)

`ctx.sandbox` 把与宿主共享文件系统/内核的子进程 argv 包装进**文件效果策略**:

- 后端:`sandbox-local` 提供 **Linux bwrap/Landlock、macOS Seatbelt、Windows ACL** 受限令牌
- 消费方:`bash-sandbox`、`pwsh-sandbox`
- 模式词汇:`read-only`(只读,仅允许 `/dev/null` 等必需 sink)/ `workspace-write`(允许工作区根 + 后端承诺的临时区)/ `danger-full-access`(绕过隔离)
- **强制执行完整性**是后端报告的事实:`full` / `partial`(如旧 Landlock ABI、Windows ACL 的 Everyone 边界)——要求绝对保证的消费方必须拒绝或向上暴露这一区别
- 注意词汇边界:网络与进程可见性**不在此定义范围内**,由其他层负责

### 7.2 文件系统、审批与凭据

- `ctx.fs` seam:`fs/*` 事件可附加策略(读/写白名单、路径规则),对应运行时中可观测的"文件操作策略"
- `guard/`:审批与守卫策略(危险操作需要用户确认)
- `credentials/`、`identity/`:凭据安全存储与身份管理

## 八、Web UI 与客户端架构

- `web/` + `client/` 包构成浏览器应用:默认端口 **3080**,通过 `npx @deepseek-ai/dsh web` 启动;SSH 场景只打印宿主 URL,`--no-open` 可只起服务不开浏览器
- **事件驱动渲染**:UI 从 `ctx.agents` 读取活跃 agent,并从 `session/event` 事件流渲染对话——UI 本质上是会话日志的一个消费者,因此回放(重演历史)与实时一致
- **客户端插件与 HMR**:浏览器端插件可热更新,开发时对客户端插件的修改无需整页刷新(对应 `window.__DSH_BOOT__` 注入的启动机制)
- **协议层**:`acp/`(Agent Client Protocol 客户端)、`sdk/` 与 `api/` 包把 harness 暴露给其他应用/编辑器集成

## 九、可观测性与运维

- **会话日志**承担一切:fork、resume、transcript(导出文本)、遥测、持久化都派生自事件流
- **`compaction/`**:上下文压缩(长会话时把历史压缩,控制上下文窗口)
- **`jobs/` 后台任务**:通过 `ctx.jobs` 注册,`job_*` 工具负责收集结果或停止任务(对应运行时中的后台任务机制:任务在后台运行,完成后通知,可随时查输出或终止)
- **`feedback/`、`interaction/`**:用户反馈与交互通道

## 十、设计亮点与可借鉴之处

1. **事件溯源日志 = 唯一真源**:不维护模型"记忆"的私藏副本,一切从日志派生,天然支持 fork/回放/恢复/审计。"模型可见即已记录"是一条可以写成运行时不变量来强制的原则。
2. **一切皆插件、无特权内核**:连 agent loop 本身都可替换。这让"定制"从"改框架"降级为"挂插件",极大降低了生态参与门槛。
3. **Seam 三角色模型**:定义/提供/消费分离,替换提供方即改变整个产品(本地 fs ↔ 远程沙箱,子 agent 从进程内 ↔ 其他产品)。这是把"可扩展性"设计成"可替换性"的范例。
4. **Fail loud, no silent degradation**:能力不匹配在启动前就显式报错,JSON Schema 不支持的语法宁可拒绝也不"不强制放行"。宁可失败,也不让用户得到悄悄变弱的结果。
5. **类型驱动**:schema DSL + 16 层精确类型推断,让工具作者获得端到端的类型安全,同时运行时校验保持完整。
6. **清晰的能力边界**:沙箱只管文件效果,网络/进程可见性另行负责;工具契约区分"模型可见"与"宿主内部"——每一条分界线都降低了出安全问题的概率。

## 参考链接

- 官方仓库:https://github.com/deepseek-ai/deepseek-harness("Everything is a Plugin")
- 架构文档:https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md
- 子系统文档(工具/子代理/核心/会话/目标/工作流/沙箱/任务):https://github.com/deepseek-ai/deepseek-harness/tree/master/docs/subsystems
- Cordis 框架:https://github.com/cordiverse/cordis · 论文:https://github.com/cordiverse/paper
- 深度解读:《DeepSeek Harness:当"一切皆插件"成为 Agent 的新底座》 https://developer.aliyun.com/article/1756806
