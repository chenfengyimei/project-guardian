# Project Guardian CI 与命令行操作文档

本文档专门说明 Project Guardian 的命令行操作、本地检查、Git Hook、Gitee Go CI 接入和常见问题。

## 1. 命令总览

所有命令都在目标项目根目录运行。推荐把 Project Guardian 安装成全局 CLI 后使用 `guardian`，这样不用再写 `node plugins/project-guardian/scripts/guardian.js` 这一长串相对路径。

```bash
# 已发布到 npm 后
npm install -g project-guardian

# 从当前 Gitee 仓库安装
npm install -g git+https://gitee.com/chenfengloveyuri/project-guardian.git

guardian --version
guardian help
```

如果团队把插件源码直接放在项目的 `plugins/project-guardian/` 目录，也可以继续用脚本路径：

```bash
node plugins/project-guardian/scripts/guardian.js help
```

下文优先使用推荐的 `guardian` 写法；保留脚本路径的示例表示未全局安装时的兼容用法。

```bash
guardian init
guardian init --language zh-CN
guardian init --language en
guardian doctor
guardian update "任务说明"
guardian append-memory --file STATE --template state-progress --task "任务说明" --current-status "当前状态" --next-step "下一步" --verification "验证方式"
guardian append-memory --templates
guardian handover
guardian check
guardian validate-docs
guardian scan-secrets
guardian verify
guardian brief "任务或问题"
guardian decision add --title "决策标题" --context "背景" --decision "决定"
guardian reviews
guardian reviews due
guardian reviews complete memory/decisions/example.md --summary "复审通过" --verification "已检查测试和文档"
guardian conflicts
guardian query
guardian mcp
guardian install-adapters --adapter cursor,copilot,windsurf,cline,continue,claude,gemini,vscode
guardian adapters doctor
guardian install-hooks
guardian install-ci
```

如果项目通过 `init` 写入了 npm scripts，也可以使用：

```bash
npm run guardian:doctor
npm run guardian:update -- "任务说明"
npm run guardian:append-memory -- --file STATE --content "补充一条项目记忆"
npm run guardian:handover
npm run guardian:check
npm run guardian:validate-docs
npm run guardian:brief -- "任务或问题"
npm run guardian:query
npm run guardian:reviews
npm run guardian:mcp
npm run guardian:adapters-doctor
npm run guardian:install-ci
npm run ui
```

当前版本推荐把提交前命令统一为：

```bash
guardian verify
```

如果没有全局安装 CLI，等价命令是：

```bash
node plugins/project-guardian/scripts/guardian.js verify
```

`verify` 会依次运行 `doctor`、`check`、`validate-docs`、`reviews`，并在配置开启时运行 `scan-secrets`。

## 1.1 AI IDE 受控命令层

`plugins/project-guardian/cmd/` 是给 AI IDE 和 Agent 使用的受控命令替代层。它把常见系统操作收敛为固定命令 ID，并在每次运行时自动写入本地代码级日志：

```bash
guardian-cmd list
guardian-cmd git-status
guardian-cmd git-diff-stat
guardian-cmd npm-test
guardian-cmd guardian-verify
guardian-cmd guardian-query "登录流程" --limit 3
guardian-cmd guardian-update "完成登录修复"
guardian-cmd guardian-handover
```

没有全局安装时使用源码路径：

```bash
node plugins/project-guardian/cmd/guardian-cmd.js list
node plugins/project-guardian/cmd/guardian-cmd.js git-status
```

日志文件：

```text
.project-guardian/cmd-audit.jsonl
```

日志字段包括调用时间、命令 ID、参数摘要、工作目录、命令类型、成功状态、退出码和耗时。参数会做基础脱敏，疑似密钥不会完整写入。日志写入失败时，`guardian-cmd` 会在 STDERR 输出 `Failed to write command audit log`；原本成功的命令会返回失败状态，避免出现“执行了但没有记录”的假成功。

