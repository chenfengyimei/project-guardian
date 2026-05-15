# AI 变更日志

本文件记录应在聊天会话之外长期保留的 AI 协助开发上下文。

## 2026 记录

### 2026-05-15 00:00 - 新增全仓库文件说明总览

- 用户需求：在根目录创建 `explaiw` 文件夹和一个 md 文件，把所有文档介绍写入文件，并且把除文档外的代码文件也写入介绍。
- AI 总结：新增 `explaiw/PROJECT_FILES_EXPLANATION.md`，集中说明当前仓库目录结构、文档和规则文件、模板文件、代码配置资源测试文件，以及常见重复文件的区别和维护判断标准。
- 变更文件：`explaiw/PROJECT_FILES_EXPLANATION.md`、`STATE.md`、`docs/AI_CHANGELOG.md`。
- 业务原因：第一次接触仓库的人需要一个总览文件，快速理解每个文件为什么存在、负责什么、什么时候需要更新。
- 技术说明：本次不修改 CLI 代码、测试逻辑、模板或插件运行行为，只新增说明文档并同步 Project Guardian 记忆。
- 验证方式：运行 `node plugins/project-guardian/scripts/guardian.js verify`、`npm.cmd run lint` 和 `npm.cmd test`。
- 风险：该说明文档是当前文件清单的人工总览，后续仓库新增或删除文件时需要同步维护。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交前复查新增说明文档是否覆盖当前仓库文件，并在后续文件结构变化时更新它。

### 2026-05-15 00:00 - 将自举记忆切换为中文

- 用户需求：把 Project Guardian 本仓库自己的自举记忆切换成中文，不修改无关内容，只处理项目开始使用时需要读取的记忆文档。
- AI 总结：将根目录项目上下文、状态、决策、AI 变更日志和交接指南翻译为中文，保留原有命令、路径、日期、验证方式和风险含义。
- 变更文件：`PROJECT_CONTEXT.md`、`STATE.md`、`DECISIONS.md`、`docs/AI_CHANGELOG.md`、`docs/HANDOVER.md`。
- 业务原因：插件默认语言已经是中文，本仓库自举记忆也应使用中文，方便中文团队和零基础接手者直接理解。
- 技术说明：本次不修改 CLI 代码、测试、模板或插件功能，只更新 Project Guardian 自举记忆内容。
- 验证方式：运行 `node plugins/project-guardian/scripts/guardian.js validate-docs`、`node plugins/project-guardian/scripts/guardian.js verify` 和 `git diff --check`。
- 风险：翻译类修改可能改变表达习惯，但不应改变事实、路径或命令；后续审阅重点是确认语义一致。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：后续维护本仓库自举记忆时继续优先使用中文。

### 2026-05-15 00:00 - 增加中文优先语言支持

- 用户需求：解释为什么插件仍然显得英文偏重，增加中文适配，分析可能出现的 bug，并改进项目。
- AI 总结：新增 `language` 配置并默认使用 `zh-CN`，为记忆文件和 AI 工具适配器新增中文模板，通过 `guardian init --language en` 保留英文初始化；文档校验现在同时接受中英文标题和字段；生成的 update、handover、decision 内容会按语言配置输出；补充中文初始化、英文初始化、中文文档、中文 query 和中文决策记录回归测试。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`project-guardian.config.json`、`plugins/project-guardian/assets/templates/zh-CN/`、`tests/guardian.test.js`、README、Project Guardian 文档、`PROJECT_CONTEXT.md`、`STATE.md`、`DECISIONS.md` 和 `docs/HANDOVER.md`。
- 业务原因：目标团队主要使用中文，初次使用者不应先理解英文模板才能保存项目记忆。
- 技术说明：`guardian init --language en` 现在会把选中的配置传给适配器生成逻辑，避免英文项目收到中文 `AGENTS.md` 或 Cursor/Copilot 规则。query 分词增加中文关键词对，便于本地查询匹配中文问题。
- 验证方式：`npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify`、`git diff --check`、语言命令冒烟测试和 package dry-run。
- 风险：已有项目接入后应避免反复切换 `language`，否则新生成的记忆记录可能中英混杂。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：推送到 Gitee 后，在干净机器上从 Gitee URL 安装，并测试 `guardian init` 和 `guardian init --language en`。

### 2026-05-14 15:20 - 增加可移植 CLI 和 AI 工具适配器

