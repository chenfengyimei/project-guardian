# Project Guardian 接入文档

本文档说明如何把 Project Guardian 接入新项目、已有项目和已经上传到 Gitee 的项目。

## 1. 接入后的项目结构

接入完成后，目标项目根目录应该包含：

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

当使用 `guardian decision add` 后，还会自动创建可选目录：

```text
memory/decisions/
```

如果选择把插件源码也放进项目，推荐结构是：

```text
plugins/
  project-guardian/
    .codex-plugin/
    skills/
    scripts/
    assets/
    docs/
```

## 2. init 初始化是什么

`init` 是 Project Guardian 的初始化命令，用来在项目根目录创建标准项目记忆文件。

命令：

```bash
node plugins/project-guardian/scripts/guardian.js init
```

它会做四件事：

1. 创建 `memory/PROJECT_CONTEXT.md`。
2. 创建 `memory/STATE.md`。
3. 创建 `memory/DECISIONS.md`。
4. 创建 `memory/AI_CHANGELOG.md`、`memory/HANDOVER.md`、`AGENTS.md`、`.cursorrules` 和默认 Cursor 规则。
5. 如果没有配置文件，创建 `project-guardian.config.json`。

如果项目有 `package.json`，还会自动加入 `guardian:*` npm scripts。
默认配置会保留标准记忆文件路径，语言为 `zh-CN`，hook 会运行文档质量检查，CI 默认分支为 `master`，Node 版本为 `18`，安全扫描默认开启。

重要说明：

- 必须在项目根目录运行。
- 已存在的同名文件不会被覆盖。
- `init` 只创建模板，不会自动补齐业务内容。
- 初始化后必须补齐项目背景、运行方式、当前状态和关键决策。
- 默认生成中文模板；如果团队要用英文模板，请第一次初始化时运行 `guardian init --language en`。
- 需要 Cursor、Copilot、Windsurf、Cline、Continue、Claude Code、Gemini CLI 或 VS Code 规则时，可以运行 `guardian install-adapters --adapter cursor,copilot,windsurf,cline,continue,claude,gemini,vscode`；需要一次生成全部规则时使用 `guardian init --adapter all`。
- 新项目第一次使用 `guardian init --adapter ...` 时，所选适配器会写入 `project-guardian.config.json`，避免后续 `doctor` 按默认适配器误报。

## 3. 新项目接入步骤

### 3.0 环境要求

- Node.js 18 或更新版本。
- Git。正式项目建议先 `git init` 或使用已有代码仓库；`check`、`update`、`verify`、hooks 和 CI 都依赖 Git 状态。
- npm。只有全局安装 CLI、运行测试或发布包时需要；业务项目本身不必须是 Node 项目。
- 不需要数据库、后端服务、OpenAI API Key 或向量库。当前版本的 `query` 是本地关键词检索；MCP 已提供 stdio 工具入口，RAG/向量检索仍属于后续增强。

### 3.1 放入插件

把插件目录放到项目：

```text
your-project/plugins/project-guardian/
```

如果 Project Guardian 已经发布成 npm 包，或者公司允许从 Gitee 工具仓库安装，可以不复制插件源码，直接全局安装 CLI：

```bash
npm install -g project-guardian
# 或
npm install -g git+https://gitee.com/chenfengloveyuri/project-guardian.git

guardian --version
```

全局安装适合多项目共用一份工具；把插件源码放进 `plugins/project-guardian/` 适合希望每个项目都固定同一版本、离线也能运行的团队。

### 3.2 进入项目根目录

```bash
cd your-project
```

### 3.3 运行初始化

Windows PowerShell：

```powershell
node .\plugins\project-guardian\scripts\guardian.js init
```

如果已经全局安装 CLI，可以直接运行：

```powershell
guardian init
```

如果项目规范要求英文记忆文件，第一次初始化时使用：

```powershell
guardian init --language en
```

macOS 或 Linux：

```bash
node ./plugins/project-guardian/scripts/guardian.js init
```

如果已经全局安装 CLI，可以直接运行：

```bash
guardian init
```

