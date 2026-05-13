# Project Guardian 接入文档

本文档说明如何把 Project Guardian 接入新项目、已有项目和已经上传到 Gitee 的项目。

## 1. 接入后的项目结构

接入完成后，目标项目根目录应该包含：

```text
PROJECT_CONTEXT.md
STATE.md
DECISIONS.md
docs/
  AI_CHANGELOG.md
  HANDOVER.md
AGENTS.md
.cursorrules
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

1. 创建 `PROJECT_CONTEXT.md`。
2. 创建 `STATE.md`。
3. 创建 `DECISIONS.md`。
4. 创建 `docs/AI_CHANGELOG.md`、`docs/HANDOVER.md`、`AGENTS.md`、`.cursorrules`。

如果项目有 `package.json`，还会自动加入 `guardian:*` npm scripts。

重要说明：

- 必须在项目根目录运行。
- 已存在的同名文件不会被覆盖。
- `init` 只创建模板，不会自动补齐业务内容。
- 初始化后必须补齐项目背景、运行方式、当前状态和关键决策。

## 3. 新项目接入步骤

### 3.1 放入插件

把插件目录放到项目：

```text
your-project/plugins/project-guardian/
```

### 3.2 进入项目根目录

```bash
cd your-project
```

### 3.3 运行初始化

Windows PowerShell：

```powershell
node .\plugins\project-guardian\scripts\guardian.js init
```

macOS 或 Linux：

```bash
node ./plugins/project-guardian/scripts/guardian.js init
```

### 3.4 运行体检

```bash
node plugins/project-guardian/scripts/guardian.js doctor
```

看到 `Core memory files: ok` 表示核心记忆文件齐全。

### 3.5 补齐第一版项目记忆

推荐让 AI 先读代码后补齐：

```text
请阅读当前项目代码，不要修改业务代码。请按照 Project Guardian 标准补齐 PROJECT_CONTEXT.md、STATE.md 和 DECISIONS.md，重点写清楚项目目标、技术栈、运行方式、核心业务流程、当前状态、已知问题和风险区域。
```

然后由项目负责人复核。

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

- `PROJECT_CONTEXT.md`
- `STATE.md`
- `DECISIONS.md`

然后生成交接文档：

```bash
node plugins/project-guardian/scripts/guardian.js handover
```

### 4.5 提交并推送到 Gitee

```bash
git add .
node plugins/project-guardian/scripts/guardian.js check
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

## 7. 接入验收标准

接入完成必须满足：

- `doctor` 通过。
- `PROJECT_CONTEXT.md` 写清楚项目目标、技术栈、运行方式、核心流程。
- `STATE.md` 写清楚当前状态、下一步、已知问题。
- `DECISIONS.md` 写清楚关键决策，或明确“暂无关键决策”。
- `docs/HANDOVER.md` 能让新人独立启动项目。
- `check` 能在代码变更但记忆未更新时失败。

## 8. 接入完成后的第一条团队规则

从接入完成的下一次提交开始，所有 AI 辅助代码变更都必须同时更新项目记忆。

最低要求：

```bash
node plugins/project-guardian/scripts/guardian.js update "本次任务说明"
git add STATE.md docs/AI_CHANGELOG.md
```