这不是任意 shell 代理。`guardian-cmd` 只运行内置白名单命令，不支持管道、命令拼接或用户自定义可执行文件。AI IDE 执行命令时应先运行 `guardian-cmd list` 查找替代项；如果确实没有对应替代命令，才临时使用原始终端命令，并评估是否需要把该命令补进 `cmd/guardian-cmd.js`。

当前 Guardian 类替代命令覆盖 `init`、`update`、`append-memory`、`decision add`、`doctor`、`check`、`validate-docs`、`verify`、`scan-secrets`、`reviews`、`reviews due`、`reviews complete`、`handover`、`conflicts`、`install-adapters`、`adapters doctor`、`install-hooks`、`install-ci`、`query` 和 `brief`。`guardian mcp` 是长时间运行的 stdio 服务，建议在 AI IDE 的 MCP 配置中启动，不放进普通短命令目录。

## 2. 初始化命令

```bash
guardian init
```

默认语言是中文，生成 `memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md` 和 AI 规则文件时都会优先使用中文模板。

如果团队希望所有模板保持英文，可以在第一次初始化时指定：

```bash
guardian init --language en
```

语言会写入 `project-guardian.config.json` 的 `language` 字段。后续 `guardian update`、`guardian handover`、`guardian decision add` 和 `guardian install-adapters` 会按该配置继续生成中文或英文内容。

作用：

- 创建标准项目记忆文件。
- 创建 `AGENTS.md` 和 `.cursorrules`。
- 如果存在 `package.json`，自动加入 `guardian:*` scripts。全局 CLI 初始化的项目会写入 `guardian ...`；插件源码随项目提交时会写入本地脚本路径。
- 不覆盖已有同名文件。

运行后建议立即执行：

```bash
guardian doctor
```

### 2.1 AI 工具适配层

`init` 默认会按照配置生成通用规则和 Cursor 规则。需要更多工具时可以指定适配器：

```bash
guardian init --adapter all
guardian install-adapters --adapter codex,cursor,copilot,windsurf,cline,continue,claude,gemini,vscode
guardian adapters doctor
```

适配器含义：

- `generic`：生成 `AGENTS.md`，适合 Codex、通用 AI Agent 或自定义工具读取。
- `codex`：同样生成 `AGENTS.md`，强调 Codex 项目规则入口。
- `cursor`：生成 `.cursor/rules/project-guardian.mdc` 和兼容旧版本 Cursor 的 `.cursorrules`。
- `copilot`：生成 `.github/copilot-instructions.md` 和 `.github/instructions/project-guardian.instructions.md`。
- `windsurf`：生成 `AGENTS.md` 和 `.windsurf/rules/project-guardian.md`。
- `cline`：生成 `.clinerules/project-guardian.md`。
- `continue`：生成 `.continue/rules/project-guardian.md`。
- `claude`：生成 `CLAUDE.md`。
- `gemini`：生成 `GEMINI.md`。
- `vscode` / `vscode-copilot`：生成 Copilot instructions，并生成 `.vscode/tasks.json`，提供 Verify、Update Memory、Brief、Query、Handover 任务。

适配器文件和核心记忆文件分开管理。再次运行 `install-adapters` 时，已有同名规则文件会被保留，不会覆盖团队已经调整过的规则。
新项目第一次 `init --adapter copilot` 或 `init --adapter all` 时，CLI 会把本次选择写入 `project-guardian.config.json`，后续 `doctor` 会按同一套适配器规则检查。

如果团队改过 `project-guardian.config.json` 中的 `memoryFiles` 路径，适配器模板会在生成时注入真实路径，不会继续写死默认的 `memory/...`。

VS Code tasks 默认执行 `guardian-cmd` 命令。使用 VS Code 任务前，请先确认 `guardian-cmd list` 在当前终端能运行；如果团队只复制了插件源码、没有全局安装 CLI，则继续使用 `node plugins/project-guardian/cmd/guardian-cmd.js ...`，或把 `.vscode/tasks.json` 中的任务命令改成本地脚本路径。

### 2.2 适配器体检

```bash
guardian adapters doctor
```