中文团队不用额外传参；默认就是 `zh-CN`。不要在同一个项目里反复切换语言，否则 `update`、`handover` 和 `decision add` 生成的记录会中英混杂。

### 3.4 AI IDE 适配方式

Project Guardian 的最稳定调用方式是 CLI：任何能打开终端并运行 Node.js 的 IDE 都能执行 `guardian init`、`guardian update`、`guardian verify` 和 `guardian query`。支持 MCP 的 AI IDE 还可以通过 `guardian mcp` 直接调用 Project Guardian 工具。

规则文件适配器用于让不同 AI IDE 在回答或修改代码前自动读取项目记忆：

| 适配器 | 面向工具 | 生成文件 |
| --- | --- | --- |
| `generic` | 通用 AI Agent | `AGENTS.md` |
| `mcp` | 支持 MCP 的 AI IDE | 不生成规则文件，运行 `guardian mcp` |
| `codex` | OpenAI Codex | `AGENTS.md` |
| `cursor` | Cursor | `.cursor/rules/project-guardian.mdc`、`.cursorrules` |
| `copilot` | GitHub Copilot | `.github/copilot-instructions.md`、`.github/instructions/project-guardian.instructions.md` |
| `vscode` / `vscode-copilot` | VS Code + Copilot | Copilot instructions、`.vscode/tasks.json` |
| `windsurf` | Windsurf | `AGENTS.md`、`.windsurf/rules/project-guardian.md` |
| `cline` | Cline | `.clinerules/project-guardian.md` |
| `continue` | Continue | `.continue/rules/project-guardian.md` |
| `claude` | Claude Code | `CLAUDE.md` |
| `gemini` | Gemini CLI | `GEMINI.md` |

安装更多适配器：

```bash
guardian install-adapters --adapter cursor,copilot,windsurf,cline,continue,claude,gemini,vscode
guardian adapters doctor
```

不建议默认生成所有 IDE 文件，否则小项目根目录会被太多工具配置占满。团队应按实际使用的 IDE 安装适配器。

VS Code tasks 默认调用 `guardian`，所以在 VS Code 里运行任务前要先确认终端能执行 `guardian --version`。如果你的团队没有全局安装 CLI，而是把插件源码复制到项目内，请使用终端里的本地脚本路径，或把 `.vscode/tasks.json` 中的命令改成 `node plugins/project-guardian/scripts/guardian.js ...`。

### 3.5 MCP 接入方式

如果你的 AI IDE 支持 MCP，可以优先接入 `guardian mcp`。它会暴露查询、更新、决策、验证、密钥扫描、交接和适配器体检工具。

全局 CLI：

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

项目内源码：

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

第一次接入后，先让 AI 调用 `guardian_doctor` 或 `guardian_query`，确认 MCP server 已经能读取当前项目。

### 3.6 运行体检

```bash
node plugins/project-guardian/scripts/guardian.js doctor
```

看到 `Core memory files: ok` 表示核心记忆文件齐全。

### 3.7 补齐第一版项目记忆

推荐让 AI 先读代码后补齐：

```text
请阅读当前项目代码，不要修改业务代码。请按照 Project Guardian 标准补齐 memory/PROJECT_CONTEXT.md、memory/STATE.md 和 memory/DECISIONS.md，重点写清楚项目目标、技术栈、运行方式、核心业务流程、当前状态、已知问题和风险区域。
```

然后由项目负责人复核。

补齐内容后继续运行：

```bash
node plugins/project-guardian/scripts/guardian.js verify
```

`verify` 通过后再提交到 Gitee。

## 4. 已上传到 Gitee 的项目如何接入

如果源码已经在 Gitee，推荐流程如下。

### 4.1 拉取项目

```bash
git clone <Gitee 仓库地址>
cd <项目目录>
```

### 4.2 创建接入分支

```bash
git checkout -b docs/project-guardian
```

### 4.3 放入插件并初始化

把 `project-guardian` 放到：

```text
plugins/project-guardian/
```

然后运行：

```bash
node plugins/project-guardian/scripts/guardian.js init
node plugins/project-guardian/scripts/guardian.js doctor
```

### 4.4 补齐记忆文件

