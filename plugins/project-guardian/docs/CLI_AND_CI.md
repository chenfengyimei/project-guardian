# Project Guardian CI 与命令行操作文档

本文档专门说明 Project Guardian 的命令行操作、本地检查、Git Hook、Gitee Go CI 接入和常见问题。

## 1. 命令总览

所有命令都在目标项目根目录运行。

```bash
node plugins/project-guardian/scripts/guardian.js init
node plugins/project-guardian/scripts/guardian.js doctor
node plugins/project-guardian/scripts/guardian.js update "任务说明"
node plugins/project-guardian/scripts/guardian.js handover
node plugins/project-guardian/scripts/guardian.js check
node plugins/project-guardian/scripts/guardian.js validate-docs
node plugins/project-guardian/scripts/guardian.js query
node plugins/project-guardian/scripts/guardian.js install-hooks
node plugins/project-guardian/scripts/guardian.js install-ci
```

如果项目通过 `init` 写入了 npm scripts，也可以使用：

```bash
npm run guardian:doctor
npm run guardian:update -- "任务说明"
npm run guardian:handover
npm run guardian:check
npm run guardian:validate-docs
npm run guardian:query
npm run guardian:install-ci
```

## 2. 初始化命令

```bash
node plugins/project-guardian/scripts/guardian.js init
```

作用：

- 创建标准项目记忆文件。
- 创建 `AGENTS.md` 和 `.cursorrules`。
- 如果存在 `package.json`，自动加入 `guardian:*` scripts。
- 不覆盖已有同名文件。

运行后建议立即执行：

```bash
node plugins/project-guardian/scripts/guardian.js doctor
```

## 3. 体检命令

```bash
node plugins/project-guardian/scripts/guardian.js doctor
```

作用：

- 检查核心记忆文件是否存在。
- 检查 AI 规则文件是否存在。
- 显示 staged、working、untracked 文件数量。
- 判断项目是否是 Git 仓库。

适合在接入后、新人接手后、提交前快速确认状态。

## 4. 更新记忆命令

```bash
node plugins/project-guardian/scripts/guardian.js update "实现登录验证码"
```

作用：

- 向 `docs/AI_CHANGELOG.md` 追加本次 AI 辅助开发记录。
- 更新 `STATE.md` 的 `Latest AI-Assisted Change`。
- 自动读取 staged、working tree、untracked 文件列表。
- 自动写入 `git diff --stat` 摘要。

运行后必须人工补全 `TODO` 字段，尤其是：

- `AI summary`
- `Business reason`
- `Verification`
- `Risks`
- `Next step`

## 5. 交接命令

```bash
node plugins/project-guardian/scripts/guardian.js handover
```

作用：

- 生成或刷新 `docs/HANDOVER.md`。
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
git add STATE.md docs/AI_CHANGELOG.md
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
node plugins/project-guardian/scripts/guardian.js check
node plugins/project-guardian/scripts/guardian.js validate-docs
```

## 8. 多轮知识查询

```bash
node plugins/project-guardian/scripts/guardian.js query
```

作用：

- 优先检索标准记忆文件。
- 检索 AI 规则文件。
- 检索项目源码和 Markdown/YAML 文件。
- 检索最近 80 条 Git 提交历史。

示例：

```text
guardian> 这个项目现在做到哪了？
guardian> 登录模块入口在哪里？
guardian> 最近为什么改了验证码？
guardian> 哪些地方风险最高？
guardian> exit
```

注意：当前 `query` 是本地轻量关键词检索，不依赖外部模型 API。复杂语义问答后续可以升级为向量检索或 RAG。

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
```

## 11. 推荐提交流程

普通开发：

```bash
node plugins/project-guardian/scripts/guardian.js update "任务说明"
git add .
node plugins/project-guardian/scripts/guardian.js check
node plugins/project-guardian/scripts/guardian.js validate-docs
git commit -m "feat: describe change"
git push
```

交接前：

```bash
node plugins/project-guardian/scripts/guardian.js update "阶段交接前整理"
node plugins/project-guardian/scripts/guardian.js handover
git add .
node plugins/project-guardian/scripts/guardian.js check
node plugins/project-guardian/scripts/guardian.js validate-docs
git commit -m "docs: update project handover"
git push
```

第一次启用 CI：

```bash
node plugins/project-guardian/scripts/guardian.js install-ci
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
git add STATE.md docs/AI_CHANGELOG.md
```

### validate-docs 失败

原因：记忆文件仍有过多模板内容，或缺少关键章节。

处理：

- 补齐 `PROJECT_CONTEXT.md` 的项目目标、技术栈、运行方式。
- 补齐 `STATE.md` 的当前状态、下一步、风险。
- 补齐 `DECISIONS.md` 的关键决策，或明确暂无关键决策。
- 补齐 `docs/HANDOVER.md` 的运行方式和新人接手步骤。

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