作用：

- 列出 Codex、Cursor、Copilot、Windsurf、Cline、Continue、Claude Code、Gemini CLI 和 VS Code 的适配状态。
- 显示每个适配器需要的规则文件。
- 给出缺失适配器的安装命令。
- 提醒 VS Code 当前是 tasks + Copilot instructions，不是原生 VS Code 扩展。

### 2.3 MCP server

```bash
guardian mcp
```

`mcp` 会启动一个 stdio MCP server，让支持 MCP 的 AI IDE 直接调用 Project Guardian，而不是只依赖规则文件提示。

MCP 工具列表：

- `guardian_query`：查询项目记忆、源码片段和最近 Git 历史；可传 `limit` 控制返回片段数量，范围 1 到 10。
- `guardian_brief`：根据当前任务生成预算友好的记忆读取计划，列出必读文件、按需文件和粗略 token 估算；可传 `mode: "auto" | "quick" | "deep" | "full"` 控制读取深度。
- `guardian_update`：记录一次 AI 协助变更并刷新状态。
- `guardian_decision_add`：新增结构化决策。
- `guardian_verify`：运行完整质量闸门。
- `guardian_doctor`：检查接入状态和 Git 变更状态。
- `guardian_scan_secrets`：扫描记忆文件中的疑似密钥。
- `guardian_handover`：生成或刷新交接指南。
- `guardian_conflicts`：查看合并冲突和记忆冲突建议。
- `guardian_adapters_doctor`：查看 AI IDE 适配器状态。
- `guardian_reviews_due`：查看到期复审，存在到期未完成复审时返回失败。
- `guardian_review_complete`：标记某个复审文件为正常完成。

全局 CLI 配置示例：

```json
{
  "mcpServers": {
    "project-guardian": {
      "command": "guardian",
      "args": ["mcp"]
    }
  }
}
```

项目内源码模式配置示例：

```json
{
  "mcpServers": {
    "project-guardian": {
      "command": "node",
      "args": ["plugins/project-guardian/scripts/guardian.js", "mcp"]
    }
  }
}
```

MCP 权限可以通过 `project-guardian.config.json` 限制：

```json
{
  "mcp": {
    "readOnly": true,
    "allowedTools": ["guardian_brief", "guardian_query", "guardian_verify", "guardian_doctor"]
  }
}
```

- `readOnly: true` 会隐藏并阻止 `guardian_update`、`guardian_decision_add`、`guardian_review_complete` 和 `guardian_handover`。
- `allowedTools: []` 表示允许全部标准工具；填入工具名后只暴露这些工具。
- 临时只读可以设置环境变量 `PROJECT_GUARDIAN_MCP_READ_ONLY=1`。
- MCP 启动时会校验 `mcp` 配置，工具调用时会按 schema 拒绝多余参数、错误类型和越界 `limit`，避免 AI IDE 误以为无效参数已经生效。

### 2.3.1 本地可视化界面

`Run/` 是 Project Guardian 的可选可视化运行层，适合给不熟悉命令行的人查看状态、查看核心记忆内容、运行体检、初始化项目、手动追加记忆、生成 brief 和做本地知识查询。界面使用可收起的左侧侧边栏切换功能，首页只显示插件状态概览；核心记忆预览会把常见 Markdown 标题、列表、代码块和表格渲染成文档样式；知识查询模块拥有独立输出记录，命令操作模块集中展示 CLI 全量指令目录、通用命令输出、浏览器本地短操作日志和服务端本地审计日志，并按专用模块、只读检查、写入维护和终端服务分组。需要参数或确认词的命令会先弹出参数窗口，用户在弹窗里填写后再确定运行或取消，避免字段都挤在命令卡片里。

在仓库根目录运行：

```bash
npm run ui
```

如果没有使用 npm scripts，也可以直接运行：

```bash
node Run/server.js
```

默认地址：

```text
http://127.0.0.1:4357
```

指定端口或目标项目：

```bash
node Run/server.js --port 4358
node Run/server.js --cwd D:\your-project
```

