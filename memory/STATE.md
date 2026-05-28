# 项目状态

最后更新：2026-05-28

## 当前状态

- Project Guardian 是一个本地 Codex 插件加 Node.js CLI，用于为 AI 辅助编程项目创建和维护可持续的项目记忆。
- 当前开发阶段已经把工具从模板助手强化为可复用的工作流守卫，具备配置、校验、安全扫描、统一验证、冲突提示、决策文件和测试。
- CLI 已经提供 package `bin` 入口，团队可以安装为 `guardian`；仍然保留旧的随项目提交脚本路径，方便把插件源码放在项目内的团队使用。
- 官方 Git 安装源已经确认为 `git+https://gitee.com/chenfengloveyuri/project-guardian.git`。
- 工具已经包含 AI 适配层，支持通用/Codex 规则、Cursor 规则和 GitHub Copilot 指令文件。
- 适配器解析已经拆分到 `plugins/project-guardian/scripts/lib/adapters.js`，并扩展到 Codex、Cursor、Copilot、Windsurf、Cline、Continue、Claude Code、Gemini CLI 和 VS Code。
- CLI 现在默认生成中文项目记忆模板，也可以通过 `guardian init --language en` 生成英文模板。
- CLI 默认项目记忆路径已经集中到根目录 `memory/`，新项目运行 `guardian init` 会创建 `memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md` 和 `memory/HANDOVER.md`。
- 本仓库已经自举使用自己的 Project Guardian 记忆文件，后续变更可以按它推荐给其它团队的同一套工作流审查。

## 已完成

- 创建了插件结构，包括 `.codex-plugin/plugin.json`、skill 元数据、模板、CLI 脚本、根目录 README、工作流文档、规范文档、接入文档和零基础教程。
- 实现了初始命令：`init`、`update`、`handover`、`check`、`doctor`、`validate-docs`、`query`、`install-hooks` 和 `install-ci`。
- 加入了更严格的路线图要求，覆盖仓库完整性、默认质量闸门、决策质量、配置、安全扫描、CI 行为和自动化测试。
- 已经对本仓库运行自举初始化，并填入真实记忆内容，而不是保留空模板。
- 新增 `package.json` 和 `tests/` 下的 Node 测试套件，覆盖初始化、校验、check 失败、hooks、CI 生成、决策记录、安全扫描、查询和合并冲突提示。
- 更新了面向用户的文档，让 `guardian verify` 成为提交前和 CI 中推荐使用的默认命令。
- 新增 `guardian` / `project-guardian` package 二进制入口、`guardian --version`、可配置适配器生成，以及 Cursor 和 GitHub Copilot 模板。
- 新增独立适配器模块，并补充 `guardian init --adapter ...` 会把所选适配器写入新配置的回归测试。
- 新增 `explaiw/PROJECT_FILES_EXPLANATION.md`，集中说明当前所有文档、代码、配置、资源和测试文件的职责。
- 已将本仓库自举项目记忆从根目录和 `docs/` 迁移到 `memory/`，并同步默认配置、CLI、AI 规则、插件文档和测试。
- 新增 `guardian adapters doctor`，可以查看各 AI IDE 适配器是否已安装，并给出缺失文件和安装命令。
- 新增 Windsurf、Cline、Continue、Claude Code、Gemini CLI、VS Code 适配模板，VS Code 还包含 `.vscode/tasks.json` 任务入口。
- 已复核全局 CLI 初始化业务项目时的 `package.json` scripts 生成逻辑；外部 CLI 使用 `guardian ...`，项目内源码模式使用本地脚本路径。
- Continue 规则模板已经补充规则头，VS Code tasks 和跨 IDE 适配限制已经在 README、CLI/CI、接入和标准文档中说明。
- 新增 `package-lock.json`，让 `npm audit` 可以稳定运行；当前项目没有第三方运行依赖，审计结果为 0 个漏洞。
- 新增 `guardian mcp` stdio MCP server，支持 MCP 的 AI IDE 可以直接调用 query、update、decision、verify、doctor、scan-secrets、handover、conflicts 和 adapters doctor。

## 进行中

- MCP 功能、文档同步和最终验证已完成，当前等待提交到 Gitee。

## 下一步

1. 提交到 Gitee 前复查 `git status`，确认 `plugins/project-guardian/scripts/lib/mcp.js`、文档、测试和记忆一起提交。
2. 后续真实接入 Cursor、Cline、Continue、Claude Code 等 MCP 客户端，收集配置差异。
3. 根据真实 IDE 反馈，再考虑 MCP prompts/resources、权限细化、VS Code 原生扩展、JetBrains 插件和 RAG/向量检索。

## 已知问题

| 问题 | 影响 | 负责人 | 备注 |
| --- | --- | --- | --- |
| 查询仍是关键词检索，不是语义检索 | 不同表达方式的问题可能搜不到答案 | 维护者 | RAG 和向量检索规划在后续迭代 |
| 决策记录会同时写入索引和单独决策文件 | 文档输出略多 | 维护者 | 这是为了兼容现有 `memory/DECISIONS.md`，同时降低未来协作冲突 |
| Gitee Go 语法可能因账号模板不同而变化 | 团队可能需要调整生成的流水线细节 | 仓库负责人 | CLI 保持工作流小而可配置 |
| 已有项目保留旧配置时仍会写旧路径 | 旧项目不会自动迁移到 `memory/` | 维护者 | 本次保持尊重显式配置；旧项目迁移时应同步更新 `project-guardian.config.json` |
| AI IDE 规则格式会变化 | 某些适配器模板未来可能失效 | 维护者 | 已新增 `adapters doctor` 帮助发现缺失文件；仍需定期复核官方规则格式 |
| MCP 当前没有独立权限系统 | 支持 MCP 的 IDE 可以执行本地 Guardian 命令 | 维护者 | 依赖本地仓库权限、Git 权限和代码评审；不要把生产密钥写入记忆 |

## 风险区域

- `plugins/project-guardian/scripts/guardian.js` 是主执行文件，协调 Git、文档、配置、hooks、CI 和扫描，修改时需要重点测试。
- 文档校验既要严格阻止空模板，又不能严格到让新团队难以逐步接入。
- 安全扫描必须隐藏敏感值，也要避免在普通文档中产生过多误报。
- hooks 和 CI 应保持追加式或明确生成，不能覆盖团队已有自动化。

## 最新 AI 协助变更

- 任务：扩展 AI IDE 适配能力并新增适配器体检。
- 总结：在已有多 AI IDE 规则适配基础上新增 `guardian mcp`，让支持 MCP 的 IDE 可以直接调用 Project Guardian 工具；补充 MCP 文档、测试和文件总览。
- 文件：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、`package.json`、`README.md`、`plugins/project-guardian/docs/*`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/STATE.md`。
- 验证：已运行 `npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run` 和真实 stdio MCP 冒烟测试；MCP initialize、tools/list 和 guardian_query 工具测试通过。
- 后续：真实接入支持 MCP 的 IDE 后，再评估 MCP prompts/resources、权限细化、VS Code 扩展、JetBrains 插件和 RAG/向量检索。
