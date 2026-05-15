# 交接指南

最后生成：2026-05-14

## 优先阅读

修改代码前先阅读这些文件：

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`
3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`
5. `README.md`
6. `plugins/project-guardian/docs/CLI_AND_CI.md`
7. `plugins/project-guardian/docs/STANDARD.md`

## 如何运行

全局安装后的推荐 CLI 是 `guardian`。如果没有全局安装 package，则使用随项目提交路径 `node plugins/project-guardian/scripts/guardian.js <command>`。

```bash
# 检查 CLI 语法
node --check plugins/project-guardian/scripts/guardian.js

# 查看可用命令
guardian help

# 安装 AI 工具适配器并查看状态
guardian install-adapters --adapter cursor,copilot,windsurf,cline,continue,claude,gemini,vscode
guardian adapters doctor

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
| CLI | `plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/adapters.js` | 实现 init、update、handover、check、validation、query、hooks、CI、decisions、conflicts、verify、安全扫描、AI 工具适配器解析和 adapters doctor |
| 模板 | `plugins/project-guardian/assets/templates/*`、`plugins/project-guardian/assets/templates/zh-CN/*` | 在目标项目运行 `guardian init` 或 `guardian install-adapters` 时复制英文/中文记忆文件、AI 工具规则和 VS Code tasks |
| 文档 | `README.md`、`plugins/project-guardian/docs/*`、`零基础超简单入门.md` | 说明接入、工作流、规范、CLI、CI 和零基础使用方式 |
| 测试 | `package.json`、`tests/guardian.test.js` | 使用临时仓库运行语法检查和命令行为测试 |
| 记忆 | `memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md` | 本仓库的可持续上下文 |

## 核心流程

- 新项目接入：全局安装 CLI 或复制插件源码，运行 `guardian init`，按实际 IDE 运行 `guardian install-adapters --adapter cursor,copilot,windsurf,cline,continue,claude,gemini,vscode`，补齐记忆，运行 `guardian verify`，然后提交。
- 语言选择：中文是默认语言。英文项目应在第一次初始化时运行 `guardian init --language en`，之后保持配置稳定。
- 日常开发：阅读记忆，做最小安全变更，运行项目测试，运行 `guardian update`，补齐 changelog 字段，运行 `guardian verify`。
- 冲突处理：运行 `guardian conflicts`，解决代码和记忆冲突，保留双方有价值的历史，再重新运行 `guardian verify`。
- 交接：运行 `guardian update`，运行 `guardian handover`，审阅生成的交接指南，运行 `guardian verify`，然后推送。
- CI 接入：运行 `guardian install-ci`，审阅生成的 `.workflow/project-guardian.yml`，并按需通过配置调整分支或 Node 版本。

## 常见问题

| 问题 | 可能原因 | 处理方式 |
| --- | --- | --- |
| `validate-docs` 在 `init` 后失败 | 生成的记忆仍是模板 | 补齐真实项目上下文、状态、决策、变更日志和交接细节 |
| 提交前 `check` 失败 | 代码有变更，但没有对应记忆更新 | 运行 `guardian update "任务摘要"`，补齐新记录，并暂存记忆文件 |
| CI 中 hook 不执行 | Git hooks 只在本地运行 | 使用 `guardian install-ci` 生成 Gitee Go 流水线，或手动加入等价 CI 命令 |
| Query 回答不完整 | 当前 query 是关键词检索 | 使用文件名或业务关键词提问，然后查看列出的来源路径 |
| 英文 init 生成中文 AI 规则 | 旧版语言处理没有把 init 参数传给适配器生成 | 使用当前 CLI，并运行覆盖 `guardian init --language en` 的回归测试 |

## 风险区域

- 修改 `guardian.js` 会影响所有命令，发布前要在临时仓库中测试命令行为。
- 校验规则应该阻止空模板，但不能强迫团队写过量文档。
- 安全扫描必须隐藏敏感值，并允许通过 `.guardianignore` 对无害示例做排除。
- Gitee 工作流生成必须保持可配置，因为组织之间的分支名和流水线语法可能不同。

## 新人第一天

1. 阅读项目记忆和根目录 README。
2. 运行 `guardian doctor`。
3. 运行 `node --check plugins/project-guardian/scripts/guardian.js`。
4. 运行 `npm.cmd test`。
5. 从 `memory/STATE.md` 里挑一个小问题开始。
6. 完成变更后更新项目记忆，并运行 `guardian verify`。