当前 Web 界面不开放任意 shell。`/api/command` 只允许固定 CLI 命令目录：只读命令可直接运行，写入类命令必须输入 `RUN_COMMAND`，`init`、`brief`、`query` 这类已有专用界面的命令会引导用户打开对应模块，`mcp` 会提示到终端或 AI IDE 配置中启动。

Run 现在有三类受控写入入口：

- 插件初始化：输入确认词 `RUN_INIT` 后，调用固定的 `guardian init --language ...` 参数。
- 手动追加记忆：输入确认词 `APPEND_MEMORY` 后，只能追加到核心记忆文件白名单，并会先做基础敏感词拦截。界面会按目标记忆文件显示预设模板，用户只填写任务、状态、验证、风险、下一步等关键字段；如果模板列表暂时没有加载到专用模板，仍会保留“自定义完整记录”入口，避免出现无模板可选。
- 命令操作里的写入类 CLI：输入确认词 `RUN_COMMAND` 后，才会运行 `update`、`handover`、`decision add`、`reviews complete`、`install-adapters`、`install-hooks` 和 `install-ci` 等固定命令。

如果目标项目在 `project-guardian.config.json` 中自定义了核心记忆文件路径，Run 会按配置读取和写入；没有配置时使用默认 `memory/` 目录。

复杂写入仍建议优先在 CLI/MCP 中配合 Git diff 和团队审查流程执行；Run 入口用于降低小白操作门槛，但不替代代码评审、`guardian verify` 和人工安全确认。

Run 的服务端审计日志会写入目标项目根目录的 `.project-guardian/run-audit.jsonl`。它记录操作时间、API 路由、命令类型、成功状态、退出状态、耗时和受控参数摘要；不会记录 `brief` / `query` 的问题原文，也不会记录手动追加记忆的正文。默认 `.gitignore` 会忽略 `.project-guardian/`，避免打开控制台就污染工作区。这个日志适合本机追踪，不等同企业集中审计；如果团队要正式审计，需要自行采集该 JSONL 并补充登录、访问控制和日志保留策略。

当前新审计记录会额外写入 `sequence`、`previousHash`、`hashAlgorithm` 和 `hash`，形成本地 hash 链；`/api/audit-log` 会返回完整性校验结果，Run 页面会显示审计链是否通过。旧记录没有 hash 时会被标记为 legacy。这个机制是“可发现篡改迹象”，不是“无法篡改”：本地文件仍可能被有权限的人删除、替换或整体重写。企业正式使用时仍应把 `.project-guardian/run-audit.jsonl` 采集到集中日志系统或不可变存储。

如果需要给本地 Run API 加一层访问口令，可以在启动前设置：

```powershell
$env:GUARDIAN_RUN_TOKEN="your-local-token"
npm run ui
```

浏览器首次访问可以使用：

```text
http://127.0.0.1:4357/?token=your-local-token
```

前端会把 token 存入当前浏览器本地，并在后续 `/api/*` 请求中发送 `X-Guardian-Run-Token`。如果使用 `node Run/server.js --host 0.0.0.0` 让局域网访问，必须启用 `GUARDIAN_RUN_TOKEN`，并额外增加反向代理、登录鉴权、访问控制、HTTPS 和正式审计归档。

默认只监听 `127.0.0.1`。如果使用 `--host 0.0.0.0` 给局域网访问，必须由团队自行增加登录认证、访问控制、反向代理和操作审计。

## 2.4 决策复审命令

高风险功能、临时兼容方案、安全权限变化、质量闸门变化和 AI 工作流规则变化，应该通过 `guardian decision add` 记录决策，并设置 `--review-after`：

```bash
guardian decision add --title "登录限流策略" --context "防止爆破登录" --decision "启用 IP 限流" --review-after "2026-07-01"
```

查看复审状态：

```bash
guardian reviews
guardian reviews due
```

当复审时间到期且没有完成标记时，`guardian reviews due` 和 `guardian verify` 会失败，提醒 AI 或人工检查。复审完成后标记：

