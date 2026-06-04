# 交接指南

最后生成：2026-06-02

## 优先阅读

修改代码前先运行读取计划：

```bash
guardian brief "新人接手 Project Guardian"
guardian brief "新人接手 Project Guardian" --mode full
```

默认先阅读：

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`

如果读取计划推荐，再继续阅读：

3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`
5. `memory/HANDOVER.md`
6. `README.md`
7. `plugins/project-guardian/docs/CLI_AND_CI.md`
8. `plugins/project-guardian/docs/STANDARD.md`

## 如何运行

全局安装后的推荐 CLI 是 `guardian`。如果没有全局安装 package，则使用随项目提交路径 `node plugins/project-guardian/scripts/guardian.js <command>`。`guardian init` 在业务项目中补充 `package.json` scripts 时，会根据 CLI 是否位于项目内选择 `guardian ...` 或本地脚本路径。

```bash
# 检查 CLI 语法
node --check plugins/project-guardian/scripts/guardian.js

# 查看可用命令
guardian help

# 安装 AI 工具适配器并查看状态
guardian install-adapters --adapter cursor,copilot,windsurf,cline,continue,claude,gemini,vscode
guardian adapters doctor

# 给支持 MCP 的 AI IDE 调用
guardian mcp

# 查询项目知识并限制返回片段数量
guardian brief "登录流程"
guardian brief "修复登录回归" --mode deep
guardian query "登录流程" --limit 3

# 查看和完成到期决策复审
guardian reviews
guardian reviews due
guardian reviews complete memory/decisions/example.md --summary "复审通过" --verification "已检查测试和文档"

# 运行完整本地质量闸门
guardian verify

# 运行测试
npm.cmd test
```

## 项目地图

| 区域 | 文件 | 用途 |
| --- | --- | --- |
| 插件元数据 | `plugins/project-guardian/.codex-plugin/plugin.json`、`.agents/plugins/marketplace.json` | 让 Codex 发现和安装本地插件 |
| Skill | `plugins/project-guardian/skills/project-guardian/SKILL.md` | 告诉 Codex 在回答或编辑前如何使用项目记忆 |
| CLI | `plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/config.js`、`plugins/project-guardian/scripts/lib/doc-validation.js`、`plugins/project-guardian/scripts/lib/knowledge.js`、`plugins/project-guardian/scripts/lib/adapters.js`、`plugins/project-guardian/scripts/lib/manual-memory.js`、`plugins/project-guardian/scripts/lib/mcp.js` | 实现 init、update、handover、check、validation、brief、query、mcp、hooks、CI、decisions、conflicts、verify、安全扫描、配置加载、文档校验、query/brief 检索、手动记忆模板、AI 工具适配器解析和 adapters doctor |
| 模板 | `plugins/project-guardian/assets/templates/*`、`plugins/project-guardian/assets/templates/zh-CN/*` | 在目标项目运行 `guardian init` 或 `guardian install-adapters` 时复制英文/中文记忆文件、AI 工具规则和 VS Code tasks |
| 文档 | `README.md`、`plugins/project-guardian/docs/*`、`零基础超简单入门.md` | 说明接入、工作流、规范、CLI、CI 和零基础使用方式 |
| 测试 | `package.json`、`tests/guardian.test.js` | 使用临时仓库运行语法检查和命令行为测试 |
| 记忆 | `memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md` | 本仓库的可持续上下文 |

## 核心流程

- 新项目接入：全局安装 CLI 或复制插件源码，运行 `guardian init`，按实际 IDE 运行 `guardian install-adapters --adapter cursor,copilot,windsurf,cline,continue,claude,gemini,vscode`，补齐记忆，运行 `guardian verify`，然后提交。
- 语言选择：中文是默认语言。英文项目应在第一次初始化时运行 `guardian init --language en`，之后保持配置稳定。
- 日常开发：先运行 `guardian brief "任务"`，按需阅读记忆，做最小安全变更，运行项目测试，运行 `guardian update`，补齐 changelog 字段，运行 `guardian verify`。bug、回归、测试失败、高风险模块或准备重构时用 `--mode deep`；新人接手、交接、上线、审计或大范围重构时用 `--mode full`。
- 冲突处理：运行 `guardian conflicts`，解决代码和记忆冲突，保留双方有价值的历史，再重新运行 `guardian verify`。
- 交接：运行 `guardian update`，运行 `guardian handover`，审阅生成的交接指南，运行 `guardian verify`，然后推送。
- 决策复审：对临时方案、安全权限、质量闸门、MCP、CI 或兼容策略设置 `--review-after`；到期后运行 `guardian reviews due`，由 AI 或人工完成检查，再运行 `guardian reviews complete ...` 标记正常和无需继续复审。
- CI 接入：运行 `guardian install-ci`，审阅生成的 `.workflow/project-guardian.yml`，并按需通过配置调整分支或 Node 版本。
- MCP 接入：支持 MCP 的 AI IDE 使用 `guardian mcp`；没有全局 CLI 时使用 `node plugins/project-guardian/scripts/guardian.js mcp`。高风险环境先用只读和允许列表；先用 `guardian_brief` 做读取计划，查询时用 `guardian_query.limit` 控制返回片段数量。
- Run 可视化：运行 `npm run ui` 后在命令操作页用搜索框查找 CLI 命令；写入类命令弹窗会显示固定 Git diff 预览，并把简短结果写入操作日志。操作日志只是辅助审计，正式提交仍以 Git diff、`AI_CHANGELOG.md` 和 `guardian verify` 为准。

