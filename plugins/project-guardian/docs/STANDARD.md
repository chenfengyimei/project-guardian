# Project Guardian 使用规范

本文档定义 Project Guardian 插件标准、目录结构、记忆文件标准和团队执行规则。

## 1. 插件标准目录

插件自身目录必须保持：

```text
project-guardian/
  .codex-plugin/
    plugin.json
  skills/
    project-guardian/
      SKILL.md
  scripts/
    guardian.js
    lib/
      adapters.js
  assets/
    icon.svg
    templates/
      PROJECT_CONTEXT.md
      STATE.md
      DECISIONS.md
      AI_CHANGELOG.md
      HANDOVER.md
      AGENTS.md
      cursorrules
      cursor-rules.mdc
      copilot-instructions.md
      copilot-project-guardian.instructions.md
      windsurf-rule.md
      cline-rule.md
      continue-rule.md
      CLAUDE.md
      GEMINI.md
      vscode-tasks.json
      gitee-go-project-guardian.yml
      zh-CN/
        PROJECT_CONTEXT.md
        STATE.md
        DECISIONS.md
        AI_CHANGELOG.md
        HANDOVER.md
        AGENTS.md
        cursorrules
        cursor-rules.mdc
        copilot-instructions.md
        copilot-project-guardian.instructions.md
        windsurf-rule.md
        cline-rule.md
        continue-rule.md
        CLAUDE.md
        GEMINI.md
        vscode-tasks.json
  docs/
    CLI_AND_CI.md
    INTEGRATION.md
    STANDARD.md
    WORKFLOW.md
```

不得删除：

- `.codex-plugin/plugin.json`
- `skills/project-guardian/SKILL.md`
- `scripts/guardian.js`
- `assets/templates/`

仓库根目录必须保留 `README.md` 作为第一次使用者的入口文档；README 不放在插件目录内。

## 2. 项目接入后标准目录

目标项目接入后，根目录必须包含：

```text
memory/
  PROJECT_CONTEXT.md
  STATE.md
  DECISIONS.md
  AI_CHANGELOG.md
  HANDOVER.md
project-guardian.config.json
AGENTS.md
.cursorrules
.cursor/
  rules/
    project-guardian.mdc
.github/                         # 安装 Copilot 适配器时生成
  copilot-instructions.md
  instructions/
    project-guardian.instructions.md
.vscode/                         # 安装 VS Code 适配器时生成
  tasks.json
.windsurf/                       # 安装 Windsurf 适配器时生成
  rules/
    project-guardian.md
.clinerules/                     # 安装 Cline 适配器时生成
  project-guardian.md
.continue/                       # 安装 Continue 适配器时生成
  rules/
    project-guardian.md
CLAUDE.md                        # 安装 Claude Code 适配器时生成
GEMINI.md                        # 安装 Gemini CLI 适配器时生成
.guardianignore
```

默认接入语言是中文，配置文件中应包含：

```json
{
  "language": "zh-CN"
}
```

英文团队可以在第一次初始化时使用 `guardian init --language en`，对应配置值为 `"en"`。同一个项目不建议频繁切换语言，避免历史记录和交接文档中英混杂。

建议但不强制：

```text
plugins/project-guardian/
memory/decisions/
```

如果团队不希望每个项目保存插件源码，可以把插件放到统一工具仓库，但项目内仍必须保留标准记忆文件。
`memory/decisions/` 是推荐目录，使用 `guardian decision add` 后会自动创建，用于一条决策一个文件。

## 3. 标准记忆文件职责

### memory/PROJECT_CONTEXT.md

长期稳定上下文。记录项目为什么存在、给谁用、核心业务流程是什么、使用什么技术栈、如何运行。

必须包含：

- 项目名称和目标。
- 目标用户或业务方。
- 技术栈。
- 核心业务流程。
- 运行、测试、构建命令。
- 外部依赖和环境变量。

### memory/STATE.md

当前状态。记录项目现在做到哪、下一步做什么、有哪些问题和风险。

必须包含：

- Current Status
- Completed
- In Progress
- Next Steps
- Known Issues
- Risk Areas
- Latest AI-Assisted Change

### memory/DECISIONS.md

历史决策。记录为什么这样做，而不是只记录做了什么。
团队协作时推荐同时使用 `memory/decisions/*.md`，一条重要决策一个文件，`memory/DECISIONS.md` 保留主要索引和关键决策摘要。

