# Project Guardian

Project Guardian 是一个面向 AI 辅助编程团队的项目记忆插件。它把项目背景、当前状态、技术决策、AI 修改过程和交接说明固定在代码仓库里，避免上下文只留在某个实习生的聊天窗口中。

这个插件适合小项目多、人员流动快、开发者大量依赖 AI IDE 的团队。它的原则是：新人和 AI 在改代码前先读项目记忆，改完代码后必须更新项目记忆。

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
  assets/icon.svg
  assets/templates/
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
- `docs/CLI_AND_CI.md`：命令行、Git Hook 和 Gitee CI 操作说明。
- `docs/INTEGRATION.md`：如何把插件接入新项目或已有项目。
- `docs/STANDARD.md`：团队使用规范、目录标准和记录标准。

## 推荐阅读顺序

第一次使用请按顺序阅读：

1. [接入文档](plugins/project-guardian/docs/INTEGRATION.md)
2. [工作流文档](plugins/project-guardian/docs/WORKFLOW.md)
3. [规范文档](plugins/project-guardian/docs/STANDARD.md)
4. [CI 与命令行操作文档](plugins/project-guardian/docs/CLI_AND_CI.md)

## 一句话工作循环

新项目先 `init` 建立记忆文件；每天开发前读 `STATE.md`；AI 改完代码后运行 `update`；提交前运行 `check`；换人或阶段结束运行 `handover`；新人接手先读 `HANDOVER.md`，再用 `query` 多轮提问。

## 快速使用

在目标项目根目录运行：

```bash
node plugins/project-guardian/scripts/guardian.js init
```

如果插件放在项目外部，使用插件实际路径：

```bash
node path/to/project-guardian/scripts/guardian.js init
```

初始化后会生成：

```text
PROJECT_CONTEXT.md
STATE.md
DECISIONS.md
docs/AI_CHANGELOG.md
docs/HANDOVER.md
AGENTS.md
.cursorrules
```

## 常用命令

```bash
# 检查项目是否已经正确接入
node plugins/project-guardian/scripts/guardian.js doctor

# 记录一次 AI 辅助开发
node plugins/project-guardian/scripts/guardian.js update "修复登录验证码校验失败"

# 生成或刷新新人交接文档
node plugins/project-guardian/scripts/guardian.js handover

# 提交前检查代码变更是否包含记忆更新
node plugins/project-guardian/scripts/guardian.js check

# 一次运行全部质量检查
node plugins/project-guardian/scripts/guardian.js verify

# 记录一条结构化决策
node plugins/project-guardian/scripts/guardian.js decision add --title "采用配置文件" --context "需要跨项目适配" --decision "使用 project-guardian.config.json"

# 查看 Git 冲突，尤其是记忆文件冲突
node plugins/project-guardian/scripts/guardian.js conflicts

# 进入多轮项目知识查询
node plugins/project-guardian/scripts/guardian.js query

# 安装 pre-commit hook
node plugins/project-guardian/scripts/guardian.js install-hooks
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
node plugins/project-guardian/scripts/guardian.js verify
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
node plugins/project-guardian/scripts/guardian.js query
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
2. 开发者先填写 `PROJECT_CONTEXT.md` 和 `STATE.md` 的基础内容。
3. 每次 AI 辅助改代码后运行 `update`，补全 TODO 字段。
4. 每次提交前运行 `verify`，或安装 `install-hooks` 自动检查。
5. 换人、离职、暂停超过一周或版本交付前运行 `handover`。
6. 新人接手时先读 `docs/HANDOVER.md`，再用 `query` 连续提问。

## 新增质量检查命令

```bash
# 检查记忆文档是否还有过多 TODO 或空字段
node plugins/project-guardian/scripts/guardian.js validate-docs

# 扫描记忆文件中的疑似密钥
node plugins/project-guardian/scripts/guardian.js scan-secrets

# 一次运行全部质量检查
node plugins/project-guardian/scripts/guardian.js verify

# 安装 Gitee Go 流水线模板
node plugins/project-guardian/scripts/guardian.js install-ci
```

推荐提交前至少运行：

```bash
node plugins/project-guardian/scripts/guardian.js verify
```
