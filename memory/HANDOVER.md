# 交接指南

最后生成：2026-07-14 22:06

## 优先阅读

修改代码前先阅读这些文件：

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`
3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`

## 如何运行

```bash
# 安装依赖
npm install

# 先发现准确命令，不要猜测选项
guardian help query
guardian commands --json
guardian-cmd list

# 生成完整读取计划
guardian brief "接手 Project Guardian 0.5.0" --mode full

# 记忆修复和旧路径迁移都先预览
guardian repair-memory
guardian migrate-memory --dry-run

# 回归和统一质量门
npm run test
npm run verify
```

## 本次发布接手重点

- 当前 package 版本是 `0.5.0`；Codex 本地开发 manifest 使用 `0.5.0+codex.20260714134113` 缓存标识。
- CLI 帮助、命令发现和参数校验统一由 `plugins/project-guardian/scripts/lib/cli-catalog.js` 驱动；新增命令时不要只改 `guardian.js`。
- 用法错误应返回退出码 `2`，未知或冲突参数不得被静默忽略；结构化记忆写入必须先做长度和疑似敏感值检查。
- 迁移必须先运行 `guardian migrate-memory --dry-run`；冲突或源、目标都缺失时不得写入，正式移动失败要回滚。
- 本轮已刷新插件缓存标识并通过 manifest 校验，但当前 Codex Desktop 的 WindowsApps CLI 在此执行环境返回 `Access is denied`，所以未完成自动重装。应在可正常运行 `codex` 的终端执行 `codex plugin add project-guardian@internal-ai-plugins`，然后新建 Codex 任务复核新 skill 和命令。

## 项目地图

| 区域 | 文件 | 用途 |
| --- | --- | --- |
| .agents | `.agents/plugins/marketplace.json` | 修改 .agents 时需要查看。 |
| root | `AGENTS.md` | 修改 root 时需要查看。 |
| root | `CHANGELOG.md` | 修改 root 时需要查看。 |
| root | `CONTRIBUTING.md` | 修改 root 时需要查看。 |
| root | `README.md` | 修改 root 时需要查看。 |
| Run | `Run/README.md` | 修改 Run 时需要查看。 |
| Run | `Run/lib/audit.js` | 修改 Run 时需要查看。 |
| Run | `Run/lib/commands.js` | 修改 Run 时需要查看。 |
| Run | `Run/lib/guardian-bridge.js` | 修改 Run 时需要查看。 |
| Run | `Run/public/app.js` | 修改 Run 时需要查看。 |
| Run | `Run/public/index.html` | 修改 Run 时需要查看。 |
| Run | `Run/public/styles.css` | 修改 Run 时需要查看。 |
| Run | `Run/server.js` | 修改 Run 时需要查看。 |
| explain | `explain/PROJECT_FILES_EXPLANATION.md` | 修改 explain 时需要查看。 |
| memory | `memory/AI_CHANGELOG.md` | 修改 memory 时需要查看。 |
| memory | `memory/DECISIONS.md` | 修改 memory 时需要查看。 |
| memory | `memory/HANDOVER.md` | 修改 memory 时需要查看。 |
| memory | `memory/PROJECT_CONTEXT.md` | 修改 memory 时需要查看。 |
| memory | `memory/STATE.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-05-14-portable-cli-and-adapters.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-05-14-repository-memory-source-of-truth.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-05-14-use-per-decision-files.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-05-14-zero-service-cli.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-05-15-ai-ide.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-05-15-default-chinese-memory.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-05-15-memory.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-05-28-mcp.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-02-decision-review-workflow.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-02-mcp-schema-and-query-limit.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-02-mcp-tool-gating.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-02-precise-changelog-time.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-03-run-command-catalog.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-03-run-visual-layer.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-03-token-budget-briefing.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-04-cli-module-and-run-ops.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-04-manual-memory-template-sync.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-04-run-command-catalog-module.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-05-cli-run-audit.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-05-git-run.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-05-run-mcp-console.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-05-run-mcp-web-sync.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-08-ai-ide.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-06-08-hybrid-search-and-contributing.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-07-12-10.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-07-12-decision-1783815120812.md` | 修改 memory 时需要查看。 |
| memory | `memory/decisions/2026-07-12-以独立决策文件为事实源并增加确定性记忆修复.md` | 修改 memory 时需要查看。 |
| root | `package-lock.json` | 修改 root 时需要查看。 |
| root | `package.json` | 修改 root 时需要查看。 |
| root | `project-guardian.config.json` | 修改 root 时需要查看。 |
| tests | `tests/guardian.test.js` | 修改 tests 时需要查看。 |
| root | `零基础超简单入门.md` | 修改 root 时需要查看。 |
| memory | `memory/decisions/2026-07-14-以集中式-cli-契约和安全预检作为命令边界.md` | 修改 memory 时需要查看。 |