```bash
guardian reviews complete memory/decisions/2026-07-01-login-rate-limit.md --summary "复审通过，策略仍然有效" --verification "检查登录测试、限流配置和上线记录"
```

命令会在对应决策文件追加 `复审结果` 或 `Review Result`，写入复审状态、完成时间、复审人、结论、验证方式和“无需继续复审”。完成后该文件后续不会再触发到期复审。

## 3. 体检命令

```bash
guardian doctor
```

作用：

- 检查核心记忆文件是否存在。
- 检查 AI 规则文件是否存在。
- 显示 staged、working、untracked 文件数量。
- 判断项目是否是 Git 仓库。

适合在接入后、新人接手后、提交前快速确认状态。

## 4. 更新记忆命令

```bash
guardian update "实现登录验证码"
```

作用：

- 向 `memory/AI_CHANGELOG.md` 追加本次 AI 辅助开发记录。
- 更新 `memory/STATE.md` 的 `Latest AI-Assisted Change`。
- 自动读取 staged、working tree、untracked 文件列表。
- 自动写入 `git diff --stat` 摘要。
- 自动记录当前本地时间，格式为 `YYYY-MM-DD HH:mm`；人工补写时不要使用 `00:00` 占位。

运行后必须人工补全 `TODO` 字段，尤其是：

- `AI summary`
- `Business reason`
- `Verification`
- `Risks`
- `Next step`

### 4.1 模板化追加记忆

如果只需要补一条人工记忆，不想运行完整 `update` 模板，可以使用：

```bash
guardian append-memory --file STATE --template state-progress --task "整理 Run 控制台" --current-status "已完成主要功能" --next-step "运行 verify" --verification "本地测试通过"
```

常用参数：

- `--file`：目标核心记忆，支持 `PROJECT_CONTEXT`、`STATE`、`DECISIONS`、`AI_CHANGELOG`、`HANDOVER`，也支持 `context`、`state`、`changelog` 等别名。
- `--template`：模板 ID，例如 `state-progress`、`change-log-note`、`handover-note`。
- `--content`：不使用模板时的自由文本内容。
- `--templates`：查看可用模板和字段名。

这个命令和 Run 控制台的“追加记忆”模块使用同一套模板和敏感词拦截。重大架构或流程决策仍推荐使用 `guardian decision add`，因为它会同步创建单独决策文件并接入复审机制。

## 5. 交接命令

```bash
node plugins/project-guardian/scripts/guardian.js handover
```

作用：

- 生成或刷新 `memory/HANDOVER.md`。
- 汇总项目结构、当前状态、项目背景和决策快照。
- 给新人生成第一天接手建议。

以下情况必须运行：

- 换人。
- 实习生离职。
- 项目暂停超过一周。
- 版本交付前。
- 核心模块大改后。

## 6. 本地提交检查

```bash
node plugins/project-guardian/scripts/guardian.js check
```

作用：

- 如果 staged 代码有变更，但 staged 记忆文件没有变更，命令失败。
- 如果没有 staged 文件，则检查工作区和未跟踪文件。
- 纯记忆文件更新可以通过。

推荐提交前固定执行：

```bash
git add .
node plugins/project-guardian/scripts/guardian.js check
```

如果失败，通常这样修：

```bash
node plugins/project-guardian/scripts/guardian.js update "补充本次修改记录"
git add memory/STATE.md memory/AI_CHANGELOG.md
node plugins/project-guardian/scripts/guardian.js check
```

## 7. 文档质量检查

```bash
node plugins/project-guardian/scripts/guardian.js validate-docs
```

作用：

- 检查记忆文件是否缺少关键章节。
- 检查是否还有过多 `TODO`。
- 检查是否有大量空字段、空列表、空表格行。

新项目刚运行 `init` 后，`validate-docs` 失败是正常的，因为模板还没有填真实内容。接入完成、交接前、PR 前、发布前应该通过。

推荐组合：

```bash
node plugins/project-guardian/scripts/guardian.js verify
```