至少补齐：

- `memory/PROJECT_CONTEXT.md`
- `memory/STATE.md`
- `memory/DECISIONS.md`

然后生成交接文档：

```bash
node plugins/project-guardian/scripts/guardian.js handover
```

### 4.5 提交并推送到 Gitee

```bash
git add .
node plugins/project-guardian/scripts/guardian.js verify
git commit -m "docs: add project guardian memory"
git push -u origin docs/project-guardian
```

然后在 Gitee 上发起 Pull Request 或合并请求。

## 5. 已有项目接入注意事项

已有项目不要一次性让 AI 重写所有文档。

推荐分三轮：

1. 第一轮只补项目事实：技术栈、运行命令、目录结构。
2. 第二轮补业务流程：核心功能、数据流、接口依赖。
3. 第三轮补历史原因：已知坑点、重要决策、风险区域。

每轮补完都提交一次，避免一次性大改文档没人敢审。

## 6. Git Hook 接入

安装提交前检查：

```bash
node plugins/project-guardian/scripts/guardian.js install-hooks
```

作用：

- 如果 staged 代码变更没有对应 staged 记忆文件变更，提交会失败。
- 如果已有 pre-commit hook，插件会追加检查块，不会覆盖原内容。

团队也可以先不安装 hook，只要求提交前手动运行：

```bash
node plugins/project-guardian/scripts/guardian.js check
```

更推荐统一运行：

```bash
node plugins/project-guardian/scripts/guardian.js verify
```

## 7. 接入验收标准

接入完成必须满足：

- `doctor` 通过。
- `memory/PROJECT_CONTEXT.md` 写清楚项目目标、技术栈、运行方式、核心流程。
- `memory/STATE.md` 写清楚当前状态、下一步、已知问题。
- `memory/DECISIONS.md` 写清楚关键决策，或明确“暂无关键决策”。
- `memory/HANDOVER.md` 能让新人独立启动项目。
- `check` 能在代码变更但记忆未更新时失败。

## 8. 接入完成后的第一条团队规则

从接入完成的下一次提交开始，所有 AI 辅助代码变更都必须同时更新项目记忆。

最低要求：

```bash
node plugins/project-guardian/scripts/guardian.js update "本次任务说明"
git add memory/STATE.md memory/AI_CHANGELOG.md
```

## 9. 文档质量检查

接入完成后建议运行：

```bash
node plugins/project-guardian/scripts/guardian.js validate-docs
```

它会检查标准记忆文件是否缺少关键章节，以及是否还保留了过多 `TODO`、空字段、空表格行。新项目刚 `init` 后通常会失败，这是正常的，说明还没有填充真实项目记忆。

## 10. Gitee Go 流水线接入

如果希望 Gitee 自动检查项目记忆，运行：

```bash
node plugins/project-guardian/scripts/guardian.js install-ci
```

该命令会创建：

```text
.workflow/project-guardian.yml
```

流水线会执行：

```bash
node plugins/project-guardian/scripts/guardian.js check
node plugins/project-guardian/scripts/guardian.js validate-docs
node plugins/project-guardian/scripts/guardian.js scan-secrets
```

启用前请在 Gitee Go 中确认分支触发规则是否符合团队流程。

更完整的命令行、Git Hook 和 CI 操作说明见 `plugins/project-guardian/docs/CLI_AND_CI.md`。

## 11. 配置 AI 工具适配器

默认配置会生成通用规则和 Cursor 规则：

```json
{
  "adapters": ["generic", "cursor"]
}
```

可选值：

- `generic` 或 `codex`：生成 `AGENTS.md`。
- `cursor`：生成 `.cursor/rules/project-guardian.mdc` 和 `.cursorrules`。
- `copilot`：生成 `.github/copilot-instructions.md` 和 `.github/instructions/project-guardian.instructions.md`。
- `all`：一次生成所有适配规则。

已有项目想补装 Copilot 规则时，不需要重新初始化核心记忆，直接运行：

```bash
guardian install-adapters --adapter copilot
```

该命令不会覆盖已有同名文件，因此团队已经手工调整过的 AI 规则会被保留。
