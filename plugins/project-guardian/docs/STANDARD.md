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
  docs/
    INTEGRATION.md
    STANDARD.md
  README.md
```

不得删除：

- `.codex-plugin/plugin.json`
- `skills/project-guardian/SKILL.md`
- `scripts/guardian.js`
- `assets/templates/`

## 2. 项目接入后标准目录

目标项目接入后，根目录必须包含：

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

建议但不强制：

```text
plugins/project-guardian/
```

如果团队不希望每个项目保存插件源码，可以把插件放到统一工具仓库，但项目内仍必须保留标准记忆文件。

## 3. 标准记忆文件职责

### PROJECT_CONTEXT.md

长期稳定上下文。记录项目为什么存在、给谁用、核心业务流程是什么、使用什么技术栈、如何运行。

必须包含：

- 项目名称和目标。
- 目标用户或业务方。
- 技术栈。
- 核心业务流程。
- 运行、测试、构建命令。
- 外部依赖和环境变量。

### STATE.md

当前状态。记录项目现在做到哪、下一步做什么、有哪些问题和风险。

必须包含：

- Current Status
- Completed
- In Progress
- Next Steps
- Known Issues
- Risk Areas
- Latest AI-Assisted Change

### DECISIONS.md

历史决策。记录为什么这样做，而不是只记录做了什么。

以下情况必须记录：

- 选择或更换框架、库、数据库、部署方式。
- 重要业务规则被固化到代码中。
- 为兼容旧系统做了特殊处理。
- 为修复线上问题引入非直观逻辑。
- 安全、权限、数据模型、支付、登录等高风险模块变化。

### docs/AI_CHANGELOG.md

AI 辅助开发流水账。每次 AI 改代码后必须追加一条记录。

必须包含：

- Human request
- AI summary
- Files changed
- Business reason
- Technical notes
- Verification
- Risks
- Next step

### docs/HANDOVER.md

新人交接指南。换人、离职、交付、暂停超过一周时必须刷新。

必须让新人知道：

- 如何启动项目。
- 代码结构怎么看。
- 核心流程在哪里。
- 哪些地方最容易出错。
- 第一天应该做什么。

### AGENTS.md 和 .cursorrules

AI 行为规则。要求 AI 修改前先读记忆，修改后更新记忆。

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

- 让 AI 在改代码前读取项目记忆。
- AI 生成的关键代码必须要求解释业务原因。
- AI 修改完成后必须运行 `update` 或手动更新记忆。
- AI 不能只回答“已完成”，必须说明验证方式和风险。
- AI 不确定时必须把不确定点写入 `STATE.md` 或 `AI_CHANGELOG.md`。

## 6. 提交规范

代码提交必须满足：

- 业务代码变更通常要包含记忆文件变更。
- 纯格式化、依赖锁文件自动刷新、无业务影响的机械变更可以不更新记忆。
- 如果引入新风险或新约定，必须更新 `DECISIONS.md`。
- 提交前运行：

  ```bash
  node plugins/project-guardian/scripts/guardian.js check
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
```

查询顺序建议：

1. 先问项目整体状态。
2. 再问目标模块入口。
3. 再问历史原因和风险。
4. 最后问下一步实施方案。

如果查询发现记忆文件缺失、过期或不准确，必须更新对应记忆文件。

## 9. 维护规范

维护插件时必须检查：

- `plugin.json` 是合法 JSON。
- `guardian.js` 通过 `node --check`。
- `init` 不覆盖已有记忆文件。
- `check` 能检查 staged 代码变更。
- `install-hooks` 不覆盖已有 hook。
- 文档和模板能让第一次使用者独立接入。

建议每次修改插件后运行：

```bash
node --check plugins/project-guardian/scripts/guardian.js
node plugins/project-guardian/scripts/guardian.js help
```