以下情况必须记录：

- 选择或更换框架、库、数据库、部署方式。
- 重要业务规则被固化到代码中。
- 为兼容旧系统做了特殊处理。
- 为修复线上问题引入非直观逻辑。
- 安全、权限、数据模型、支付、登录等高风险模块变化。

以下情况建议设置复审时间：

- 临时方案、兼容旧系统、绕过限制或风险兜底。
- 安全、权限、登录、数据模型、支付、CI、质量闸门和 MCP 工具权限变化。
- AI 工作流规则变化，可能需要观察一段时间确认是否仍有效。

复审记录应写入 `memory/decisions/*.md`。到期未完成的复审会被 `guardian reviews due` 和 `guardian verify` 检测出来。复审完成后必须写明复审状态、复审完成时间、复审人、复审结论、验证方式和“无需继续复审”。

### memory/AI_CHANGELOG.md

AI 辅助开发流水账。每次 AI 改代码后必须追加一条记录。

必须包含：

- 标题时间使用真实本地时间，格式为 `YYYY-MM-DD HH:mm`，不能把 `00:00` 当占位时间。
- Human request
- AI summary
- Files changed
- Business reason
- Technical notes
- Verification
- Risks
- Sensitive data checked
- Next step

### memory/HANDOVER.md

新人交接指南。换人、离职、交付、暂停超过一周时必须刷新。

必须让新人知道：

- 如何启动项目。
- 代码结构怎么看。
- 核心流程在哪里。
- 哪些地方最容易出错。
- 第一天应该做什么。

### AI 工具适配规则

`AGENTS.md`、`.cursorrules`、`.cursor/rules/project-guardian.mdc`、`.github/copilot-instructions.md`、`.github/instructions/project-guardian.instructions.md`、`.windsurf/rules/project-guardian.md`、`.clinerules/project-guardian.md`、`.continue/rules/project-guardian.md`、`CLAUDE.md`、`GEMINI.md` 和 `.vscode/tasks.json` 都属于 AI 工具适配规则或 IDE 任务入口。它们要求 AI 修改前先读记忆，修改后更新记忆。

不得写成泛泛而谈的口号，必须明确列出要读取和更新的文件。

## 4. 记录质量标准

每条记录都必须回答三个问题：

1. 改了什么？
2. 为什么改？
3. 下个人接手时要注意什么？

不合格示例：

```text
修复 bug。
```

合格示例：

```text
修复登录验证码校验失败。原因是后端接口在 2026-05-12 开始要求 captchaToken，前端只传了 captchaCode。
涉及 src/auth/login.ts 和 src/api/auth.ts。已手动验证正常登录和验证码错误提示。
后续修改登录流程时不要移除 captchaToken，否则旧问题会复现。
```

## 5. AI 使用规则

开发者使用 AI 时必须遵守：

- 让 AI 在改代码前先运行 `guardian brief "任务或问题"`，再读取本轮必要的项目记忆。
- 默认先读 `memory/PROJECT_CONTEXT.md` 和 `memory/STATE.md`；`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md` 按任务需要再读。
- 按需读取不是硬限制。bug、回归、测试失败、高风险模块、历史不清楚、准备重构时必须升级到 `guardian brief "任务" --mode deep`。
- 新人接手、交接、上线、审计、大范围重构或用户要求完整上下文时必须升级到 `guardian brief "任务" --mode full`。
- AI 生成的关键代码必须要求解释业务原因。
- AI 修改完成后必须运行 `update` 或手动更新记忆。
- AI 不能只回答“已完成”，必须说明验证方式和风险。
- AI 不确定时必须把不确定点写入 `memory/STATE.md` 或 `memory/AI_CHANGELOG.md`。

## 6. 提交规范

代码提交必须满足：

- 业务代码变更通常要包含记忆文件变更。
- 纯格式化、依赖锁文件自动刷新、无业务影响的机械变更可以不更新记忆。
- 如果引入新风险或新约定，必须更新 `memory/DECISIONS.md`。
- 提交前运行：

  ```bash
  node plugins/project-guardian/scripts/guardian.js verify
  ```

推荐 commit message：

```text
feat(auth): add login captcha
docs(memory): record login captcha decision
```

## 7. 交接规范

以下情况必须运行：

```bash
node plugins/project-guardian/scripts/guardian.js handover
```

