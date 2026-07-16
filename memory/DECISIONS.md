# 决策记录

本文件由 `memory/decisions/` 中的独立决策文件同步生成。独立决策文件是结构化决策与复审状态的事实来源。

## 有效决策

### 2026-07-14 - 以集中式 CLI 契约和安全预检作为命令边界

- 背景：旧 CLI 的帮助文本、解析规则和实际命令分散，未知选项与多余参数可能被静默忽略，旧记忆迁移也缺少完整预检和回滚。
- 决策：以 cli-catalog.js 作为帮助、命令发现和用法校验的单一事实源；用法错误统一返回退出码 2；所有记忆写入先做长度与敏感值检查；迁移必须先生成完整计划、拒绝冲突和空目标、失败时回滚，并提供 dry-run。
- 备选方案：继续在各命令内部零散校验，或引入第三方 CLI 框架；前者会继续漂移，后者增加依赖和迁移成本。
- 影响文件/模块：plugins/project-guardian/scripts/lib/cli-catalog.js, guardian.js, shared.js, migrate.js, decisions.js, update.js, reviews.js, guardian-cmd.js, Run/lib/commands.js
- 关联变更：Project Guardian 0.5.0 CLI 全面审计与优化
- 验证方式：109 项自动化测试、npm audit 0 漏洞、npm pack dry-run、插件 manifest 校验和 CLI 冒烟。
- 风险：严格校验可能暴露依赖旧版静默忽略行为的调用方；通过旧别名、旧错误文案回归测试和命令级帮助降低兼容风险。
- 复审时间：2026-08-14
- 后续动作：在真实 Windows 和 Linux、Run 浏览器以及至少一个 MCP AI IDE 中复核命令发现、退出码和迁移流程。
- 决策文件：`memory/decisions/2026-07-14-以集中式-cli-契约和安全预检作为命令边界.md`

### 2026-07-12 - 架构与耦合度分析：识别 10 个问题并制定改进优先级

- 背景：项目已经过多轮模块拆分，但工具函数在 3-6 个文件中各自复制、核心记忆文件列表有 5 套不一致定义、config.js 对 adapters.js 和 mcp.js 存在循环依赖隐患、guardian.js 仍有 600 行承担路由编排和工具函数三重职责、Run 层直接 import 4 个插件内部模块且重复 spawn 和 appendLimited 实现、两套审计日志重复实现 redactLikelySecret、密钥检测有 3 套不一致正则
- 决策：将问题按 P0-P3 优先级排序：P0 提取 lib/shared.js 统一工具函数和核心记忆文件列表；P1 继续 guardian.js 拆分和 config.js 解耦；P2 统一审计和密钥检测；P3 拆分 Run/server.js 和 knowledge.js 展示逻辑
- 备选方案：一次性全部重构风险太高；只记录不改动无法改善现状；只修 P0 可以缓解最严重重复但不解决架构问题
- 影响文件/模块：plugins/project-guardian/scripts/guardian.js, plugins/project-guardian/scripts/lib/config.js, plugins/project-guardian/scripts/lib/adapters.js, plugins/project-guardian/scripts/lib/security.js, plugins/project-guardian/scripts/lib/manual-memory.js, plugins/project-guardian/scripts/lib/knowledge.js, plugins/project-guardian/scripts/lib/mcp.js, Run/server.js, Run/lib/commands.js, Run/lib/audit.js, plugins/project-guardian/cmd/guardian-cmd.js
- 关联变更：未指定。
- 验证方式：本次为只读分析，未修改源码；后续实施时需运行 npm run lint && npm test && guardian verify && git diff --check
- 风险：重构可能引入回归；需保持零依赖和 Windows 兼容；Run 层与插件内部耦合的改动需同步测试；security.js 的 config.memory fallback 与其他实现不一致，统一时需确保不破坏旧行为
- 复审时间：2026-08-12
- 后续动作：按优先级逐步实施重构，P0 先建 lib/shared.js，每步完成后运行 guardian verify 和全量测试
- 决策文件：`memory/decisions/2026-07-12-10.md`

### 2026-07-12 - 以独立决策文件为事实源并增加确定性记忆修复