## 常见问题

| 问题 | 可能原因 | 处理方式 |
| --- | --- | --- |
| `validate-docs` 在 `init` 后失败 | 生成的记忆仍是模板 | 补齐真实项目上下文、状态、决策、变更日志和交接细节 |
| 提交前 `check` 失败 | 代码有变更，但没有对应记忆更新 | 运行 `guardian update "任务摘要"`，补齐新记录，并暂存记忆文件 |
| CI 中 hook 不执行 | Git hooks 只在本地运行 | 使用 `guardian install-ci` 生成 Gitee Go 流水线，或手动加入等价 CI 命令 |
| Query 回答不完整 | 当前 query 是关键词检索 | 先运行 `guardian brief "问题"` 判断该读哪些记忆，再使用文件名或业务关键词提问，并查看列出的来源路径 |
| 英文 init 生成中文 AI 规则 | 旧版语言处理没有把 init 参数传给适配器生成 | 使用当前 CLI，并运行覆盖 `guardian init --language en` 的回归测试 |
| VS Code tasks 无法运行 | `.vscode/tasks.json` 默认调用 `guardian`，但 CLI 没在 PATH 中 | 先运行 `guardian --version` 确认可用；源码内置模式可改用本地 `node plugins/project-guardian/scripts/guardian.js ...` |
| MCP 工具调用没有结果 | IDE 没有正确配置 stdio 命令或工作目录 | 先在项目根目录手动运行 `guardian mcp`，再检查 IDE 的 MCP 配置 |
| 担心 MCP 误调用写入命令 | MCP 客户端会看到已开放的工具 | 在 `project-guardian.config.json` 设置 `mcp.readOnly: true` 或配置 `mcp.allowedTools` |
| MCP 启动失败并提示配置错误 | `mcp.readOnly` 或 `mcp.allowedTools` 写错 | 按 `project-guardian.config.json` 默认格式修正，或先运行 `guardian doctor` |
| MCP 查询返回太长 | 默认查询返回 6 个片段 | 先调用 `guardian_brief`，再调用 `guardian_query` 时传 `limit: 2` 或 `limit: 3` |
| `verify` 因复审到期失败 | 决策文件到了 `复审时间`，但还没有完成标记 | 人工或 AI 检查相关代码、文档和测试后，运行 `guardian reviews complete ... --summary ... --verification ...` |

## 风险区域

- 修改 `guardian.js` 或 `plugins/project-guardian/scripts/lib/*.js` 会影响 CLI 命令，发布前要在临时仓库中测试命令行为。
- 校验规则应该阻止空模板，但不能强迫团队写过量文档。
- 安全扫描必须隐藏敏感值，并允许通过 `.guardianignore` 对无害示例做排除。
- Gitee 工作流生成必须保持可配置，因为组织之间的分支名和流水线语法可能不同。
- MCP 支持只读模式和工具允许列表，但不做身份认证或逐次审批；接入后仍需依赖本地仓库权限、Git 权限、代码评审和 `guardian verify`。
- MCP 工具调用会严格校验参数；如果 AI IDE 传多余字段或错误类型，应修正工具参数，而不是绕过校验。
- 复审检测依赖标准字段名和 `YYYY-MM-DD` 日期；不要手写破坏 `Review after` / `复审时间` 和完成标记。

## 新人第一天

1. 运行 `guardian brief "新人第一天"`。
2. 按读取计划阅读必要项目记忆和根目录 README。
3. 运行 `guardian doctor`。
4. 运行 `node --check plugins/project-guardian/scripts/guardian.js`。
5. 运行 `npm.cmd test`。
6. 从 `memory/STATE.md` 里挑一个小问题开始。
7. 完成变更后更新项目记忆，并运行 `guardian verify`。