## 7.1 安全扫描命令

```bash
node plugins/project-guardian/scripts/guardian.js scan-secrets
```

作用：

- 扫描项目记忆文件中疑似 `password`、`secret`、`token`、`api_key`、private key 和高熵字符串。
- 输出文件和行号，但不会打印完整疑似密钥。
- 支持通过 `.guardianignore` 或 `project-guardian.config.json` 的 `ignore` 字段排除测试样例。

不要把客户隐私、生产密码、真实 token、真实私钥写入任何项目记忆文件。公开仓库尤其要在提交前运行 `verify`。

## 7.2 决策记录命令

```bash
node plugins/project-guardian/scripts/guardian.js decision add --title "采用配置文件" --context "需要跨项目适配" --decision "使用 project-guardian.config.json"
```

作用：

- 向 `memory/DECISIONS.md` 追加结构化决策。
- 同时在 `memory/decisions/` 下生成一份单独决策文件，降低多人同时改同一个决策文件的冲突概率。
- 可选字段包括 `--alternatives`、`--files`、`--related-change`、`--verification`、`--risks`、`--review-after`、`--follow-up`。

建议在这些情况下记录决策：框架或库选型、重要业务规则、兼容性处理、数据模型变化、安全策略、部署方式、CI 或工作流变化。

## 7.3 冲突检查命令

```bash
node plugins/project-guardian/scripts/guardian.js conflicts
```

作用：

- 检测当前 Git merge 冲突文件。
- 如果冲突涉及项目记忆文件，会给出保留历史、处理 `memory/STATE.md` 更新时间、合并决策字段、重新运行验证的建议。
- 有冲突时命令会返回失败状态，适合在手动排查时使用。

## 7.4 Token 预算读取计划

```bash
guardian brief "我要修复登录验证码问题"
guardian brief "新人接手这个项目" --limit 2
guardian brief "普通小改动" --mode quick
guardian brief "修复登录回归" --mode deep
guardian brief "新人接手项目" --mode full
```

如果没有全局 CLI，使用：

```bash
node plugins/project-guardian/scripts/guardian.js brief "我要修复登录验证码问题" --limit 3
```

作用：

- 先估算标准记忆文件的粗略 token 成本。
- 告诉 AI 本轮必须先读哪些文件，哪些文件只有相关时才读。
- 默认始终推荐 `memory/PROJECT_CONTEXT.md` 和 `memory/STATE.md`。
- 涉及决策、历史、交接时再推荐 `memory/DECISIONS.md`、`memory/AI_CHANGELOG.md` 或 `memory/HANDOVER.md`。
- 给出建议的 `guardian query "问题" --limit N` 命令，避免一次返回太多片段。
- 支持 `--mode auto|quick|deep|full`，让团队在风险升高时主动提高读取深度。

模式含义：

- `auto`：默认模式，按任务关键词推荐文件。
- `quick`：只读 `PROJECT_CONTEXT` 和 `STATE`，适合低风险日常小任务。
- `deep`：额外读取 `DECISIONS` 和 `AI_CHANGELOG`，适合 bug、回归、历史不清楚、高风险模块、测试失败或准备重构。
- `full`：读取全部核心记忆，适合新人接手、交接、上线、审计、大范围重构，或用户明确要求完整上下文。

推荐把 `brief` 作为 AI 每轮工作的第一步。按需读取不是硬限制；如果证据不足、查询结果冲突或任务风险变高，必须升级到 `deep` 或 `full` 后再修改。

## 8. 多轮知识查询

```bash
node plugins/project-guardian/scripts/guardian.js query
node plugins/project-guardian/scripts/guardian.js query "登录流程" --limit 3
```

作用：

- 优先检索标准记忆文件。
- 检索 AI 规则文件。
- 检索项目源码和 Markdown/YAML 文件。
- 检索最近 80 条 Git 提交历史。
- 非交互模式支持 `--limit 1..10`，用于控制返回片段数量和 token 消耗。
- 如果标准记忆已经命中，源码和 Git 历史只作为补充结果；偶然命中的 HTML/CSS/页面文案不会轻易挤掉项目记忆答案。