## 当前状态快照

```text
# 项目状态

最后更新：2026-07-14 22:06

## 当前状态

- Project Guardian 是一个本地 Codex 插件加 Node.js CLI，用于为 AI 辅助编程项目创建和维护可持续的项目记忆。
- 当前版本升级为 `0.5.0`（Codex 本地开发 manifest 使用 `0.5.0+codex.20260714134113` 缓存标识），重点强化 CLI 精确调用、安全迁移、写入保护和可发现性。
- 新增集中式 `cli-catalog.js`：总帮助、单命令帮助、`guardian commands --json` 和严格参数校验共享同一事实源，支持 `--key=value`，用法错误稳定返回退出码 `2`。
- 未知命令、拼错选项、缺少值、多余位置参数、重复别名、决策标题双重来源和模板未使用字段不再被静默忽略。
- `guardian migrate-memory --dry-run` 现在执行完整预检；正式迁移支持核心文件和决策目录、旧配置键升级、已人工移动目标采纳、冲突与空目标拒绝以及失败回滚。
- 结构化 update、decision 和 review complete 在写文件前统一做长度与疑似敏感值检查；同日同标题决策使用排他创建和递增后缀保留全部事实源。
- `validate-docs` 现在会发现编码损坏、非法控制字符、疑似损坏的 CJK 文本，以及未按最新在前排列的决策和 changelog。
- 新增 `guardian repair-memory`、MCP `guardian_memory_health` 与 `guardian_memory_repair`；独立决策文件成为结构化决策和复审状态的事实源。
- `guardian update` 已支持一次提供总结、原因、验证、风险、敏感信息检查和下一步，并把最新记录插到文件顶部。
- query 结果现在给出起始行并优先提供不同来源；MCP 队列已保证写任务不会被后到读取饿死，abort 后队列仍可复用。
- 配置合并会拒绝 prototype pollution 关键字；畸形配置段会回退到安全默认值并由 doctor 报告，而不是让 verify 崩溃。
- 当前开发阶段已经把工具从模板助手强化为可复用的工作流守卫，具备配置、校验、安全扫描、统一验证、冲突提示、决策文件和测试。
- CLI 已经提供 package `bin` 入口，团队可以安装为 `guardian`；仍然保留旧的随项目提交脚本路径，方便把插件源码放在项目内的团队使用。
- 官方 Git 安装源已经确认为 `git+https://gitee.com/chenfengloveyuri/project-guardian.git`。
- 工具已经包含 AI 适配层，支持通用/Codex 规则、Cursor 规则和 GitHub Copilot 指令文件。
- 适配器解析已经拆分到 `plugins/project-guardian/scripts/lib/adapters.js`，并扩展到 Codex、Cursor、Copilot、Windsurf、Cline、Continue、Claude Code、Gemini CLI 和 VS Code。
- CLI 现在默认生成中文项目记忆模板，也可以通过 `guardian init --language en` 生成英文模板。
- CLI 默认项目记忆路径已经集中到根目录 `memory/`，新项目运行 `guardian init` 会创建 `memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md` 和 `memory/HANDOVER.md`。
- MCP 已支持 `readOnly`、`allowedTools` 和 `PROJECT_GUARDIAN_MCP_READ_ONLY=1`，团队可以把 MCP 客户端限制为只读或指定工具集合。
- MCP 启动和工具调用已增加强校验：配置写错会拒绝启动，工具入参多传、类型错误或 query limit 越界会被拒绝。
- 决策复审机制已接入 CLI、verify 和 MCP：到期未完成复审会被拦截，完成复审后会在对应决策文件中标记正常和无需继续复审。
- 新增 `guardian brief` 和 MCP `guardian_brief`，可以在 AI 打开大型记忆文件前生成预算友好的读取计划、推荐文件和粗略 token 估算。
- AI 规则模板、Skill、VS Code tasks、README、CLI/CI、接入、规范、工作流和零基础教程已切换为"先 brief、再核心记忆、历史文件按需读取"的默认方式。
- `guardian brief` 已新增 `--mode auto|quick|deep|full`，输出升级触发条件，解决按需读取可能误判或被误解为硬限制的问题。
- 安全审计已修复 Run Web UI CSRF 防护、静态文件路径遍历、审计日志静默失败、MCP stdin 消息大小限制、UTF-8 截断安全、安全扫描 ReDoS 防护、guardian-cmd passthrough 参数校验、decisions.js 日期路径遍历和 config 路径安全校验。
- `explain/` 目录已从 `explaiw/` 重命名（拼写修正）。
- 新增 `CHANGELOG.md` 记录版本级变更。
- `.gitignore` 已补充 `*.log`、`*.tmp`、`*.swp`、`*.bak`、`.idea/`、`.vscode/settings.json` 等模式。
- `shared.js` 模块的 `readMaybe` 不再静默吞没非 ENOENT 错误；`unique()` 增加类型检查；`parseFlags` 支持 `--` 终止符。
- `knowledge.js` 的 `buildBrief` 兼容旧 `config.memory` 格式；`chunks` 验证参数防止无限循环；`estimateTokens` 区分 CJK 和非 CJK 字符；`shellQuoteText` 移除 shell 元字符。