- 用户需求：先解决 CLI 易用性问题，再开发其它 AI 工具的适配层，并保持文档同步。
- AI 总结：新增 package `bin` 入口，让工具可以作为 `guardian` 或 `project-guardian` 使用；新增 `--version`；新增通用/Codex、Cursor 和 GitHub Copilot 的可配置适配器生成；新增测试验证适配器创建、保留、package 元数据和配置校验。
- 变更文件：`package.json`、`project-guardian.config.json`、`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/` 下的适配器模板、`tests/guardian.test.js`、README、Project Guardian 文档和项目记忆文件。
- 业务原因：团队不应记忆很长的相对 Node 路径；项目记忆工作流应适用于 Cursor、Copilot、Codex 和通用 AI Agent，而不是绑定单一生态。
- 技术说明：`guardian init` 仍然创建核心记忆文件且不覆盖已有内容。`guardian install-adapters --adapter cursor,copilot` 只添加 AI 规则文件，并保留同名已有文件。Git 安装源是 `git+https://gitee.com/chenfengloveyuri/project-guardian.git`。
- 验证方式：`npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify`、help/version 冒烟测试和 package dry-run。
- 风险：全局 CLI 使用依赖团队发布或从真实 npm/Git 源安装；Cursor 或 Copilot 改变规则约定时，需要复核适配器格式。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：审阅最终 diff 后，把 CLI、适配器层和 Gitee 安装源变更提交到 Gitee。

### 2026-05-14 15:50 - 从主 CLI 中解耦适配器解析

- 用户需求：分析目录结构，检查缺失或薄弱点，并对耦合度过高的地方做解耦或重构。
- AI 总结：把适配器解析、校验和模板映射从 `guardian.js` 移动到 `plugins/project-guardian/scripts/lib/adapters.js`。修复一个配置一致性问题：新的 `guardian init --adapter copilot` 以前会创建 Copilot 规则，却仍写入默认 generic/Cursor 适配器配置。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/adapters.js`、`tests/guardian.test.js`、`package.json`、`README.md`、`PROJECT_CONTEXT.md`、`STATE.md`、`DECISIONS.md`、`docs/HANDOVER.md` 和 Project Guardian 文档。
- 业务原因：新增未来 AI 工具适配器时，不应再编辑无关的 CLI 工作流代码；自定义初始化后的新项目不应收到误导性的适配器健康检查。
- 技术说明：`package.json` 的 lint 现在检查新的适配器模块。新增回归测试验证 `init --adapter copilot` 会把 `["copilot"]` 写入新的 `project-guardian.config.json` 并通过 `doctor`。
- 验证方式：最终完整 verify 循环前，`npm.cmd run lint` 和 `npm.cmd test` 已通过。
- 风险：`guardian.js` 仍然是最大文件，依旧同时包含文档、Git、校验、query 和安全逻辑；后续拆分应在本次适配器拆分稳定后小步进行。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：后续可以考虑把配置加载/校验或文档校验拆成独立模块。

### 2026-05-14 00:00 - 强化 Project Guardian 质量工作流

- 用户需求：按阶段改进路线一步一步完成，运行多轮测试，并在出现错误时立即修复。
- AI 总结：把 CLI 扩展为 verify 优先的工作流，新增可配置记忆路径、更严格文档校验、安全扫描、结构化决策、单独决策文件、合并冲突提示、非交互 query、更强 hook 和 CI 生成、自动化测试，以及仓库自举记忆。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`.gitignore`、`package.json`、`tests/guardian.test.js`、`plugins/project-guardian/assets/templates/` 下的模板、根目录记忆文件、根目录文档、插件文档，以及现在对 Git 可见的插件元数据条目。
- 业务原因：插件必须从文档模板工具升级为能主动约束 AI 辅助开发团队交接质量的工具。
- 技术说明：CLI 仍然是只依赖标准库的单个 Node.js 脚本。新增命令和检查可在本地、hooks 和 Gitee CI 中运行，不需要外部服务。
  ```text
  guardian verify = doctor + check + validate-docs + configured security scan
  ```
- 验证方式：代码和文档更新后，`npm.cmd run verify`、直接命令冒烟测试、`git diff --check`、JSON 解析检查和文档一致性扫描通过。
- 风险：更严格的校验规则在真实团队尝试部分文档化项目后可能需要调整。Windows 用户如果被 `npm.ps1` 执行策略阻止，应优先在 PowerShell 中使用 `npm.cmd`。
- 敏感信息检查：未向记忆文件加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：审阅最终 diff，重新运行验证循环，并总结可提交到 Gitee 的变更集。
