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
- 包管理器：目标项目不强制使用 npm，但本仓库已经通过 `guardian` 和 `project-guardian` 暴露 package CLI。
- 部署位置：全局 CLI 安装、本地仓库插件目录、AI 工具适配规则、Codex 插件市场元数据、Git hooks、Gitee Go 工作流模板和可选 `Run/` 本地可视化层。
- 默认语言：`zh-CN`。英文团队可以使用 `guardian init --language en` 初始化。
- 环境要求：Node.js 18+；正式项目建议使用 Git；npm 只在安装 CLI、运行测试或发布包时需要；不需要数据库、后端服务、OpenAI API Key 或向量库。

## 核心业务流程

1. 初始化项目记忆。
   - 入口：全局安装后使用 `guardian init`；如果插件源码随项目提交，则使用 `node plugins/project-guardian/scripts/guardian.js init`。
   - 重要文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/*`。
   - 规则：创建标准记忆文件，不覆盖项目已经写好的同名记忆文件。
   - 已知边界情况：已有项目可能已经存在部分记忆文件，因此 CLI 必须保留现有内容并提示哪些文件被跳过。`guardian init --language en` 还必须把语言配置传给 AI 适配器模板，避免英文项目收到中文规则文件。全局 CLI 初始化带 `package.json` 的业务项目时，npm scripts 必须使用可移植的 `guardian ...` 命令，不能写入本机安装路径。

2. 安装 AI 工具适配规则。
   - 入口：`guardian install-adapters --adapter cursor,copilot,windsurf,cline,continue,claude,gemini,vscode`、`guardian init --adapter all` 和 `guardian adapters doctor`。
   - 重要文件：`plugins/project-guardian/scripts/lib/adapters.js`、`AGENTS.md`、`.cursorrules`、`.cursor/rules/project-guardian.mdc`、`.github/copilot-instructions.md`、`.github/instructions/project-guardian.instructions.md`、`.windsurf/rules/project-guardian.md`、`.clinerules/project-guardian.md`、`.continue/rules/project-guardian.md`、`CLAUDE.md`、`GEMINI.md`、`.vscode/tasks.json`。
   - 规则：适配器文件告诉 Codex、Cursor、Copilot、Windsurf、Cline、Continue、Claude Code、Gemini CLI、VS Code 和通用 AI Agent 先读取并维护 Project Guardian 记忆；已有适配器文件必须保留。
   - 已知边界情况：团队可以在 `project-guardian.config.json` 中配置默认适配器，也可以在单次命令中用 `--adapter` 覆盖。VS Code 当前通过 tasks 和 Copilot instructions 适配，不是原生 VS Code 扩展，tasks 默认要求 `guardian` 命令可用。

3. 通过 MCP 让 AI IDE 直接调用 Project Guardian。
   - 入口：`guardian mcp`。
   - 重要文件：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`。
   - 规则：MCP server 通过 stdio JSON-RPC 暴露 `guardian_brief`、`guardian_query`、`guardian_update`、`guardian_decision_add`、`guardian_verify`、`guardian_doctor`、`guardian_scan_secrets`、`guardian_handover`、`guardian_conflicts`、`guardian_adapters_doctor`、`guardian_reviews_due` 和 `guardian_review_complete`。
   - 已知边界情况：MCP 支持 `mcp.readOnly`、`mcp.allowedTools` 和 `PROJECT_GUARDIAN_MCP_READ_ONLY=1` 收紧工具权限，并会在启动时校验 MCP 配置、在工具调用时校验参数 schema；但不做身份认证或逐次审批。支持 MCP 的 IDE 需要配置 `guardian mcp` 或本地脚本路径。

4. 使用可选 `Run/` 本地可视化层。
   - 入口：`npm run ui` 或 `node Run/server.js`。
   - 重要文件：`Run/server.js`、`Run/public/index.html`、`Run/public/styles.css`、`Run/public/app.js`、`Run/README.md`。
   - 规则：可视化层和核心 CLI/MCP 隔离，但随插件一起发布；默认只监听 `127.0.0.1`，不提供任意 shell 执行；左侧侧边栏负责功能切换，首页只显示插件状态概览；`/api/command` 只开放只读白名单命令，核心记忆预览会把常见 Markdown 标题、列表、代码块和表格渲染成文档样式，手动追加只使用 `project-guardian.config.json` 中的记忆路径或默认 `memory/` 路径。
   - 已知边界情况：Run 目前只有两个受控写入入口：输入 `RUN_INIT` 后运行固定 `guardian init --language ...`，输入 `APPEND_MEMORY` 后追加到核心记忆白名单并做基础敏感词拦截。如果团队使用 `--host 0.0.0.0` 让局域网访问，必须自行增加登录认证、访问控制、反向代理和操作审计。

5. 控制 AI 读取项目记忆的 token 成本。
   - 入口：`guardian brief "任务或问题"`、`guardian brief "任务或问题" --mode quick|deep|full`、MCP `guardian_brief`、`guardian query "问题" --limit 3` 和 MCP `guardian_query.limit`。
   - 重要文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/mcp.js`、AI 规则模板、Project Guardian 文档。
   - 规则：AI 每轮先生成读取计划，默认先读 `memory/PROJECT_CONTEXT.md` 和 `memory/STATE.md`；只有涉及决策、历史、风险、交接或上线时，才继续读取 `memory/DECISIONS.md`、`memory/AI_CHANGELOG.md` 或 `memory/HANDOVER.md`。`quick` 只读核心两份，`deep` 读取核心、决策和变更日志，`full` 读取全部核心记忆。
   - 已知边界情况：`brief` 使用本地文件大小估算粗略 token，不能替代语义检索；按需读取不是硬限制，bug、回归、测试失败、高风险模块、历史不清楚或准备重构时必须升级到 `deep`，新人接手、交接、上线、审计、大范围重构或完整上下文请求必须升级到 `full`。

6. 在提交前执行记忆质量闸门。
   - 入口：`guardian check`、`guardian validate-docs`、`guardian reviews due` 和 `guardian verify`。
   - 重要文件：`plugins/project-guardian/scripts/guardian.js`、`project-guardian.config.json`、`.guardianignore`。
   - 规则：代码变更通常应带上有意义的记忆更新；记忆文件不能停留在空模板；疑似密钥不能写入记忆；到期但未完成的决策复审会让 `guardian verify` 失败。
   - 已知边界情况：纯格式化或元数据变更可能不需要更新记忆；团队可以通过配置调整忽略路径和质量规则。

7. 保存交接和决策上下文。
   - 入口：`guardian update`、`guardian handover`、`guardian decision add`、`guardian reviews`、`guardian reviews due` 和 `guardian reviews complete`。
   - 重要文件：`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md`、`memory/decisions/*.md`。
   - 规则：每次 AI 协助变更都应说明改了什么、为什么改、如何验证、剩余风险是什么，以及下一位开发者需要知道什么。临时方案、安全权限、质量闸门、MCP、CI、兼容策略等需要后续确认的决策应设置复审时间。
   - 已知边界情况：刚运行 `init` 后的输出故意是不完整模板，团队填入真实项目上下文前应无法通过校验。复审检测依赖决策文件中的 `Review after` 或 `复审时间` 字段；完成复审后要写入“无需继续复审”。

8. 处理项目记忆冲突。
   - 入口：`guardian conflicts`。
   - 重要文件：Git 冲突状态、`memory/` 下的项目记忆文件和 `memory/decisions/*.md`。
   - 规则：保留冲突双方有价值的历史记录，确保状态日期准确，解决后重新运行 `guardian verify`。
   - 已知边界情况：只有 Git 记录到未解决冲突后，命令才能检测到冲突；普通工作区会显示无冲突。

9. 查询本地项目知识。
   - 入口：`guardian query`、`guardian query "问题"` 和 `guardian query "问题" --limit 3`。
   - 重要文件：记忆文件、源码文件、Markdown 文件、YAML 文件和最近 Git 历史。
   - 规则：当前查询是本地关键词检索，不是托管 AI 服务；结果应显示来源路径，方便开发者核实。`--limit` / `guardian_query.limit` 可控制返回片段数量，减少上下文噪声和 token 成本。
   - 已知边界情况：语义检索、向量索引和任务系统检索属于后续规划，不是当前版本必需功能。

## 外部依赖

| 依赖 | 用途 | 负责人 | 备注 |
| --- | --- | --- | --- |
| Node.js | 运行 CLI 和测试套件 | 项目维护者 | 推荐基线版本为 18 或更新版本 |
| npm | 提供可选的全局 CLI 安装和仓库测试脚本 | 项目维护者 | `package.json` 暴露 `guardian` / `project-guardian` bin；Git 安装源为 `git+https://gitee.com/chenfengloveyuri/project-guardian.git` |
| Git | 读取 staged、working、untracked 文件和最近历史 | 项目维护者 | `check`、`update`、hooks 和 CI 工作流需要 Git |
| Gitee Go | 可选的远程 CI 执行环境 | 仓库负责人 | 团队使用 Gitee 流水线时由 `guardian install-ci` 生成 |
| AI 工具规则适配器 | 让同一套记忆流程可用于 Codex、Cursor、Copilot、Windsurf、Cline、Continue、Claude Code、Gemini CLI、VS Code 和通用 AI Agent | 项目维护者 | 安装到 `AGENTS.md`、`.cursor/`、`.github/`、`.windsurf/`、`.clinerules/`、`.continue/`、`CLAUDE.md`、`GEMINI.md` 和 `.vscode/tasks.json` |
| Codex 插件元数据 | 让插件可被 Codex 发现 | 项目维护者 | 存放在 `plugins/project-guardian/.codex-plugin/plugin.json` 和 `.agents/plugins/marketplace.json` |

## 数据模型

| 对象 | 重要字段 | 备注 |
| --- | --- | --- |
| 项目记忆 | 上下文、状态、决策、变更日志、交接指南 | 以 Markdown 文件保存，方便人和 AI 直接阅读 |
| 记忆目录 | `memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md` | CLI 默认生成和维护的位置，用于避免根目录被项目记忆文件占满 |
| Guardian 配置 | 记忆路径、质量规则、hook 行为、CI 默认值、安全扫描开关、MCP 工具权限、默认适配器、忽略路径 | 存放在 `project-guardian.config.json`，默认零配置可用 |
| AI IDE 适配器 | adapter 名称、目标文件、模板文件、安装状态 | 由 `scripts/lib/adapters.js` 维护，`guardian adapters doctor` 输出当前状态 |
| MCP 工具 | 工具名、输入 schema、CLI 子命令映射、返回文本 | 由 `scripts/lib/mcp.js` 维护，支持 MCP 的 IDE 通过 stdio 调用；多余参数、错误类型和越界 query limit 会被拒绝 |
| Run 可视化层 | 本地 HTTP server、静态页面、侧边栏导航、Markdown 记忆预览、受控初始化、手动追加记忆、只读命令白名单 | 存放在 `Run/`，默认只监听 localhost，通过固定参数调用现有 CLI，不复制核心业务逻辑；记忆路径优先来自 `project-guardian.config.json` |
| 读取计划 | 任务问题、读取模式、推荐文件、必读文件、按需文件、粗略 token 估算、建议查询 limit、升级触发条件 | 由 `guardian brief` 和 MCP `guardian_brief` 输出，用于让 AI 在打开大型历史记忆前先做成本判断；支持 `auto`、`quick`、`deep` 和 `full` |
| 语言配置 | `zh-CN` 或 `en` | 控制初始化模板，以及 update、handover、decision 和适配器规则的生成语言 |
| 决策记录 | 标题、日期、背景、决策、备选方案、影响文件、验证方式、风险、复审时间、后续动作 | 存放在 `memory/DECISIONS.md`，也可以同步生成单独决策文件 |
| 决策文件 | 每个重要决策一份 Markdown 文件 | 使用 `guardian decision add` 时存放在 `memory/decisions/`；`guardian reviews` 会扫描这些文件的复审时间 |
| 复审结果 | 复审状态、完成时间、复审人、结论、验证方式、后续复审 | `guardian reviews complete` 会追加到对应决策文件；标记无需继续复审后不再触发到期失败 |
| 查询文档 | 文件路径、片段文本、分数 | 运行时从记忆文件、源码文件、Markdown/YAML 文件和 Git 历史构建 |

## 如何运行

```bash
# 语法检查
node --check plugins/project-guardian/scripts/guardian.js

# 在目标项目中初始化记忆
guardian init

# 安装其它 AI 工具的适配规则
guardian install-adapters --adapter cursor,copilot

# 生成预算友好的读取计划
guardian brief "我要修改登录流程"

# 运行完整本地质量闸门
guardian verify

# 运行测试
npm.cmd test
```

## 环境变量

| 名称 | 是否必填 | 说明 | 示例 |
| --- | --- | --- | --- |
| `PROJECT_GUARDIAN_MCP_READ_ONLY` | 否 | 临时强制 MCP server 只读，隐藏并阻止写入类工具 | `PROJECT_GUARDIAN_MCP_READ_ONLY=1` |

## 重要约束

- CLI 必须保持轻量，小仓库不需要部署服务、数据库或付费 API 也能使用。
- 默认工作流必须兼容 Windows PowerShell 和常见 Unix shell。
- 已有项目记忆必须保留；模板生成和 update 命令应追加或修订，不应删除人工写好的上下文。
- 安全检查必须输出文件和行号，同时隐藏疑似敏感值。
- 文档要面向非专业开发者保持实用，不依赖没有记录下来的 AI 聊天历史。

## AI 注意事项

- AI Agent 修改项目代码前必须先运行读取计划，并至少阅读本文件和 `memory/STATE.md`。
- 长期稳定的业务和技术上下文应该写在这里。
- 不要把生产密码、真实 token、客户隐私数据或其它密钥写入项目记忆。