## 已完成

- 创建了插件结构，包括 `.codex-plugin/plugin.json`、skill 元数据、模板、CLI 脚本、根目录 README、工作流文档、规范文档、接入文档和零基础教程。
- 实现了初始命令：`init`、`update`、`handover`、`check`、`doctor`、`validate-docs`、`query`、`install-hooks` 和 `install-ci`。
- 已经对本仓库运行自举初始化，并填入真实记忆内容，而不是保留空模板。
- 新增 `package.json` 和 `tests/` 下的 Node 测试套件，覆盖初始化、校验、check 失败、hooks、CI
[snapshot truncated]
```

## 项目上下文快照

```text
# 项目上下文

## 项目概览

- 项目名称：Project Guardian。
- 项目目的：为使用 AI 辅助编程的团队提供轻量级项目记忆插件，把可持续的交接上下文保存在代码仓库中。
- 目标用户：小项目团队、实习生、项目负责人，以及需要稳定了解项目目标、当前状态、决策、变更和交接信息的 AI 编程助手。
- 业务负责人：内部 AI 工程团队，或维护本仓库的项目团队。

## 技术栈

- 运行环境：Node.js 18 或更新版本。
- 框架：无应用框架。CLI 只使用 Node.js 标准库模块。
- 数据库：无。
- 包管理器：目标项目不强制使用 npm，但本仓库已经通过 `guardian`、`project-guardian` 和 `guardian-cmd` 暴露 package CLI。
- 部署位置：全局 CLI 安装、本地仓库插件目录、AI 工具适配规则、Codex 插件市场元数据、Git hooks、Gitee Go 工作流模板和可选 `Run/` 本地可视化层。
- 默认语言：`zh-CN`。英文团队可以使用 `guardian init --language en` 初始化。
- 环境要求：Node.js 18+；正式项目建议使用 Git；npm 只在安装 CLI、运行测试或发布包时需要；不需要数据库、后端服务、OpenAI API Key 或向量库。

## 核心业务流程