- 实习生离职或换岗。
- 项目暂停超过一周。
- 项目交付给新团队。
- 版本上线前。
- 核心模块大改后。

交接文档生成后必须人工检查运行命令、账号权限、环境变量和风险区域。

## 8. 多轮查询规范

使用：

```bash
node plugins/project-guardian/scripts/guardian.js query
node plugins/project-guardian/scripts/guardian.js query "登录流程" --limit 3
```

查询顺序建议：

1. 先运行 `guardian brief "问题"`，判断应该读取哪些记忆文件。
2. 再问项目整体状态。
3. 再问目标模块入口。
4. 再问历史原因和风险。
5. 最后问下一步实施方案。

日常查询建议先用 `--limit 2` 或 `--limit 3`，只有证据不足时再提高到 5 或 10。若查询结果冲突、缺少关键来源或风险升高，必须升级到 `brief --mode deep` 或 `brief --mode full`。

如果查询发现记忆文件缺失、过期或不准确，必须更新对应记忆文件。

## 9. 维护规范

维护插件时必须检查：

- `plugin.json` 是合法 JSON。
- `guardian.js` 通过 `node --check`。
- `init` 不覆盖已有记忆文件。
- `check` 能检查 staged 代码变更。
- `validate-docs` 能发现过多 TODO、空字段、缺失章节、疑似编码损坏、非法控制字符，以及不符合“最新在前”约定的决策和变更日志。
- `install-hooks` 不覆盖已有 hook。
- `install-ci` 能生成 Gitee Go 流水线模板。
- `decision add` 能创建结构化决策并生成 `memory/decisions/*.md`。
- `conflicts` 能识别 Git merge 冲突并提示记忆文件冲突处理方式。
- 文档和模板能让第一次使用者独立接入。

建议每次修改插件后运行：

```bash
node --check plugins/project-guardian/scripts/guardian.js
npm.cmd test
node plugins/project-guardian/scripts/guardian.js verify
npm.cmd pack --dry-run
```

## 10. 自动化标准

推荐目标项目安装：

```bash
node plugins/project-guardian/scripts/guardian.js install-hooks
node plugins/project-guardian/scripts/guardian.js install-ci
```

`install-hooks` 用于本地提交前检查，`install-ci` 用于 Gitee Go 远端流水线检查。两者都不替代人工复核，但可以防止“代码改了、记忆没更新”的常见漏项。

## 11. 配置文件标准

`project-guardian.config.json` 用来让不同项目在不改 CLI 源码的情况下调整规则。默认支持：

- `memoryFiles`：调整记忆文件路径。
- `hooks.runValidateDocs`：控制本地 hook 是否运行文档质量检查。
- `ci.defaultBranch`：设置 Gitee Go 默认触发分支。
- `ci.nodeVersion`：设置 CI 使用的 Node 版本。
- `quality.taskIdPattern`：要求 changelog 或 decision 中出现任务编号。
- `quality.requireChangedLines`：要求 changelog 记录变更行范围。
- `security.scanSecrets`：控制 `verify` 是否运行安全扫描。
- `mcp.readOnly`：控制 MCP 是否只开放只读工具。
- `mcp.allowedTools`：控制 MCP 只暴露指定工具；空数组表示允许全部标准工具。
- `language`：控制初始化模板和后续生成内容语言，支持 `zh-CN` 和 `en`。
- `adapters`：控制 `init` 默认生成哪些 AI 工具规则，支持 `generic`、`codex`、`cursor`、`copilot`、`windsurf`、`cline`、`continue`、`claude`、`gemini`、`vscode`、`vscode-copilot` 或 `all`。
- `ignore`：排除不参与扫描或索引的路径片段。

默认配置应保持零门槛可用。只有团队确实需要不同目录、任务编号或 CI 分支时才修改配置。

## 12. MCP 标准

`guardian mcp` 是 Project Guardian 的 stdio MCP 入口。它不创建文件，而是让支持 MCP 的 AI IDE 直接调用项目记忆工具。

当前标准工具：

- `guardian_brief`
- `guardian_query`
- `guardian_update`
- `guardian_decision_add`
- `guardian_verify`
- `guardian_doctor`
- `guardian_scan_secrets`
- `guardian_handover`
- `guardian_conflicts`
- `guardian_adapters_doctor`
- `guardian_reviews_due`
- `guardian_review_complete`
- `guardian_memory_health`
- `guardian_memory_repair`

