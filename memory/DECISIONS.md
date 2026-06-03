# 决策记录

本文件记录未来开发者和 AI Agent 必须理解的重要决策。

## 有效决策

### 2026-05-14 - Project Guardian 保持零服务 Node.js CLI 形态

- 背景：目标用户是小团队和实习生，需要可靠工作流，但不应要求他们运维数据库、Web 服务或内部平台。
- 决策：默认实现保持为本地 Node.js CLI，只使用标准库模块、Git 元数据、Markdown 记忆文件，以及可选 Git hook 或 Gitee CI 集成。
- 备选方案：构建 Web 平台、强制使用向量数据库、只发布 Codex skill，或让每个命令都依赖托管 AI API。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/*`、`plugins/project-guardian/docs/*`。
- 关联变更：P0 和 P2 路线图引入 `guardian verify`、配置加载、更强文档校验和安全扫描，同时保留零配置本地使用方式。
- 验证方式：运行 `node --check plugins/project-guardian/scripts/guardian.js`、Windows PowerShell 下的 `npm.cmd test`，以及 `node plugins/project-guardian/scripts/guardian.js verify`。
- 风险：本地关键词查询不如 RAG 强大；工具必须保持简单，同时为未来检索集成保留清晰扩展点。
- 复审时间：2026-06-14。
- 后续动作：本地工作流稳定并经过测试后，再重新评估 package 发布和可选向量搜索。

### 2026-05-14 - 仓库内项目记忆作为交接事实来源

- 背景：AI 辅助编程上下文会随着聊天记录、实习生或本地 IDE 会话丢失。
- 决策：把可持续项目上下文保存在根目录 Markdown 文件中，并通过 `check`、`validate-docs`、`scan-secrets` 和统一的 `verify` 命令强制维护。
- 备选方案：依赖聊天导出、要求开发者手写外部交接文档，或等平台化以后再做质量闸门。
- 影响文件/模块：`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md`、`project-guardian.config.json`。
- 关联变更：本仓库已经运行 self-init，因此 Project Guardian 遵循它要求目标项目使用的同一套记忆工作流。
- 验证方式：填好的记忆文件必须通过 `guardian validate-docs`；当代码变更缺少记忆更新时，`guardian check` 必须失败。
- 风险：如果模板解释不够清楚，过严校验可能拖慢非专业开发者的接入。
- 复审时间：2026-06-14。
- 后续动作：保持零基础文档实用，并增加能区分空模板和真实记忆的测试。

### 2026-05-14 - 暴露可移植 CLI 和 AI 工具适配层

- 背景：通过 `node plugins/project-guardian/scripts/guardian.js` 调用 CLI 看起来像原始脚本；只支持 Codex 规则会限制 Cursor、Copilot 或混合 AI 工具团队的价值。
- 决策：为 `guardian` 和 `project-guardian` 增加 package `bin` 入口，保留随项目提交脚本路径作为 fallback，并引入通用/Codex、Cursor 和 Copilot 规则模板。`package.json` scripts 必须避免写入某台机器的全局安装相对路径；外部 CLI 场景写入 `guardian ...`，项目内源码场景才写入本地脚本路径。
- 备选方案：只保留 Codex 插件元数据、要求每个项目都内置插件源码，或为每个 AI 工具创建单独插件。
- 影响文件/模块：`package.json`、`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/adapters.js`、`plugins/project-guardian/assets/templates/*`、`README.md` 和 `plugins/project-guardian/docs/*`。
- 关联变更：`guardian init --adapter all` 和 `guardian install-adapters --adapter cursor,copilot` 可以创建工具专用规则文件，不改变核心记忆文件。适配器解析和模板映射放在 `scripts/lib/adapters.js`，新增 AI 工具规则时不必继续塞进 CLI 主体。2026-05-15 审查中新增回归测试，确保全局 CLI 初始化目标项目时 scripts 使用可移植 `guardian ...` 命令。
- 验证方式：CLI 语法检查、Node 测试套件、version/help 冒烟测试、package scripts 回归测试和 package dry-run。
- 风险：全局 CLI 仍需要公司环境中存在实际 npm 或 Git 安装源；Copilot 和 Cursor 的规则格式可能演进，需要定期复核。
- 复审时间：2026-06-14。
- 后续动作：官方 Git 安装源是 `git+https://gitee.com/chenfengloveyuri/project-guardian.git`；只有团队需要 npm 原生发布时再评估 npm registry 发布。

### 2026-05-14 - 使用单独决策文件

- 背景：多人在交接或评审期间可能同时编辑决策历史。
- 决策：新增结构化决策时同步写入 `memory/decisions/`，同时保持 `memory/DECISIONS.md` 兼容。
- 备选方案：继续只维护单个 `memory/DECISIONS.md`；或只使用单独决策文件但移除总索引。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`memory/decisions`。
- 关联变更：P4 协作冲突处理和新的 `guardian decision add` 命令。
- 验证方式：`npm.cmd test` 和 `guardian verify`。
- 风险：为了兼容性，决策内容会有一定重复。
- 复审时间：2026-06-14。
- 后续动作：团队接受决策目录后，可以考虑把 `memory/DECISIONS.md` 转成纯索引页。
- 决策文件：`memory/decisions/2026-05-14-use-per-decision-files.md`

### 2026-05-15 - 默认使用中文项目记忆

- 背景：目标使用者主要是中文团队和没有太多编程经验的实习生，英文模板会增加理解成本，也容易让 AI 生成的交接记录脱离实际工作语言。
- 决策：Project Guardian 默认使用 `zh-CN` 模板，同时保留 `guardian init --language en` 给英文团队使用。文档校验、更新记录、交接生成、决策记录和 AI 工具适配规则都必须兼容中英文。
- 备选方案：继续只维护英文模板；或只维护中文模板并移除英文支持。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/zh-CN/`、`project-guardian.config.json`、README、插件文档和测试。
- 关联变更：新增 `language` 配置、中文模板目录、双语校验规则、中文 query 分词回归测试，并修复 `init --language en` 时适配器规则仍使用中文模板的问题。
- 验证方式：运行 lint、测试、`guardian verify`、语言初始化冒烟测试和 package dry-run。
- 风险：已有英文项目如果把配置改成 `zh-CN`，后续 `update` 生成的记录会中英混杂；文档中已要求同一项目不要反复切换语言。
- 复审时间：2026-06-15。
- 后续动作：根据真实团队反馈继续补充中文文案和更多 AI 工具适配模板。

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

### 2026-06-03 - Add budget-aware memory briefing before full reads

- 背景：如果 AI 每轮都读取 `PROJECT_CONTEXT`、`STATE`、`DECISIONS`、`AI_CHANGELOG` 和 `HANDOVER`，其它项目接入后会持续增加 token 成本；但完全不读记忆又会破坏 Project Guardian 的交接价值。
- 决策：新增 `guardian brief` 和 MCP `guardian_brief`，在 AI 打开大型历史记忆前先输出读取计划、推荐文件、建议 `query --limit` 和粗略 token 估算。规则模板改为默认先读 `memory/PROJECT_CONTEXT.md` 与 `memory/STATE.md`，再按任务需要读取决策、变更日志或交接指南。2026-06-03 复核后新增 `--mode quick|deep|full` 和 MCP `guardian_brief.mode`，把“风险升高时升级读取”固化为工具能力。
- 备选方案：新增向量数据库/RAG；让 AI 每轮全量读取所有记忆；只依赖人工少读文件；创建复杂权限系统或 IDE 原生扩展。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/mcp.js`、`tests/guardian.test.js`、AI 规则模板、VS Code tasks、README、Project Guardian 文档、`零基础超简单入门.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/*`。
- 关联变更：`guardian brief "token 成本控制" --limit 2` 实测推荐核心两份和决策，估算约节省 51%；`guardian brief "新人接手" --limit 2` 推荐核心两份和交接，估算约节省 63%；`quick`、`deep`、`full` 模式分别覆盖低风险日常、历史/回归/高风险、交接/上线/审计/全量上下文场景。
- 验证方式：运行 lint、Node 测试套件、`guardian brief` 冒烟测试、完整 `guardian verify`、审计和 diff check。
- 风险：`brief` 的 token 估算基于字符数近似，不等同于模型 tokenizer；核心记忆继续膨胀时仍可能偏大；关键词路由可能漏掉语义相关历史，因此所有规则模板都必须说明按需读取不是硬限制，证据不足或风险升高时必须升级到 `deep` 或 `full`。
- 复审时间：2026-07-03。
- 后续动作：真实 AI IDE 接入后观察是否需要短摘要文件、MCP resources、分页查询、缓存摘要或向量检索。
- 决策文件：`memory/decisions/2026-06-03-token-budget-briefing.md`

### 2026-06-03 - Add isolated Run visual layer

- 背景：Project Guardian 已经有 CLI、MCP 和规则适配器，但完全依赖命令行会让零基础用户或管理者查看状态、运行检查和查询项目记忆时有门槛。
- 决策：新增根目录 `Run/` 作为可选可视化运行层，保存本地 Web server、静态页面、样式、浏览器交互和说明文档。`Run/` 和核心插件代码隔离，但通过 package `files` 随插件一起发布。
- 备选方案：把可视化代码塞进 `plugins/project-guardian/scripts/guardian.js`；单独做独立仓库；立即做 Electron/VS Code 原生扩展。
- 影响文件/模块：`Run/*`、`package.json`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/*`。
- 关联变更：`npm run ui` 启动 `node Run/server.js`；Run server 默认 localhost、`/api/command` 只开放只读白名单，记忆读取和追加只允许核心记忆文件白名单并优先使用 `project-guardian.config.json` 路径；前端使用侧边栏切换功能页，首页只显示状态概览，核心记忆预览用轻量 Markdown 渲染标题、列表、代码块和表格；`init` 必须输入 `RUN_INIT`，手动追加记忆必须输入 `APPEND_MEMORY`，后端拒绝疑似密钥内容，不提供任意 shell。
- 验证方式：运行 lint、测试、完整 verify、审计、diff check 和本地 UI/API 冒烟测试；发布前补跑 package dry-run 确认 `Run/` 被打入包。
- 风险：当前 Web UI 没有内置认证，不能直接公网暴露；手动追加记忆只有基础敏感词拦截，不能替代 `guardian verify`、代码评审和人工安全审查；后续复杂写入类命令仍应增加预览和审计。
- 复审时间：2026-07-03。
- 后续动作：观察真实用户是否需要写入 diff 预览、操作日志、复审日历、记忆搜索或桌面窗口包装。
- 决策文件：`memory/decisions/2026-06-03-run-visual-layer.md`
