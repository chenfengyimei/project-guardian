# Project Guardian

Project Guardian 是一个专为 AI 辅助编程团队设计的项目记忆插件，它通过将项目背景、技术决策、开发状态和交接文档固化到代码仓库里的 Markdown 记忆文件中，来解决 AI 协作中 “上下文只留在一个人聊天窗口里” 的团队知识流失痛点。

这个插件适合小项目多、人员流动快、开发者大量依赖 AI IDE 的团队。

已完成最新的文档更新，流程优化，超级小白也能使用也能看懂！

## 适用场景

- 项目已经上传到 Gitee、GitHub、GitLab 等代码平台。
- 团队有较多实习生或流动开发者。
- 代码大量由 AI 生成，但历史对话和修改原因容易丢失。
- 希望形成“开发、记录、提交、交接、接手”的固定工作循环。

## 插件包含什么

```text
project-guardian/
  .codex-plugin/plugin.json
  skills/project-guardian/SKILL.md
  scripts/guardian.js
  scripts/lib/adapters.js
  assets/icon.svg
  assets/templates/
    PROJECT_CONTEXT.md
    STATE.md
    DECISIONS.md
    AI_CHANGELOG.md
    HANDOVER.md
    AGENTS.md
    cursor-rules.mdc
    copilot-instructions.md
    copilot-project-guardian.instructions.md
    windsurf-rule.md
    cline-rule.md
    continue-rule.md
    CLAUDE.md
    GEMINI.md
    vscode-tasks.json
    zh-CN/
      PROJECT_CONTEXT.md
      STATE.md
      DECISIONS.md
      AI_CHANGELOG.md
      HANDOVER.md
      AGENTS.md
      windsurf-rule.md
      cline-rule.md
      continue-rule.md
      CLAUDE.md
      GEMINI.md
      vscode-tasks.json
  docs/CLI_AND_CI.md
  docs/INTEGRATION.md
  docs/STANDARD.md
  docs/WORKFLOW.md
```

- `SKILL.md`：Codex 使用本插件时遵守的项目记忆规则。
- `guardian.js`：本地 CLI，负责初始化、更新、交接、检查和查询。
- `.codex-plugin/plugin.json`：Codex 本地插件入口元数据，必须进入仓库。
- `assets/icon.svg`：插件图标资源。
- `assets/templates/`：标准记忆文件模板。
- `assets/templates/zh-CN/`：中文记忆文件和 AI 工具规则模板，默认初始化使用这一套。
- `docs/CLI_AND_CI.md`：命令行、Git Hook 和 Gitee CI 操作说明。
- `docs/INTEGRATION.md`：如何把插件接入新项目或已有项目。
- `docs/STANDARD.md`：团队使用规范、目录标准和记录标准。

## 推荐阅读顺序

你是一个没有编程基础的小白？也没问题！

1.[小白零基础傻瓜式使用教程](零基础超简单入门.md)

第一次使用请按顺序阅读：

1. [接入文档](plugins/project-guardian/docs/INTEGRATION.md)
2. [工作流文档](plugins/project-guardian/docs/WORKFLOW.md)
3. [规范文档](plugins/project-guardian/docs/STANDARD.md)
4. [CI 与命令行操作文档](plugins/project-guardian/docs/CLI_AND_CI.md)

## 一句话工作循环

新项目先 `init` 建立记忆文件；每天开发前读 `memory/STATE.md`；AI 改完代码后运行 `update`；提交前运行 `check`；换人或阶段结束运行 `handover`；新人接手先读 `memory/HANDOVER.md`，再用 `query` 多轮提问。

## 快速使用

### 环境要求

- Node.js 18 或更新版本。
- Git。`check`、`update`、`verify`、hooks 和 CI 会读取 Git 状态；纯初始化可以在非 Git 目录运行，但正式项目建议放在 Git 仓库里。
- npm 只在全局安装、运行测试或发布包时需要。目标业务项目不强制使用 npm。
- 不需要数据库、后端服务、OpenAI API Key 或向量库；当前查询是本地关键词检索，不是 RAG。

推荐先把 CLI 安装成全局命令，这样任何项目里都可以直接运行 `guardian`：

```bash
# 从 npm 包安装时
npm install -g project-guardian

# 从当前 Gitee 仓库安装
npm install -g git+https://gitee.com/chenfengloveyuri/project-guardian.git

guardian init
guardian verify
```

默认 `guardian init` 会生成中文模板，适合中文团队直接使用。如果项目团队主要写英文文档，可以这样初始化：

```bash
guardian init --language en
```

如果还没有发布 npm 包，或者团队选择把插件源码随项目提交，也可以继续使用脚本路径。

在目标项目根目录运行：

```bash
node plugins/project-guardian/scripts/guardian.js init
```

脚本路径同样支持语言选择：

```bash
node plugins/project-guardian/scripts/guardian.js init --language zh-CN
node plugins/project-guardian/scripts/guardian.js init --language en
```

如果插件放在项目外部，使用插件实际路径：

```bash
node path/to/project-guardian/scripts/guardian.js init
```

初始化后会生成：

```text
memory/PROJECT_CONTEXT.md
memory/STATE.md
memory/DECISIONS.md
memory/AI_CHANGELOG.md
memory/HANDOVER.md
AGENTS.md
.cursorrules
.cursor/rules/project-guardian.mdc
```

如果需要一次生成所有 AI 工具适配规则：