MCP 工具调用仍然要遵守项目记忆标准：修改代码后必须更新 `memory/STATE.md` 和 `memory/AI_CHANGELOG.md`；重要决策必须记录到 `memory/DECISIONS.md` 或 `memory/decisions/`；敏感信息不能写入记忆。

MCP 参数必须遵守工具 schema。`guardian_brief` 用于生成预算友好的读取计划；`guardian_query.limit` 用于控制返回片段数量，范围 1 到 10；多余参数、错误类型或越界值会被拒绝。这样可以避免 AI IDE 传入无效字段后静默忽略，也能在查询时控制上下文和 token 成本。

高风险环境应优先使用：

```json
{
  "mcp": {
    "readOnly": true,
    "allowedTools": ["guardian_brief", "guardian_query", "guardian_verify", "guardian_doctor"]
  }
}
```

只读模式会隐藏并阻止 `guardian_update`、`guardian_decision_add`、`guardian_review_complete`、`guardian_handover` 和 `guardian_memory_repair`，但保留只读的 `guardian_memory_health`。MCP 写任务必须按到达顺序等待已有读取结束，后到读取不得越过排队中的写任务。

结构化更新推荐一次提供 summary、reason、verification、risks、sensitiveData 和 nextStep，避免生成后再人工补占位字段。`guardian repair-memory` 默认只读；只有显式 `--write` 才能按独立决策文件重建索引并排序 changelog。

## 13. 受控命令标准

AI IDE 或 Agent 需要执行常见系统命令时，应先查看并使用 `guardian-cmd`：

```bash
guardian-cmd list
guardian-cmd git-status
guardian-cmd guardian-verify
```

没有全局安装时使用：

```bash
node plugins/project-guardian/cmd/guardian-cmd.js list
node plugins/project-guardian/cmd/guardian-cmd.js git-status
```

标准要求：

- `guardian-cmd` 只提供固定白名单命令，不开放任意 shell。
- 每次调用必须自动追加 `.project-guardian/cmd-audit.jsonl`。
- 日志必须记录时间、命令 ID、参数摘要、工作目录、成功状态、退出码和耗时。
- 日志写入失败时必须显式报错；原本成功的命令应返回失败状态，避免 AI IDE 误判为已执行且已记录。
- 参数摘要必须做基础脱敏，不能完整记录密码、token、私钥、客户隐私或大段业务正文。
- 新增命令时必须补测试，至少覆盖成功执行、非法参数拒绝和日志写入。
- 如果当前没有替代命令，可以临时使用原始终端命令，但应评估是否把它补进受控命令目录。

`guardian-cmd` 适合记录 AI IDE 常规命令执行轨迹，不等同企业集中审计。正式审计场景需要把 `.project-guardian/cmd-audit.jsonl` 采集到集中日志或不可变存储。

## 14. 当前限制和风险

- CLI 需要 Node.js 18 或更新版本；`check`、`update`、`verify`、hooks 和 CI 需要 Git。
- Project Guardian 不依赖 Codex 才能使用；Codex 只是支持度最高的插件形态。其它 IDE 主要通过 CLI 和规则文件适配。
- VS Code 当前是 `.vscode/tasks.json` 加 Copilot instructions，不是原生 VS Code 扩展。任务默认调用 `guardian-cmd`，使用前要保证该命令在 PATH 中；源码内置模式可把任务命令改成 `node plugins/project-guardian/cmd/guardian-cmd.js ...`。
- MCP 当前是 stdio JSON-RPC 入口，支持配置化工具限制，但不包含身份认证或逐次审批；接入公开仓库或多人环境时，要继续依赖 Git 权限和代码评审。
- `guardian-cmd` 只能覆盖已加入白名单的常见命令；没有替代项时仍可能需要原始终端命令，后续应按团队高频场景逐步补齐。
- `query` 是本地混合检索，结合关键词、同义词扩展和 n-gram 相似度；它仍不是语义向量检索或外部 RAG，表达差异特别大时仍要换关键词、提高 limit 或查看来源文件。
- 各 AI IDE 的规则文件约定可能变化，新增或升级 IDE 后要运行 `guardian adapters doctor` 并复核官方文档。
- 记忆文件不能写入生产密码、真实 token、客户隐私或私钥；提交前运行 `guardian verify`，并保留人工复核。