- 背景：决策总索引曾因错误转码和追加顺序漂移而损坏，但独立决策文件仍可恢复大部分历史。
- 决策：将 memory/decisions/*.md 作为结构化决策与复审状态的事实源；guardian repair-memory 默认只读，只有 --write 才稳定排序 changelog 并重建决策索引；validate-docs 强制检查编码完整性和最新在前顺序。
- 备选方案：继续只维护单一 DECISIONS.md，或自动覆盖所有记忆而不要求显式确认，或引入数据库。
- 影响文件/模块：plugins/project-guardian/scripts/lib/memory-repair.js, plugins/project-guardian/scripts/lib/doc-validation.js, plugins/project-guardian/scripts/lib/decisions.js, memory/decisions
- 关联变更：未指定。
- 验证方式：npm run lint, npm test, guardian validate-docs, guardian verify, npm pack --dry-run
- 风险：独立决策文件缺失时无法凭空恢复历史，因此迁移前必须补齐事实源并审阅修复 diff。
- 复审时间：2026-08-12
- 后续动作：收集真实项目中的损坏与漂移案例，继续降低误报并验证跨平台行为。
- 决策文件：`memory/decisions/2026-07-12-以独立决策文件为事实源并增加确定性记忆修复.md`

### 2026-07-12 - 安全审计与全面质量修复

- 背景：对全部源码进行深度安全审计后发现多个安全漏洞和代码质量问题
- 决策：修复所有 P0/P1 安全问题并补充测试覆盖
- 备选方案：暂无记录。
- 影响文件/模块：未指定。
- 关联变更：未指定。
- 验证方式：运行 lint、84 个测试和 guardian verify
- 风险：部分修复仍需真实 CI 和 AI IDE 联调验证
- 复审时间：2026-08-12
- 后续动作：继续拆分 guardian.js、增加并发测试、增加国际化机制
- 决策文件：`memory/decisions/2026-07-12-decision-1783815120812.md`

### 2026-06-08 - 新增 AI IDE 受控命令层

- 背景：AI IDE 经常需要执行 Git、npm、Node 和 Guardian 命令，如果直接运行系统 shell，缺少统一轨迹，也难以约束参数和审计边界。
- 决策：新增 plugins/project-guardian/cmd/guardian-cmd.js，提供固定命令目录和 guardian-cmd bin；AI 规则模板与 VS Code tasks 优先使用 guardian-cmd；每次调用自动写入 .project-guardian/cmd-audit.jsonl，且不开放任意 shell。
- 备选方案：继续直接运行原始 shell；只依赖 Run 审计；做任意 shell 代理。
- 影响文件/模块：plugins/project-guardian/cmd/guardian-cmd.js, plugins/project-guardian/cmd/README.md, package.json, tests/guardian.test.js, AI rule templates, VS Code tasks, Project Guardian docs
- 关联变更：新增 `guardian-cmd` package bin、受控命令目录、VS Code tasks 改造、AI 规则模板改造和命令审计文档。
- 验证方式：运行 `node --check`、`guardian-cmd list`、受控命令相关测试、VS Code adapter 回归测试、`guardian-cmd npm-lint`、`guardian-cmd npm-test`、`guardian-cmd guardian-verify`、`guardian-cmd git-diff-check` 和 `guardian-cmd npm-audit`。
- 风险：白名单不能覆盖所有命令；本地 JSONL 不是企业集中审计；没有替代项时仍可能临时直跑 shell。
- 复审时间：2026-07-08
- 后续动作：根据真实 AI IDE 高频命令继续补充受控命令 ID；企业审计场景再接集中日志或不可变存储。
- 决策文件：`memory/decisions/2026-06-08-ai-ide.md`

### 2026-06-08 - 先用零依赖混合检索增强 query，再保留可选向量检索路线

- 背景：同类项目中已有向量检索、SQLite 后端或知识图谱方案；Project Guardian 当前最主要短板是纯关键词查询会随着记忆文件增多而退化，但目标用户仍需要开箱即用、无数据库、无 API Key 的轻量方案。
- 决策：先把 `query` 从纯关键词计数升级为本地混合检索，结合关键词、同义词扩展、n-gram 相似度、文件路径权重和知识文件优先级；同时新增 `CONTRIBUTING.md`，把查询增强和测试标准写成贡献入口。可选向量索引和 RAG 作为后续增强，不进入默认依赖路径。
- 备选方案：立即引入向量数据库或外部 embedding API；保持纯关键词；只通过文档提醒用户换关键词；把查询交给 MCP 客户端自行实现。
- 影响文件/模块：`plugins/project-guardian/scripts/lib/knowledge.js`、`tests/guardian.test.js`、`CONTRIBUTING.md`、`package.json`、README、Project Guardian 文档和项目记忆文件。
- 关联变更：query 输出新增 `Matched:` 匹配词；测试覆盖中英文同义表达、记忆优先、源码兜底和中文查询；package 发布范围纳入贡献文档。
- 验证方式：运行 knowledge 语法检查、查询目标测试、完整 lint、全量测试、`guardian verify`、diff check 和 npm audit。
- 风险：混合检索仍不是向量检索，表达跨度很大或记忆规模非常大时仍可能漏掉最佳答案；同义词表需要真实项目反馈持续补充；后续引入向量能力时必须保持默认零依赖路径可用。
- 复审时间：2026-07-08
- 后续动作：收集真实 query 失败案例，优先补同义词、分片策略、字段权重和摘要缓存；确认需要后再设计可选向量索引。
- 决策文件：`memory/decisions/2026-06-08-hybrid-search-and-contributing.md`

### 2026-06-05 - 拆分决策复审交接模块并增强 Run 本地审计

- 背景：此前剩余风险是 guardian.js 仍保留 decision/reviews/handover 编排，Run 审计也只是项目本地 JSONL，缺少完整性提示和访问口令。
- 决策：将 decision add、reviews 和 handover 生成拆到独立 CLI 模块；Run 审计拆到 Run/lib/audit.js，并为新审计记录增加 hash 链校验和可选 GUARDIAN_RUN_TOKEN API 保护。
- 备选方案：继续保留在 guardian.js 和 Run/server.js；一次性引入企业集中审计服务；直接开发完整登录系统。
- 影响文件/模块：plugins/project-guardian/scripts/guardian.js, plugins/project-guardian/scripts/lib/decisions.js, plugins/project-guardian/scripts/lib/reviews.js, plugins/project-guardian/scripts/lib/handover.js, Run/lib/audit.js, Run/server.js, Run/public/app.js, tests/guardian.test.js, Run/README.md, plugins/project-guardian/docs/CLI_AND_CI.md
- 关联变更：未指定。
- 验证方式：npm.cmd run lint; npm.cmd test; node plugins/project-guardian/scripts/guardian.js verify; git diff --check
- 风险：Run hash 链只能发现本地日志异常，不是不可篡改或集中审计；GUARDIAN_RUN_TOKEN 是轻量本地口令，不是完整登录鉴权；guardian.js 仍保留部分命令编排。
- 复审时间：2026-07-05
- 后续动作：真实团队使用后评估是否需要集中审计采集、不可变存储、登录鉴权、Run API 路由拆分，以及继续拆分 init/update/check/doctor/query/hooks/CI。
- 决策文件：`memory/decisions/2026-06-05-cli-run-audit.md`

### 2026-06-05 - 继续拆分 Git 与安全扫描并引入 Run 服务端审计日志

- 背景：guardian.js 仍然保留 Git diff、文件扫描和安全扫描细节，Run 操作日志也还只是浏览器本地短记录，不足以支撑后续维护和本机追踪。
- 决策：新增 git-utils.js 承接 Git/diff/文件扫描，新增 security.js 承接 scan-secrets；Run 后端新增 .project-guardian/run-audit.jsonl 服务端本地审计日志和 /api/audit-log，只记录操作摘要并避免记录 query/brief 问题原文或手动记忆正文。
- 备选方案：继续把 Git 与安全扫描留在 guardian.js；只保留浏览器 localStorage 操作日志；立即接入企业集中审计系统。
- 影响文件/模块：plugins/project-guardian/scripts/guardian.js, plugins/project-guardian/scripts/lib/git-utils.js, plugins/project-guardian/scripts/lib/security.js, Run/server.js, Run/public/index.html, Run/public/app.js, Run/public/styles.css, tests/guardian.test.js, package.json, .gitignore
- 关联变更：继续处理 guardian.js 未完全拆分和 Run 操作日志不够正式的剩余风险。
- 验证方式：npm.cmd run lint; npm.cmd test
- 风险：服务端审计日志是本机 JSONL，不是带登录鉴权和集中留存的企业审计；guardian.js 仍然保留 decision/reviews/handover 等命令编排，后续还能继续拆分。
- 复审时间：2026-07-05
- 后续动作：观察真实使用中是否需要审计日志导出、集中采集、Run API 路由拆分，以及继续拆分 decision/reviews/handover。
- 决策文件：`memory/decisions/2026-06-05-git-run.md`

### 2026-06-04 - 拆分 CLI 核心模块并增强 Run 写入前可见性

- 背景：`plugins/project-guardian/scripts/guardian.js` 仍然偏大，配置加载、文档校验、query/brief 检索等逻辑和命令编排混在一起；同时 Run 控制台的命令数量增加后，用户需要更快查找命令，并在执行写入类命令前看见当前 Git 改动状态。
- 决策：新增 `plugins/project-guardian/scripts/lib/config.js`、`plugins/project-guardian/scripts/lib/doc-validation.js` 和 `plugins/project-guardian/scripts/lib/knowledge.js`，分别承接配置默认值/加载/校验、核心记忆文档质量检查、query/brief 检索与读取计划格式化；Run 控制台新增命令搜索、短操作日志和 `/api/diff-preview` 固定只读 Git 预览。
- 备选方案：继续把逻辑留在 `guardian.js`；一次性把所有 CLI 命令拆成很多文件；Run 控制台开放自定义 Git 命令或任意 shell 预览。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/config.js`、`plugins/project-guardian/scripts/lib/doc-validation.js`、`plugins/project-guardian/scripts/lib/knowledge.js`、`Run/server.js`、`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`Run/README.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`tests/guardian.test.js` 和项目记忆文件。
- 关联变更：`package.json` 的 lint 纳入新模块；测试直接覆盖配置模块、文档校验模块、knowledge 模块、Run 命令搜索、Run diff preview API 和页面节点；Run diff preview 只执行固定 `git status --short`、`git diff --stat` 和 `git diff --cached --stat`。
- 验证方式：运行 `npm.cmd run lint`、`npm.cmd test`、`guardian verify`、安全审计、diff 空白检查和 Run UI 浏览器冒烟。
- 风险：`guardian.js` 仍然保留 Git、handover、decision、reviews、安全扫描和命令编排，后续还可以继续小步拆分；Run 操作日志保存在浏览器本地，只是辅助查看，不能替代 `AI_CHANGELOG.md`、Git 历史或正式审计；diff preview 是只读摘要，不展示完整补丁。
- 复审时间：2026-07-04。
- 后续动作：观察真实使用中是否需要把 Run API 路由继续拆成模块、为 diff preview 增加完整补丁查看或导出操作日志。
- 决策文件：`memory/decisions/2026-06-04-cli-module-and-run-ops.md`

### 2026-06-04 - 共享手动记忆模板给 CLI 和 Run 控制台

- 背景：Run 控制台已经提供手动追加记忆，但如果模板、敏感词拦截和追加格式只存在于网页后端，就会让 CLI 与控制台能力分叉；同时，命令操作模块把复杂参数字段直接放在卡片里会让零基础用户难以填写。
- 决策：新增 `plugins/project-guardian/scripts/lib/manual-memory.js`，集中维护核心记忆白名单、追加记忆模板、字段校验、基础敏感词拦截和追加格式；Run 控制台从该模块读取模板并用弹窗收集命令参数；CLI 新增 `guardian append-memory` 使用同一套模板。
- 备选方案：继续让 Run 后端单独维护追加记忆逻辑；只保留自由文本追加；把所有手动补充都要求用户使用 `guardian update` 或直接编辑 Markdown。
- 影响文件/模块：`plugins/project-guardian/scripts/lib/manual-memory.js`、`plugins/project-guardian/scripts/guardian.js`、`Run/server.js`、`Run/public/app.js`、`Run/public/index.html`、`Run/public/styles.css`、`tests/guardian.test.js`、Project Guardian 文档和项目记忆文件。
- 关联变更：`guardian append-memory --templates` 可查看模板；Run `/api/status` 暴露 `memoryAppendTemplates`；命令操作模块对写入类或带参数命令使用弹窗输入。
- 验证方式：运行 `npm.cmd run lint`、`npm.cmd test`、`guardian append-memory` 回归测试、Run API 模板化追加测试和最终 `guardian verify`。
- 风险：模板字段可能无法覆盖所有团队表达习惯；基础敏感词拦截不是完整 DLP；Run 仍无内置鉴权，不能公网暴露。
- 复审时间：2026-07-04。
- 后续动作：观察真实用户是否需要更多模板、模板搜索、写入前 diff 预览、操作审计或 MCP 追加记忆工具。
- 决策文件：`memory/decisions/2026-06-04-manual-memory-template-sync.md`

### 2026-06-04 - 拆分 Run 命令目录模块

- 背景：`Run/server.js` 同时负责本地 HTTP server、静态文件服务、API 路由、CLI 子进程执行、固定命令目录、写入参数构造和字段校验，后续新增命令时容易让服务端主流程继续变大。
- 决策：新增 `Run/lib/commands.js`，把 Run 控制台的 CLI 命令定义、公开给前端的命令描述、写入类命令参数构造、适配器列表校验和复审路径校验集中到独立模块；`Run/server.js` 只引用该模块并保留 HTTP/API/执行边界。
- 备选方案：继续把命令目录放在 `Run/server.js`；把 Run 命令目录并入核心 `guardian.js`；立即为每个命令做单独后端文件。
- 影响文件/模块：`Run/lib/commands.js`、`Run/server.js`、`tests/guardian.test.js`、`package.json`、`Run/README.md`、`explain/PROJECT_FILES_EXPLANATION.md`、项目记忆文件。
- 关联变更：`npm run lint` 纳入新模块；测试直接覆盖命令参数构造、非法适配器拒绝、越界复审路径拒绝和公开命令信息。
- 验证方式：运行 `npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify` 和 `git diff --check`。
- 风险：Run 命令目录仍然是固定白名单，不是权限系统；写入类命令仍会修改目标项目文件，必须继续依赖确认词、Git diff、代码评审和 `guardian verify`。
- 复审时间：2026-07-04。
- 后续动作：真实使用后观察是否需要命令搜索、写入前 diff 预览、操作日志，或进一步把 Run API 路由拆成独立模块。
- 决策文件：`memory/decisions/2026-06-04-run-command-catalog-module.md`

### 2026-06-03 - 扩展 Run 命令操作为受控 CLI 命令目录

- 背景：Run 原本只暴露少量检查命令。用户需要在网页里看见 Guardian CLI 的完整能力，但 Web server 不能变成任意 shell。
- 决策：在 `Run/server.js` 新增后端固定命令目录，并把命令分为 `read`、`write`、`linked` 和 `terminal`。只读命令可直接运行。写入类命令必须输入 `RUN_COMMAND`。`init`、`brief` 和 `query` 引导到专用 UI 模块。`mcp` 仍只适合在终端或 AI IDE 配置中启动。
- 备选方案：继续只保留少量只读按钮；增加自由命令输入框；把全部写入命令继续完全留给 CLI/MCP。
- 影响文件/模块：`Run/server.js`、`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`Run/README.md`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`tests/guardian.test.js`。
- 关联变更：知识查询模块现在拥有独立输出记录。侧边栏可以平滑收起和展开。`decision add` 暴露完整结构化决策字段。`install-adapters` 接受逗号分隔适配器列表。
- 验证方式：运行 `node --check`、`npm.cmd run lint`、`npm.cmd test`、`guardian verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、本地 UI/API 冒烟和 `npm.cmd pack --dry-run`。
- 风险：`RUN_COMMAND` 能降低误点风险，但不是登录认证或权限系统。Run 除非由团队额外加认证、访问控制、反向代理保护和审计日志，否则仍应只在本机使用。写入类命令仍需要 Git diff 审查和 `guardian verify`。
- 复审时间：2026-07-03。
- 后续动作：观察真实使用情况，再决定是否需要命令搜索、分组折叠、写入前预览、diff 预览或操作审计日志。
- 决策文件：`memory/decisions/2026-06-03-run-command-catalog.md`

### 2026-06-03 - Add isolated Run visual layer

- 背景：Project Guardian 已经有 CLI、MCP 和规则适配器，但完全依赖命令行会让零基础用户或管理者查看状态、运行检查和查询项目记忆时有门槛。
- 决策：新增根目录 `Run/` 作为可选可视化运行层，保存本地 Web server、静态页面、样式、浏览器交互和说明文档。`Run/` 和核心插件代码隔离，但通过 package `files` 随插件一起发布。
- 备选方案：把可视化代码塞进 `plugins/project-guardian/scripts/guardian.js`；单独做独立仓库；立即做 Electron/VS Code 原生扩展。
- 影响文件/模块：`Run/*`、`package.json`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/*`。
- 关联变更：`npm run ui` 启动 `node Run/server.js`；Run server 默认监听 `127.0.0.1`，`/api/command` 只开放只读命令白名单，记忆读取和追加只允许核心记忆文件白名单并优先使用 `project-guardian.config.json` 路径；前端使用侧边栏切换功能页，首页只显示状态概览，核心记忆预览用轻量 Markdown 渲染标题、列表、代码块和表格；初始化必须输入 `RUN_INIT`，手动追加记忆必须输入 `APPEND_MEMORY`，后端拒绝疑似密钥内容，不提供任意 shell。
- 验证方式：运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check` 和本地 UI/API 冒烟测试；发布前补跑 `npm.cmd pack --dry-run` 确认 `Run/` 被打入包。
- 风险：当前 Web UI 没有内置认证，不能直接公网暴露；手动追加记忆只有基础敏感词拦截，不能替代 `guardian verify`、代码评审和人工安全审查；后续复杂写入类命令仍应增加预览和审计。
- 复审时间：2026-07-03。
- 后续动作：观察真实用户是否需要写入 diff 预览、操作日志、复审日历、记忆搜索或桌面窗口包装。
- 决策文件：`memory/decisions/2026-06-03-run-visual-layer.md`

### 2026-06-03 - Add budget-aware memory briefing before full reads

- Context: If AI agents read every core memory file on every turn, Project Guardian will preserve handover context but may add too much token cost for routine tasks.
- Decision: Add `guardian brief` and MCP `guardian_brief` as a first-step routing mechanism. AI rules now default to reading `memory/PROJECT_CONTEXT.md` and `memory/STATE.md` first, then only reading `memory/DECISIONS.md`, `memory/AI_CHANGELOG.md`, or `memory/HANDOVER.md` when the task makes them relevant. After risk review, add explicit `quick`, `deep`, and `full` modes so agents can intentionally escalate instead of treating budget-aware reading as a hard limit.
- Alternatives considered: Build RAG/vector search now; keep full memory reads every turn; rely on human discipline; build IDE-native plugins before the CLI/MCP layer is mature.
- Affected files/modules: `plugins/project-guardian/scripts/guardian.js`, `plugins/project-guardian/scripts/lib/mcp.js`, `tests/guardian.test.js`, adapter templates, VS Code tasks, README, Project Guardian docs, zero-basic tutorial, file explanation, and `memory/*`.
- Related change: `guardian brief "token 成本控制" --limit 2` recommends core memory plus decisions and estimates about 51% savings versus full core memory; `guardian brief "新人接手" --limit 2` recommends core memory plus handover and estimates about 63% savings. `guardian brief "修复登录回归" --mode deep --limit 2` now forces decisions and changelog, while `--mode full` forces all core memory.
- Verification: Run lint, tests, `guardian brief` smoke checks, `guardian verify`, audit, and diff check.
- Risks: Token estimates are approximate; keyword routing may miss semantic relevance; `deep` and `full` intentionally spend more context when risk rises; if core memory grows too large, a short summary file or MCP resource layer may still be needed.
- Follow-up: Review real AI IDE behavior after teams adopt the new rules, then decide whether to add summaries, pagination, cached excerpts, or vector retrieval.
- 决策文件：`memory/decisions/2026-06-03-token-budget-briefing.md`

### 2026-06-02 - Add decision review detection and completion workflow

- 背景：决策文件已经有 `Review after` / `复审时间` 字段，但没有自动发现到期复审、完成复审和停止后续提醒的机制。
- 决策：新增 `guardian reviews`、`guardian reviews due` 和 `guardian reviews complete`，扫描 `memory/decisions/*.md` 的复审时间；到期未完成时 `guardian verify` 失败；复审完成后在对应决策文件追加复审结果，并写明“无需继续复审”。
- 备选方案：继续只靠人工查看决策文件；把复审做成复杂数据库任务系统；只在文档里提醒但不进入质量闸门。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/mcp.js`、`tests/guardian.test.js`、README、Project Guardian 文档和项目记忆文件。
- 关联变更：MCP 新增 `guardian_reviews_due` 和 `guardian_review_complete`；package scripts 新增 `guardian:reviews`；`verify` 新增 `reviews` 步骤。
- 验证方式：新增回归测试覆盖到期复审阻塞 `verify`、完成复审后恢复通过、MCP 只读隐藏写入工具和 package scripts；运行 lint、测试和完整 verify。
- 风险：复审检测依赖标准字段名和日期格式；手工写坏字段时仍可能需要人工修正或后续增强解析。
- 复审时间：2026-07-02。
- 后续动作：观察真实团队是否需要交互式复审、复审责任人字段、复审历史列表或配置化提前提醒。
- 决策文件：`memory/decisions/2026-06-02-decision-review-workflow.md`

### 2026-06-02 - Add strict MCP schema validation and query limit

- 背景：MCP 客户端如果传入多余参数或错误类型，旧实现会让 CLI 静默忽略部分无效字段；如果 `mcp.allowedTools` 配置写错，`doctor` 能发现，但直接启动 MCP 时仍有配置误用风险。`guardian_query` 固定返回 6 个片段，也不利于控制 token 成本。
- 决策：MCP server 启动时强校验 `mcp` 配置；工具调用时按 schema 拒绝多余参数、错误类型和越界值；`guardian query` 和 MCP `guardian_query` 增加 `limit`，范围 1 到 10。
- 备选方案：继续只依赖 `doctor`；只在文档提示参数格式；把查询结果固定缩短但不提供用户控制。
- 影响文件/模块：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、README、Project Guardian 文档和项目记忆文件。
- 关联变更：`guardian_query.limit` 映射到 CLI `--limit`；`guardian.js` 复用 MCP 配置校验；新增 MCP 环境只读、参数校验、启动失败和 query limit 回归测试。
- 验证方式：运行 lint、Node 测试套件、完整 `guardian verify`、审计、diff check 和 package dry-run。
- 风险：这仍是本地工具边界，不是身份认证；`limit` 只能减少返回片段，不能保证语义命中率。
- 复审时间：2026-07-02。
- 后续动作：真实 MCP 客户端接入后，观察是否需要默认更小的 MCP limit、分页查询、摘要模式或 MCP prompts/resources。
- 决策文件：`memory/decisions/2026-06-02-mcp-schema-and-query-limit.md`

### 2026-06-02 - Add MCP tool gating before deeper IDE integrations

- 背景：`guardian mcp` 已经能让 AI IDE 直接调用本地 Project Guardian 命令，其中 `guardian_update`、`guardian_decision_add` 和 `guardian_handover` 会写入项目记忆。
- 决策：新增项目级 MCP 工具限制，默认保持全部工具可用；通过 `mcp.readOnly` 隐藏并阻止写入类工具，通过 `mcp.allowedTools` 只暴露指定工具，并允许 `PROJECT_GUARDIAN_MCP_READ_ONLY=1` 临时强制只读。
- 备选方案：默认只读；为 MCP 做完整身份认证；继续只依赖文档提醒和代码评审。
- 影响文件/模块：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`、`project-guardian.config.json`、`tests/guardian.test.js`、Project Guardian 文档和记忆文件。
- 关联变更：MCP `tools/list` 会按配置返回工具，`tools/call` 会拒绝被禁用工具；`doctor` 会校验 `mcp.readOnly` 和 `mcp.allowedTools`。
- 验证方式：运行 lint、Node 测试套件、MCP 只读/允许列表回归测试、完整 `guardian verify` 和 MCP 只读冒烟测试。
- 风险：这是工具过滤，不是身份认证或逐次审批；接入高风险环境仍要保留仓库权限、Git 权限、代码评审和安全扫描。
- 复审时间：2026-07-02。
- 后续动作：真实 MCP 客户端接入后，评估是否需要 prompts/resources、权限细化、审计日志或官方 SDK 集成。
- 决策文件：`memory/decisions/2026-06-02-mcp-tool-gating.md`

### 2026-06-02 - Reject placeholder midnight time in the latest AI changelog entry

- 背景：项目记忆中多条 AI 变更日志被手写为 `00:00`，导致交接时难以判断真实修改时间和先后顺序。
- 决策：不批量重写旧历史；从本次修复开始，`validate-docs` 只检查最新一条 changelog，如果标题时间是 `00:00` 则失败。最新记录按文件顶部第一条 `###` 记录判断。
- 备选方案：批量修改全部旧记录；完全依赖人工注意；只修 `timestamp()` 而不加质量闸门。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、`memory/AI_CHANGELOG.md` 和 Project Guardian 文档。
- 关联变更：`latestChangelogText` 改为取第一条记录；新增 `hasMidnightTimestamp` 校验；文档说明新记录必须使用真实本地 `YYYY-MM-DD HH:mm` 时间。
- 验证方式：运行新增回归测试和完整 `guardian verify`。
- 风险：真实 00:00 整点生成的记录也会被要求人工修正为更可区分的时间。
- 复审时间：2026-07-02。
- 后续动作：观察团队是否还会手写占位时间，必要时在 `guardian update` 输出中增加更明显提示。
- 决策文件：`memory/decisions/2026-06-02-precise-changelog-time.md`

### 2026-05-28 - Expose Project Guardian MCP server

- 背景：AI IDE 规则文件可以提醒模型读取项目记忆，但不能直接调用 Project Guardian 的查询、更新、验证和决策记录能力。
- 决策：新增 `guardian mcp` stdio MCP server，使用独立 `scripts/lib/mcp.js` 维护工具定义和 CLI 子命令映射；主 CLI 只负责分发 `mcp` 命令。
- 备选方案：暂时只保留规则文件适配器；引入 MCP SDK 依赖；或为每个 IDE 分别开发原生插件。
- 影响文件/模块：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/*`。
- 关联变更：MCP 暴露 `guardian_query`、`guardian_update`、`guardian_decision_add`、`guardian_verify`、`guardian_doctor`、`guardian_scan_secrets`、`guardian_handover`、`guardian_conflicts` 和 `guardian_adapters_doctor`。
- 验证方式：运行 lint、Node 测试套件、MCP initialize/tools/list/tools/call 冒烟测试和完整 `guardian verify`。
- 风险：当时 MCP 尚无工具限制，工具调用会执行本地 Guardian 命令；2026-06-02 已新增 `mcp.readOnly` 和 `mcp.allowedTools` 缓解误调用风险，但接入时仍必须依赖本地仓库权限、Git 权限、代码评审和密钥扫描。
- 复审时间：2026-06-28。
- 后续动作：观察真实 IDE 接入反馈，再考虑 MCP prompts/resources、权限细化或官方 SDK 集成。
- 决策文件：`memory/decisions/2026-05-28-mcp.md`

### 2026-05-15 - 扩展 AI IDE 规则适配器

- 背景：Project Guardian 需要明确支持 Codex、Cursor、VS Code、Copilot、Windsurf、Cline、Continue、Claude Code、Gemini CLI 等主流 AI 编程环境，避免用户以为插件只绑定 Codex。
- 决策：保持 CLI 作为所有 IDE 的通用调用层，同时扩展规则文件适配器，新增 windsurf、cline、continue、claude、gemini、vscode 和 vscode-copilot 别名，并新增 guardian adapters doctor 显示每个 IDE 适配状态。
- 备选方案：暂无记录。
- 影响文件/模块：plugins/project-guardian/scripts/lib/adapters.js, plugins/project-guardian/scripts/guardian.js, plugins/project-guardian/assets/templates/*, tests/guardian.test.js, README.md, plugins/project-guardian/docs/*
- 关联变更：未指定。
- 验证方式：运行 npm.cmd run lint、npm.cmd test、guardian adapters doctor、guardian verify 和 npm.cmd pack --dry-run。
- 风险：规则文件适配依赖各 IDE 当前约定；VS Code 目前是 tasks + Copilot instructions，不是原生扩展；后续如 IDE 规则格式变化，需要更新模板。
- 复审时间：2026-06-15
- 后续动作：guardian mcp 已在 2026-05-28 实现；后续观察真实 IDE 接入反馈，再考虑 VS Code 扩展或 JetBrains 插件。
- 决策文件：`memory/decisions/2026-05-15-ai-ide.md`

### 2026-05-15 - 默认使用中文项目记忆

- 背景：目标使用者主要是中文团队和编程经验较少的实习生，英文模板会增加理解成本，也容易让 AI 生成的交接记录脱离实际工作语言。
- 决策：Project Guardian 默认使用 `zh-CN` 模板，同时保留 `guardian init --language en` 给英文团队使用。校验、更新、交接、决策和 AI 工具适配规则必须兼容中英文。
- 备选方案：继续只维护英文模板；或只维护中文模板并移除英文支持。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/zh-CN/`、`project-guardian.config.json`、README、插件文档和测试。
- 关联变更：新增语言配置、中文模板、双语校验规则、中文 query 分词测试，并修复英文初始化仍生成中文规则的问题。
- 验证方式：运行 lint、测试、`guardian verify`、语言初始化冒烟测试和 package dry-run。
- 风险：已有项目反复切换语言会让后续记忆记录中英混杂。
- 复审时间：未安排。
- 后续动作：根据真实团队反馈继续补充中文文案和 AI 工具适配模板。
- 决策文件：`memory/decisions/2026-05-15-default-chinese-memory.md`

### 2026-05-15 - 集中使用 memory 目录保存项目记忆

- 背景：项目记忆散落在根目录和 docs 目录时，随着文档增多会让项目根目录变乱，也容易让新接入项目不知道哪些文件属于 Project Guardian 记忆。
- 决策：将默认项目记忆路径迁移到根目录 memory 文件夹，核心记忆文件和单独决策文件都放在 memory 下；CLI 默认配置、项目配置、AI 规则、文档和测试同步使用新路径。
- 备选方案：暂无记录。
- 影响文件/模块：plugins/project-guardian/scripts/guardian.js, project-guardian.config.json, memory/*, tests/guardian.test.js, Project Guardian docs and adapter templates
- 关联变更：未指定。
- 验证方式：运行 doctor、validate-docs、lint、test、verify 和临时目录 init 冒烟测试。
- 风险：已有项目如果保留旧 project-guardian.config.json，CLI 会继续尊重旧配置；迁移旧项目时需要同步更新配置或重新初始化。
- 复审时间：2026-06-15
- 后续动作：观察真实项目接入反馈，必要时增加显式 migrate-memory 命令。
- 决策文件：`memory/decisions/2026-05-15-memory.md`

### 2026-05-14 - 暴露可移植 CLI 和 AI 工具适配层

- 背景：通过长相对 Node 路径调用 CLI 不利于使用；只支持 Codex 规则会限制 Cursor、Copilot 或混合 AI 工具团队的价值。
- 决策：为 `guardian` 和 `project-guardian` 增加 package `bin` 入口，保留随项目提交脚本路径作为 fallback，并通过适配器生成各 AI 工具规则。外部 CLI 场景写入可移植 `guardian ...` 命令，项目内源码场景才写本地脚本路径。
- 备选方案：只保留 Codex 插件元数据、要求每个项目都内置插件源码，或为每个 AI 工具创建独立插件。
- 影响文件/模块：`package.json`、`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/adapters.js`、`plugins/project-guardian/assets/templates/*`、README 和插件文档。
- 关联变更：`guardian init --adapter all` 与 `guardian install-adapters` 创建工具专用规则文件，但不改变核心记忆文件。
- 验证方式：CLI 语法检查、Node 测试套件、version/help 冒烟测试、package scripts 回归测试和 package dry-run。
- 风险：全局 CLI 依赖实际 npm 或 Git 安装源；AI 工具的规则格式可能演进，需要定期复核。
- 复审时间：未安排。
- 后续动作：只有团队需要 npm 原生发布时再评估 npm registry 发布。
- 决策文件：`memory/decisions/2026-05-14-portable-cli-and-adapters.md`

### 2026-05-14 - 仓库内项目记忆作为交接事实来源

- 背景：AI 辅助编程上下文会随着聊天记录、实习生或本地 IDE 会话丢失。
- 决策：把可持续项目上下文保存在仓库 Markdown 文件中，并通过 `check`、`validate-docs`、`scan-secrets` 和统一的 `verify` 命令强制维护。
- 备选方案：依赖聊天导出、要求开发者手写外部交接文档，或等平台化以后再做质量闸门。
- 影响文件/模块：`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md`、`project-guardian.config.json`。
- 关联变更：本仓库运行 self-init，Project Guardian 自身遵循它要求目标项目使用的同一套记忆工作流。
- 验证方式：填好的记忆文件必须通过 `guardian validate-docs`；代码变更缺少记忆更新时，`guardian check` 必须失败。
- 风险：如果模板解释不够清楚，过严校验可能拖慢非专业开发者的接入。
- 复审时间：未安排。
- 后续动作：保持零基础文档实用，并持续增加能区分空模板和真实记忆的测试。
- 决策文件：`memory/decisions/2026-05-14-repository-memory-source-of-truth.md`

### 2026-05-14 - Use per-decision files

- Context: Multiple maintainers may edit decision history during handover or review.
- Decision: Mirror new structured decisions into memory/decisions while keeping memory/DECISIONS.md compatible.
- Alternatives considered: None recorded.
- Affected files/modules: plugins/project-guardian/scripts/guardian.js, memory/decisions
- Related change: P4 collaboration conflict handling and the new `guardian decision add` command.
- Verification: npm.cmd test and guardian verify
- Risks: Decision content is duplicated for compatibility.
- Review after: 2026-06-14
- Follow-up: Consider turning memory/DECISIONS.md into a pure index after teams adopt the directory.
- 决策文件：`memory/decisions/2026-05-14-use-per-decision-files.md`

### 2026-05-14 - Project Guardian 保持零服务 Node.js CLI 形态

- 背景：目标用户是小团队和实习生，需要可靠工作流，但不应要求他们运维数据库、Web 服务或内部平台。
- 决策：默认实现保持为本地 Node.js CLI，只使用标准库模块、Git 元数据、Markdown 记忆文件，以及可选 Git hook 或 Gitee CI 集成。
- 备选方案：构建 Web 平台、强制使用向量数据库、只发布 Codex skill，或让每个命令都依赖托管 AI API。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/*`、`plugins/project-guardian/docs/*`。
- 关联变更：P0 和 P2 路线图引入 `guardian verify`、配置加载、更强文档校验和安全扫描，同时保留零配置本地使用方式。
- 验证方式：运行 `node --check plugins/project-guardian/scripts/guardian.js`、Windows PowerShell 下的 `npm.cmd test`，以及 `node plugins/project-guardian/scripts/guardian.js verify`。
- 风险：本地关键词查询不如 RAG 强大；工具必须保持简单，同时为未来检索集成保留清晰扩展点。
- 复审时间：未安排。
- 后续动作：本地工作流稳定并经过测试后，再重新评估 package 发布和可选向量搜索。
- 决策文件：`memory/decisions/2026-05-14-zero-service-cli.md`
