# Project Guardian 接入文档

本文档说明如何把 Project Guardian 接入新项目、已有项目和团队模板。

## 1. 接入目标

接入后，每个项目都应该拥有：

```text
PROJECT_CONTEXT.md
STATE.md
DECISIONS.md
docs/AI_CHANGELOG.md
docs/HANDOVER.md
AGENTS.md
.cursorrules
```

这些文件共同构成项目记忆。AI 和新人应该先读取这些文件，再理解或修改代码。

## 2. 新项目接入

推荐把插件放在项目内：

```text
your-project/
  plugins/project-guardian/
```

然后在项目根目录运行：

```bash
node plugins/project-guardian/scripts/guardian.js init
node plugins/project-guardian/scripts/guardian.js doctor
```

接着填写：

- `PROJECT_CONTEXT.md`：项目目标、业务流程、技术栈、运行方式。
- `STATE.md`：当前完成情况、下一步、已知问题。
- `DECISIONS.md`：已经确定的重要技术或业务决策。

如果项目使用 npm，`init` 会自动写入：

```json
{
  "scripts": {
    "guardian:init": "node \"plugins/project-guardian/scripts/guardian.js\" init",
    "guardian:update": "node \"plugins/project-guardian/scripts/guardian.js\" update",
    "guardian:handover": "node \"plugins/project-guardian/scripts/guardian.js\" handover",
    "guardian:check": "node \"plugins/project-guardian/scripts/guardian.js\" check",
    "guardian:doctor": "node \"plugins/project-guardian/scripts/guardian.js\" doctor",
    "guardian:query": "node \"plugins/project-guardian/scripts/guardian.js\" query"
  }
}
```

## 3. 已有项目接入

已有项目不要一次性让 AI 重写所有文档，按以下步骤接入：

1. 复制插件到项目：

   ```text
   your-project/plugins/project-guardian/
   ```

2. 运行初始化：

   ```bash
   node plugins/project-guardian/scripts/guardian.js init
   ```

   `init` 不会覆盖已存在的同名记忆文件。

3. 运行体检：

   ```bash
   node plugins/project-guardian/scripts/guardian.js doctor
   ```

4. 让 AI 读取当前代码后补齐基础上下文：

   ```text
   请阅读当前项目代码，并按 Project Guardian 标准补齐 PROJECT_CONTEXT.md、STATE.md 和 DECISIONS.md。不要改业务代码。
   ```

5. 生成交接文档：

   ```bash
   node plugins/project-guardian/scripts/guardian.js handover
   ```

6. 人工复核 `docs/HANDOVER.md`，补充真实运行方式、账号、环境变量和历史坑点。

## 4. 团队模板接入

如果公司有小项目脚手架，建议把插件直接放进模板：

```text
template-project/
  plugins/project-guardian/
  PROJECT_CONTEXT.md
  STATE.md
  DECISIONS.md
  docs/AI_CHANGELOG.md
  docs/HANDOVER.md
  AGENTS.md
  .cursorrules
```

模板中可以预填：

- 通用技术栈。
- 运行命令。
- 标准环境变量。
- 公司通用接口约定。
- 常见错误处理方式。

新项目从模板创建后，只需要改项目名称、业务流程和状态。

## 5. Git Hook 接入

安装提交前检查：

```bash
node plugins/project-guardian/scripts/guardian.js install-hooks
```

它会在 `.git/hooks/pre-commit` 中追加 Project Guardian 检查块，不会覆盖已有 hook。

检查规则：

- 如果 staged 代码有变更，但 staged 记忆文件没有变更，提交会失败。
- 如果没有 staged 变更，`check` 会检查工作区和未跟踪文件。
- 纯记忆文件变更可以通过。

## 6. 日常开发流程

一次标准 AI 辅助开发应该这样结束：

```bash
node plugins/project-guardian/scripts/guardian.js update "实现登录验证码"
```

然后人工补全 `docs/AI_CHANGELOG.md` 中的 TODO：

- AI summary
- Business reason
- Verification
- Risks
- Next step

再提交：

```bash
git add .
node plugins/project-guardian/scripts/guardian.js check
git commit -m "feat: add login captcha"
```

## 7. 新人接手流程

新人第一天按这个顺序：

1. 阅读 `docs/HANDOVER.md`。
2. 阅读 `PROJECT_CONTEXT.md`、`STATE.md`、`DECISIONS.md`。
3. 运行项目。
4. 运行：

   ```bash
   node plugins/project-guardian/scripts/guardian.js query
   ```

5. 连续询问模块、历史原因、风险点和下一步任务。

推荐提问：

```text
这个项目现在做到哪了？
登录模块的入口和风险点是什么？
最近一次 AI 修改改了什么，为什么改？
新人今天最适合接哪个任务？
```

## 8. 接入验收标准

接入完成必须满足：

- `doctor` 通过，没有缺失核心记忆文件。
- `PROJECT_CONTEXT.md` 至少说明项目目标、技术栈、运行方式、核心流程。
- `STATE.md` 至少说明当前状态、下一步、已知问题。
- `DECISIONS.md` 至少记录已有关键决策，或明确暂无关键决策。
- `docs/HANDOVER.md` 可以让新人独立启动项目。
- `check` 能在代码变更但记忆未更新时失败。
