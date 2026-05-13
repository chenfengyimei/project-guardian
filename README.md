# Project Guardian

Project Guardian 是一个面向 AI 辅助编程团队的项目记忆插件。它把项目背景、当前状态、技术决策、AI 修改过程和交接说明固定在代码仓库里，避免上下文只留在某个实习生的聊天窗口中。

这个插件适合小项目多、人员流动快、开发者大量依赖 AI IDE 的团队。它的原则是：新人和 AI 在改代码前先读项目记忆，改完代码后必须更新项目记忆。

## 插件包含什么

```text
project-guardian/
  .codex-plugin/plugin.json
  skills/project-guardian/SKILL.md
  scripts/guardian.js
  assets/templates/
  docs/INTEGRATION.md
  docs/STANDARD.md
  README.md
```

- `plugin.json`：Codex 插件元信息。
- `SKILL.md`：Codex 使用本插件时遵守的项目记忆规则。
- `guardian.js`：本地 CLI，负责初始化、更新、交接、检查和查询。
- `assets/templates/`：标准记忆文件模板。
- `docs/INTEGRATION.md`：如何把插件接入新项目或已有项目。
- `docs/STANDARD.md`：团队使用规范、目录标准和记录标准。

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
4. 每次提交前运行 `check`，或安装 `install-hooks` 自动检查。
5. 换人、离职、暂停超过一周或版本交付前运行 `handover`。
6. 新人接手时先读 `docs/HANDOVER.md`，再用 `query` 连续提问。

## 更多文档

- 接入指南：[docs/INTEGRATION.md](plugins/docs/INTEGRATION.md)
- 使用规范：[docs/STANDARD.md](plugins/docs/STANDARD.md)