1. 初始化项目记忆。
   - 入口：全局安装后使用 `guardian init`；如果插件源码随项目提交，则使用 `node plugins/project-guardian/scripts/guardian.js init`。
   - 重要文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/config.js`、`plugins/project-guardian/assets/templates/*`。
   - 规则：创建标准记忆文件，不覆盖项目已经写好的同名记忆文件。
   - 已知边界情况：已有项目可能已经存在部分记忆文件，因此 CLI 必须保留现有内容并提示哪些文件被跳过。`guardian init --language en` 还必须把语言配置传给 AI 适配器模板，避免英文项目收到中文规则文件。全局 CLI 初始化带 `package.json` 的业务项目时，npm scripts 必须使用可移植的 `guardian ...` 命令，不能写入本机安装路径。

2. 安装 AI 工具适配规则。
   - 入口：`guardian install-adapters --adapter cursor,copilot,windsurf,cline,continue,claude,gemini,vscode`、`guardian init --adapter all` 和 `guardian adapters doctor`。
   - 重要文件：`plugins/project-guardian/scripts/lib/adapters.js`、`AGENTS.md`、`.cursorrules`、`.cursor/rules/project-guardian.mdc`、`.github/copilot-instructions.md`、`.github/instructions/project-guardian.instructions.md`、`.windsurf/rules/project-guardian.md`、`.clinerules/project-guardian.md`、`.continue/rules/project-guardian.md`、`CLAUDE.md`、`GEMINI.md`、`.vscode/tasks.json`。
   - 规则：适配器文件告诉 Codex、Cursor、Copilot、Windsurf、Cline、Continue、Claude Code、Gemini CLI、VS Code 和通用 AI Agent 先读取并维护 Project Guardian 记忆；已有适配器文件必须保留。
   - 已知边界情况：团队可以在 `project-guardian.config.json` 中配置默认适配器，也可以在单次命令中用 `--adapter` 覆盖。VS Code 当前通过 tasks 和 Copilot instructions 适配，不是原生 VS Code 扩展，tasks 默认要求 `guardian-cmd` 命令可用；源码内置模式可把 task 命令改成本地 `node plugins/project-guardian/cmd/guardian-cmd.js ...`。

3. 通过 MCP 让 AI IDE 直接调用 Project Guardian。
   - 入口：`guardian mcp`。
   - 重要文件：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`。
   - 规则：MCP server 通过 stdio JSON-RPC 暴露 `guardian_brief`、`guardian_query`、`guardian_update`、`guardian_decision_add`、`guardian_verify`、`guardian_doctor`、`guardian_scan_secrets`、`guardian_handover`、`guardian_conflicts`、`guardian_adapters_doctor`、`guardian_reviews_due` 和 `guardian_review_complete`。
   - 已知边界情况：MCP 支持 `mcp.readOnly`、`mcp.allowedTools` 和 `PROJECT_GUARDIAN_MCP_READ_ONLY=1` 收紧工具权限，并会在启动时校验 MCP 配置、在工具调用时校验参数 schema；但不做身份认证或逐次审批。支持 MCP 的 IDE 需要配置 `guardian mcp` 或本地脚本路径。

4. 使用可选 `Run/` 本地可视化层。
   - 入口：`npm run ui` 或 `node Run/server.js`。
   - 重要文件：`Run/server.js`、`Run/lib/commands.js`、`Run/public/index.html`、`Run/public/styles.css`、`Run/public/app.js`、`Run/README.md`。
   - 规则：可视化层和核心 CLI/MCP
[snapshot truncated]
```

## 决策快照

```text
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
- 影响文件/模块：plugins/project-guardian/scripts/lib/memory-repair.js, plugins/project-guardi
[snapshot truncated]
```

## 风险区域

- 修改核心行为前先查看状态文件中的 `风险区域`。
- 提交交接变更前运行 `guardian verify`。

## 常见问题

| 问题 | 可能原因 | 处理方式 |
| --- | --- | --- |
| 记忆校验失败 | 必填字段仍是模板或待填写 | 补齐最新变更、当前状态和决策细节 |

## 新人第一天

1. 阅读全部项目记忆文件。
2. 在本地跑起来项目。
3. 运行可用测试或冒烟检查。
4. 从 `memory/STATE.md` 里选一个小的下一步任务。
5. 完成后更新 `memory/STATE.md` 和 `memory/AI_CHANGELOG.md`。
