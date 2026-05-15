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
- 影响文件/模块：`PROJECT_CONTEXT.md`、`STATE.md`、`DECISIONS.md`、`docs/AI_CHANGELOG.md`、`docs/HANDOVER.md`、`project-guardian.config.json`。
- 关联变更：本仓库已经运行 self-init，因此 Project Guardian 遵循它要求目标项目使用的同一套记忆工作流。
- 验证方式：填好的记忆文件必须通过 `guardian validate-docs`；当代码变更缺少记忆更新时，`guardian check` 必须失败。
- 风险：如果模板解释不够清楚，过严校验可能拖慢非专业开发者的接入。
- 复审时间：2026-06-14。
- 后续动作：保持零基础文档实用，并增加能区分空模板和真实记忆的测试。

### 2026-05-14 - 暴露可移植 CLI 和 AI 工具适配层

- 背景：通过 `node plugins/project-guardian/scripts/guardian.js` 调用 CLI 看起来像原始脚本；只支持 Codex 规则会限制 Cursor、Copilot 或混合 AI 工具团队的价值。
- 决策：为 `guardian` 和 `project-guardian` 增加 package `bin` 入口，保留随项目提交脚本路径作为 fallback，并引入通用/Codex、Cursor 和 Copilot 规则模板。
- 备选方案：只保留 Codex 插件元数据、要求每个项目都内置插件源码，或为每个 AI 工具创建单独插件。
- 影响文件/模块：`package.json`、`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/adapters.js`、`plugins/project-guardian/assets/templates/*`、`README.md` 和 `plugins/project-guardian/docs/*`。
- 关联变更：`guardian init --adapter all` 和 `guardian install-adapters --adapter cursor,copilot` 可以创建工具专用规则文件，不改变核心记忆文件。适配器解析和模板映射放在 `scripts/lib/adapters.js`，新增 AI 工具规则时不必继续塞进 CLI 主体。
- 验证方式：CLI 语法检查、Node 测试套件、version/help 冒烟测试和 package dry-run。
- 风险：全局 CLI 仍需要公司环境中存在实际 npm 或 Git 安装源；Copilot 和 Cursor 的规则格式可能演进，需要定期复核。
- 复审时间：2026-06-14。
- 后续动作：官方 Git 安装源是 `git+https://gitee.com/chenfengloveyuri/project-guardian.git`；只有团队需要 npm 原生发布时再评估 npm registry 发布。

### 2026-05-14 - 使用单独决策文件

- 背景：多人在交接或评审期间可能同时编辑决策历史。
- 决策：新增结构化决策时同步写入 `docs/decisions/`，同时保持 `DECISIONS.md` 兼容。
- 备选方案：未记录。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`docs/decisions`。
- 关联变更：P4 协作冲突处理和新的 `guardian decision add` 命令。
- 验证方式：`npm.cmd test` 和 `guardian verify`。
- 风险：为了兼容性，决策内容会有一定重复。
- 复审时间：2026-06-14。
- 后续动作：团队接受决策目录后，可以考虑把 `DECISIONS.md` 转成纯索引页。
- 决策文件：`docs/decisions/2026-05-14-use-per-decision-files.md`

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