```bash
guardian init --adapter all
guardian install-adapters --adapter cursor,copilot,windsurf,cline,continue,claude,gemini,vscode
guardian adapters doctor
```

适配层只生成规则文件，不改变核心记忆文件。已有同名规则文件会被保留，不会被覆盖。

如果项目里有 `package.json`，`guardian init` 会补充 `guardian:*` scripts。用全局 CLI 初始化的项目会写入 `guardian verify` 这类可移植命令；如果插件源码就放在项目内，则会写入本地 `node plugins/project-guardian/scripts/guardian.js ...` 路径。

## AI IDE 支持矩阵

| 工具 | 当前支持方式 | 生成文件 | 使用建议 |
| --- | --- | --- | --- |
| 任意 IDE 终端 | CLI | 无额外文件 | 只要能运行 Node.js，就能运行 `guardian init/update/verify/query` |
| Codex | 插件元数据 + AGENTS | `.codex-plugin/plugin.json`、`AGENTS.md`、`SKILL.md` | 当前支持度最高 |
| Cursor | Project Rules | `.cursor/rules/project-guardian.mdc`、`.cursorrules` | 推荐安装 `cursor` 适配器 |
| VS Code | Tasks + Copilot instructions | `.vscode/tasks.json`、`.github/copilot-instructions.md`、`.github/instructions/project-guardian.instructions.md` | 使用 `vscode` 或 `vscode-copilot` 适配器 |
| GitHub Copilot | Repository instructions | `.github/copilot-instructions.md`、`.github/instructions/project-guardian.instructions.md` | 适用于 VS Code Copilot 和 GitHub 侧 Copilot 场景 |
| Windsurf | AGENTS + workspace rule | `AGENTS.md`、`.windsurf/rules/project-guardian.md` | 使用 `windsurf` 适配器 |
| Cline | Project rules | `.clinerules/project-guardian.md` | 使用 `cline` 适配器 |
| Continue | Repository rules | `.continue/rules/project-guardian.md` | 使用 `continue` 适配器 |
| Claude Code | Project memory file | `CLAUDE.md` | 使用 `claude` 适配器 |
| Gemini CLI | Project context file | `GEMINI.md` | 使用 `gemini` 适配器 |
| Roo Code | 不优先支持 | 无 | 暂不内置专用适配；如团队仍使用，可先走 CLI 或 generic 规则 |

检查当前项目适配状态：

```bash
guardian adapters doctor
```

VS Code tasks 默认调用 `guardian` 命令，因此使用前要保证 CLI 已全局安装，或项目已把 Project Guardian 作为依赖安装到可执行路径中。如果团队选择把插件源码直接复制进项目，也可以继续在终端使用 `node plugins/project-guardian/scripts/guardian.js ...`。

## 常用命令

```bash
# 检查项目是否已经正确接入
guardian doctor

# 记录一次 AI 辅助开发
guardian update "修复登录验证码校验失败"

# 生成或刷新新人交接文档
guardian handover

# 提交前检查代码变更是否包含记忆更新
guardian check

# 一次运行全部质量检查
guardian verify

# 记录一条结构化决策
guardian decision add --title "采用配置文件" --context "需要跨项目适配" --decision "使用 project-guardian.config.json"

# 查看 Git 冲突，尤其是记忆文件冲突
guardian conflicts

# 进入多轮项目知识查询
guardian query

# 安装 pre-commit hook
guardian install-hooks
```

如果目标项目有 `package.json`，`init` 会自动补充这些 npm scripts：

```bash
npm run guardian:doctor
npm run guardian:update -- "任务说明"
npm run guardian:handover
npm run guardian:check
npm run guardian:query
```

## 统一质量入口

当前版本推荐提交前优先运行：

```bash
guardian verify
```

`verify` 会按顺序运行：

```text
doctor
check
validate-docs
scan-secrets
```

如果团队安装了 `install-hooks`，默认 pre-commit hook 也会运行 `check`、`validate-docs` 和安全扫描。Gitee Go 模板推荐运行同一套检查，避免本地能过、远端遗漏。

## 多轮知识查询

运行：

```bash
guardian query
```

示例问题：

```text
guardian> 登录逻辑在哪里？
guardian> 之前为什么要这样处理跨域？
guardian> 这个项目下一步应该做什么？
guardian> 哪些地方风险最高？
guardian> exit
```

查询会优先检索标准记忆文件，再检索常见源码文件。它是本地轻量查询，不依赖外部模型 API；在 Codex 中使用时，`SKILL.md` 会让 AI 先读记忆文件再回答。

## 推荐工作流

1. 新项目创建后立刻运行 `init`。
2. 开发者先填写 `memory/PROJECT_CONTEXT.md` 和 `memory/STATE.md` 的基础内容。
3. 每次 AI 辅助改代码后运行 `update`，补全 TODO 字段。
4. 每次提交前运行 `verify`，或安装 `install-hooks` 自动检查。
5. 换人、离职、暂停超过一周或版本交付前运行 `handover`。
6. 新人接手时先读 `memory/HANDOVER.md`，再用 `query` 连续提问。

## 新增质量检查命令

```bash
# 检查记忆文档是否还有过多 TODO 或空字段
guardian validate-docs

# 扫描记忆文件中的疑似密钥
guardian scan-secrets

# 一次运行全部质量检查
guardian verify

# 安装 Gitee Go 流水线模板
guardian install-ci
```

推荐提交前至少运行：

```bash
guardian verify
```