示例：

```text
guardian> 这个项目现在做到哪了？
guardian> 登录模块入口在哪里？
guardian> 最近为什么改了验证码？
guardian> 哪些地方风险最高？
guardian> exit
```

注意：当前 `query` 是本地轻量关键词检索，不依赖外部模型 API。日常答疑建议先用 `brief` 判断读取范围，再用 `query --limit 2` 或 `--limit 3` 获取少量证据；如果目标是查源码，请在问题里写清文件名、路径、函数名、报错文本或模块名；复杂语义问答后续可以升级为向量检索或 RAG。

## 9. 安装 Git Hook

```bash
node plugins/project-guardian/scripts/guardian.js install-hooks
```

作用：

- 在 `.git/hooks/pre-commit` 中追加 Project Guardian 检查块。
- 不覆盖已有 pre-commit hook。
- 重复运行不会重复追加。

安装后，每次本地提交都会自动运行：

```bash
node plugins/project-guardian/scripts/guardian.js check
node plugins/project-guardian/scripts/guardian.js validate-docs
node plugins/project-guardian/scripts/guardian.js scan-secrets
```

## 10. 安装 Gitee Go CI

```bash
node plugins/project-guardian/scripts/guardian.js install-ci
```

作用：

- 创建 `.workflow/project-guardian.yml`。
- 让 Gitee Go 在 push 时运行 Project Guardian 检查。

模板来源：

```text
plugins/project-guardian/assets/templates/gitee-go-project-guardian.yml
```

生成后的流水线默认检查 `master` 分支。如果你的主分支是 `main` 或 `develop`，请修改：

```yaml
triggers:
  push:
    - matchType: PRECISE
      branch: master
```

改成：

```yaml
branch: main
```

或：

```yaml
branch: develop
```

流水线会执行：

```bash
node plugins/project-guardian/scripts/guardian.js check
node plugins/project-guardian/scripts/guardian.js validate-docs
node plugins/project-guardian/scripts/guardian.js scan-secrets
```

如果使用当前 CLI 生成配置，也可以通过 `project-guardian.config.json` 修改默认分支和 Node 版本。

## 11. 推荐提交流程

普通开发：

```bash
guardian update "任务说明"
git add .
guardian verify
git commit -m "feat: describe change"
git push
```

交接前：

```bash
guardian update "阶段交接前整理"
guardian handover
git add .
guardian verify
git commit -m "docs: update project handover"
git push
```

第一次启用 CI：

```bash
guardian install-ci
git add .workflow/project-guardian.yml
git commit -m "ci: add project guardian checks"
git push
```

## 12. 常见失败和处理

### check 失败

原因：代码变更没有带上记忆文件更新。

处理：

```bash
node plugins/project-guardian/scripts/guardian.js update "补充本次修改记录"
git add memory/STATE.md memory/AI_CHANGELOG.md
```

### validate-docs 失败

原因：记忆文件仍有过多模板内容，或缺少关键章节。

处理：

- 补齐 `memory/PROJECT_CONTEXT.md` 的项目目标、技术栈、运行方式。
- 补齐 `memory/STATE.md` 的当前状态、下一步、风险。
- 补齐 `memory/DECISIONS.md` 的关键决策，或明确暂无关键决策。
- 补齐 `memory/HANDOVER.md` 的运行方式和新人接手步骤。

### install-ci 后 Gitee 没触发

检查：

- `.workflow/project-guardian.yml` 是否已提交到 Gitee。
- `branch` 是否和实际分支一致。
- Gitee Go 是否已启用。
- Gitee Go 是否支持当前账号或仓库的流水线功能。

## 13. 团队最低要求

如果团队刚开始执行，至少要求：

```bash
node plugins/project-guardian/scripts/guardian.js check
node plugins/project-guardian/scripts/guardian.js validate-docs
```

交接前额外要求：

```bash
node plugins/project-guardian/scripts/guardian.js handover
```
