# Project Guardian 工作流文档

本文档专门说明 Project Guardian 在团队中的完整工作循环：如何从 Gitee 拉取项目，如何初始化，如何日常开发，如何记录上下文，如何交接，以及新人如何接手。

## 1. 工作流目标

Project Guardian 要解决的不是“多写几篇文档”，而是把 AI 辅助开发过程变成一个固定闭环：

```text
接手项目
  -> 生成读取计划
  -> 按需读取项目记忆
  -> 明确本轮任务
  -> 使用 AI 编码
  -> 记录修改原因
  -> 检查记忆是否更新
  -> 提交到 Gitee
  -> 阶段交接或下一个人接手
```

每一轮循环都必须留下三类信息：

- 当前状态：现在做到哪了。
- 历史原因：为什么之前这样写。
- 下一步：下一个人该做什么，哪些地方不要乱动。

## 2. 角色分工

### 项目负责人

- 创建或接收 Gitee 仓库。
- 确认 Project Guardian 已经接入。
- 审核 `memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md` 是否可信。
- 在换人前要求开发者运行 `handover`。

### 当前开发者

- 每天开发前先运行 `guardian brief "今天要做什么"`，再读取本轮必要的项目记忆。
- AI 改代码后运行 `update`。
- 提交前运行 `check`。
- 遇到重要业务规则或技术取舍时更新 `memory/DECISIONS.md`。

### 新接手开发者

- 先运行 `guardian brief "新人接手"`，判断本轮需要读哪些文件。
- 默认先读 `memory/PROJECT_CONTEXT.md` 和 `memory/STATE.md`。
- 需要交接细节时读 `memory/HANDOVER.md`，需要历史原因或决策时再读 `memory/DECISIONS.md` 和 `memory/AI_CHANGELOG.md`。
- 使用 `query --limit 3` 连续提问，确认模块入口、历史原因和风险点。
- 只接一个小任务开始，不要上来大改核心模块。

### AI 助手

- 修改前先做读取计划，默认只读取核心记忆，按任务需要读取历史和交接记忆。
- 按需读取不是硬限制；遇到 bug、回归、测试失败、历史不清楚、高风险模块或准备重构时升级到 `guardian brief "任务" --mode deep`。
- 新人接手、交接、上线、审计、大范围重构或用户要求完整上下文时升级到 `guardian brief "任务" --mode full`。
- 回答时说明依据来自哪个记忆文件或代码文件。
- 修改后协助更新 `memory/STATE.md` 和 `memory/AI_CHANGELOG.md`。
- 发现记忆缺失时提醒补齐。

## 3. 第一次从 Gitee 接手项目

新人或新实习生拿到 Gitee 仓库后，先做这些步骤。

### 3.1 克隆仓库

```bash
git clone <你的 Gitee 仓库地址>
cd <项目目录>
```

示例：

```bash
git clone https://gitee.com/company/demo-project.git
cd demo-project
```

### 3.2 确认插件是否存在

检查项目中是否有：

```text
plugins/project-guardian/scripts/guardian.js
```

如果存在，说明插件源码已经随项目提交到 Gitee。

如果不存在，有两种处理方式：

1. 从公司插件仓库复制 `project-guardian` 到当前项目的 `plugins/` 目录。
2. 或者使用本机统一安装的插件路径运行命令。

推荐项目内固定保存：

```text
plugins/project-guardian/
```

这样新人拉下 Gitee 仓库后不需要再找工具。

如果团队已经把 Project Guardian 安装成全局 CLI，也可以直接运行 `guardian` 命令，不需要写完整脚本路径：

```bash
npm install -g project-guardian
# 或从公司 Gitee 工具仓库安装
npm install -g git+https://gitee.com/chenfengloveyuri/project-guardian.git

guardian doctor
guardian init
```

两种方式可以并存：项目内保存插件源码更利于版本固定；全局 CLI 更适合多个项目统一使用。

### 3.3 运行初始化体检

先运行：

```bash
node plugins/project-guardian/scripts/guardian.js doctor
```

如果提示缺少核心记忆文件，再运行：

```bash
node plugins/project-guardian/scripts/guardian.js init
```

全局 CLI 写法：

```bash
guardian init
```

默认会生成中文项目记忆和中文 AI 规则。英文项目第一次初始化时改用：

```bash
guardian init --language en
```

然后再次运行：

```bash
node plugins/project-guardian/scripts/guardian.js doctor
```

`doctor` 通过后，说明基础文件已经齐全。

补齐项目记忆内容后，继续运行：

```bash
node plugins/project-guardian/scripts/guardian.js verify
```

`verify` 通过后，说明项目记忆、变更关联、文档质量和安全扫描都达到提交前标准。

如果当前仓库处在合并冲突状态，可以先运行：

```bash
node plugins/project-guardian/scripts/guardian.js conflicts
```

它会列出冲突文件，并对 `memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md` 和 `memory/decisions/*.md` 的冲突给出处理建议。

## 4. init 初始化到底做了什么

`init` 是 Project Guardian 的初始化命令。

运行位置必须是项目根目录，也就是包含 `.git`、`package.json` 或主要源码目录的地方。

```bash
node plugins/project-guardian/scripts/guardian.js init
```

运行后会创建这些文件：

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

如果团队使用 Cursor、Copilot 或其他 AI 工具，可以补装适配规则：

```bash
guardian install-adapters --adapter cursor,copilot
guardian init --adapter all
```

这些适配规则只告诉不同 AI 工具如何读取 Project Guardian 记忆，不会覆盖已有项目记忆文件。

如果 AI IDE 支持 MCP，也可以接入 `guardian mcp`，让 IDE 直接调用查询、更新、验证、交接和安全扫描工具。MCP 不会生成额外记忆文件，仍然读取和维护 `memory/` 目录下的标准项目记忆。查询工具支持 `limit` 参数控制返回片段数量，日常答疑建议先用 2 到 3 个片段。

### 4.1 init 不会覆盖已有记忆

如果项目里已经有同名文件，`init` 会保留已有文件，不会覆盖。

这意味着已有项目可以安全运行：

```bash
node plugins/project-guardian/scripts/guardian.js init
```

### 4.2 init 后必须人工或 AI 补齐内容

`init` 只负责创建标准模板，不会自动知道你的业务。

初始化后，要补齐：

- `memory/PROJECT_CONTEXT.md`：项目是做什么的，技术栈是什么，如何运行。
- `memory/STATE.md`：当前完成了什么，正在做什么，下一步是什么。
- `memory/DECISIONS.md`：为什么选这个方案，有什么历史坑。

推荐让 AI 帮你补第一版：

```text
请阅读当前项目代码，不要修改业务代码。请按照 Project Guardian 标准补齐 memory/PROJECT_CONTEXT.md、memory/STATE.md 和 memory/DECISIONS.md，重点写清楚项目目标、技术栈、运行方式、核心业务流程、当前状态和已知风险。
```

补完后必须人工复核，因为 AI 可能猜错业务背景。

### 4.3 init 对 package.json 的影响

如果项目根目录有 `package.json`，`init` 会自动补充 npm scripts：

```bash
npm run guardian:init
npm run guardian:doctor
npm run guardian:update -- "任务说明"
npm run guardian:handover
npm run guardian:check
npm run guardian:brief -- "任务说明"
npm run guardian:query
npm run guardian:mcp
```

如果不是 Node 项目，也可以直接使用 `node plugins/project-guardian/scripts/guardian.js <命令>`。

## 5. 每日开发循环

每天开始开发前，当前开发者先做：

```bash
git pull
node plugins/project-guardian/scripts/guardian.js doctor
node plugins/project-guardian/scripts/guardian.js brief "今天继续开发"
```

然后按 `brief` 输出阅读。默认先读：

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`

如果任务涉及历史原因、决策或回归，再读 `memory/DECISIONS.md` 和 `memory/AI_CHANGELOG.md`。
如果任务涉及 bug、测试失败、高风险模块或大改动，直接运行 `guardian brief "今天继续开发" --mode deep`。

建议问 AI：

```text
请先运行 guardian brief "今天继续开发"，再按读取计划总结当前项目状态、今天适合继续做什么、哪些地方有风险。
```

## 6. 一次标准任务循环

假设今天要实现“登录验证码”。

### 6.1 开始前写清任务

先在对话里告诉 AI：

```text
我要实现登录验证码。请先运行 guardian brief "实现登录验证码"，再用 guardian query "登录验证码" --limit 3 查询相关上下文，然后告诉我登录模块入口、相关文件、历史风险和建议修改方案。先不要改代码。
```

确认方案后再让 AI 改代码。

### 6.2 AI 修改代码

AI 修改时，要求它说明：

- 改哪些文件。
- 为什么这样改。
- 是否影响旧逻辑。
- 如何验证。

### 6.3 本地验证

根据项目类型运行验证命令，例如：

```bash
npm run test
npm run build
npm run dev
```

如果没有自动化测试，至少做手动验证，并把验证步骤写入 `memory/AI_CHANGELOG.md`。

### 6.4 更新项目记忆

运行：

```bash
node plugins/project-guardian/scripts/guardian.js update "实现登录验证码"
```

它会更新：

```text
memory/STATE.md
memory/AI_CHANGELOG.md
```

然后打开 `memory/AI_CHANGELOG.md`，补齐 TODO：

- `AI summary`：这次改了什么。
- `Business reason`：为什么要改。
- `Verification`：怎么验证过。
- `Risks`：有哪些风险。
- `Next step`：下一个人要注意什么。

记录标题时间必须使用真实本地时间，格式为 `YYYY-MM-DD HH:mm`。不要把 `00:00` 当作占位时间写入最新记录。

如果这次引入了重要规则，还要更新 `memory/DECISIONS.md`。
推荐使用命令生成结构化决策：

```bash
node plugins/project-guardian/scripts/guardian.js decision add --title "决策标题" --context "背景" --decision "决定"
```

如果这次修改属于临时方案、安全权限、登录支付、质量闸门、CI、MCP 工具权限或 AI 工作流规则变化，建议设置复审时间：

```bash
node plugins/project-guardian/scripts/guardian.js decision add --title "决策标题" --context "背景" --decision "决定" --review-after "2026-07-01"
```

复审到期后运行：

```bash
node plugins/project-guardian/scripts/guardian.js reviews due
node plugins/project-guardian/scripts/guardian.js reviews complete memory/decisions/example.md --summary "复审通过" --verification "已检查测试和文档"
```

复审完成后会在决策文件里标记“正常”和“无需继续复审”，后续 `verify` 不会再因为该决策失败。

### 6.5 提交前检查

```bash
git add .
node plugins/project-guardian/scripts/guardian.js verify
```

如果检查失败，通常说明你改了业务代码，但没有把记忆文件一起加入提交。

修复方式：

```bash
node plugins/project-guardian/scripts/guardian.js update "补充本次任务记忆"
git add memory/STATE.md memory/AI_CHANGELOG.md
node plugins/project-guardian/scripts/guardian.js verify
```

### 6.6 提交到 Gitee

```bash
git commit -m "feat: add login captcha"
git push
```

如果团队使用 Gitee Pull Request，建议 PR 描述包含：

```text
本次改动：
验证方式：
风险点：
已更新项目记忆：是/否
```

## 7. 阶段交接循环

出现以下情况时必须交接：

- 实习生离职。
- 换人继续做。
- 项目暂停超过一周。
- 版本上线前。
- 核心模块大改后。

### 7.1 当前开发者交接前

先确保工作区干净或至少状态明确：

```bash
git status
```

然后运行：

```bash
node plugins/project-guardian/scripts/guardian.js update "阶段交接前整理"
node plugins/project-guardian/scripts/guardian.js handover
```

人工检查：

- `memory/STATE.md` 是否写清楚下一步。
- `memory/HANDOVER.md` 是否写清楚如何运行。
- `memory/DECISIONS.md` 是否补齐重要原因。
- `memory/AI_CHANGELOG.md` 最近记录是否能看懂。

然后提交：

```bash
git add .
node plugins/project-guardian/scripts/guardian.js verify
git commit -m "docs: update project handover"
git push
```

### 7.2 交接时必须说明的内容

交接消息建议写：

```text
项目当前状态：
已经完成：
未完成：
下一步建议：
高风险文件：
本地运行命令：
测试账号或测试数据：
最近一次问题：
Gitee 最新提交：
```

这些内容也应该同步到 `memory/STATE.md` 或 `memory/HANDOVER.md`。

## 8. 新人接手循环

新人接手不要直接改代码，先执行：

```bash
git pull
node plugins/project-guardian/scripts/guardian.js doctor
node plugins/project-guardian/scripts/guardian.js brief "新人接手"
```

然后按读取计划阅读。默认先读：

```text
memory/PROJECT_CONTEXT.md
memory/STATE.md
```

如果 `brief` 推荐交接、历史或决策上下文，再继续读：

```text
memory/HANDOVER.md
memory/DECISIONS.md
memory/AI_CHANGELOG.md
```

接着运行多轮查询：

```bash
node plugins/project-guardian/scripts/guardian.js query "新人接手" --limit 3
```

推荐连续提问：

```text
这个项目现在做到哪了？
我今天应该先做什么？
登录模块入口在哪里？
最近一次 AI 修改改了什么？
哪些文件最容易出问题？
如果我要改某个功能，需要先看哪些文件？
```

新人第一天只做一个小任务。完成后也按标准任务循环更新记忆并提交。

## 9. Gitee 分支建议

推荐分支规则：

```text
main        稳定分支
develop     日常集成分支
feature/*   功能分支
fix/*       修复分支
docs/*      文档和记忆更新分支
```

实习生开发建议：

```bash
git checkout -b feature/login-captcha
```

完成后：

```bash
git push -u origin feature/login-captcha
```

然后在 Gitee 上发起 Pull Request。

PR 合并前检查：

- 是否更新 `memory/STATE.md`。
- 是否更新 `memory/AI_CHANGELOG.md`。
- 是否需要更新 `memory/DECISIONS.md`。
- 是否运行过项目验证。
- 是否说明风险点。
- 是否通过 `validate-docs`。

## 10. 每周项目记忆维护

项目负责人每周做一次：

```bash
git pull
node plugins/project-guardian/scripts/guardian.js doctor
node plugins/project-guardian/scripts/guardian.js brief "每周项目记忆维护"
node plugins/project-guardian/scripts/guardian.js handover
```

检查：

- `memory/STATE.md` 是否过期。
- `Next Steps` 是否仍然准确。
- `Known Issues` 是否已经解决但没删除。
- `memory/DECISIONS.md` 是否缺少新决策。
- `memory/HANDOVER.md` 是否能让新人启动项目。

## 11. 常见问题

### 运行 init 报找不到文件

确认你在项目根目录，并且插件路径存在：

```bash
dir plugins\project-guardian\scripts
```

Windows PowerShell 示例：

```powershell
node .\plugins\project-guardian\scripts\guardian.js init
```

macOS 或 Linux 示例：

```bash
node ./plugins/project-guardian/scripts/guardian.js init
```

### init 后文档还是空的

这是正常的。`init` 只创建模板，不会自动理解业务。你需要让 AI 读取代码后补齐第一版，并由人复核。

### check 失败

说明你暂存了代码变更，但没有暂存记忆文件变更。

处理：

```bash
node plugins/project-guardian/scripts/guardian.js update "补充本次修改记录"
git add memory/STATE.md memory/AI_CHANGELOG.md
node plugins/project-guardian/scripts/guardian.js check
```

### 新人不知道下一步做什么

先看 `memory/STATE.md` 的 `Next Steps`。如果仍不清楚，运行：

```bash
node plugins/project-guardian/scripts/guardian.js brief "新人下一步"
node plugins/project-guardian/scripts/guardian.js query "新人下一步" --limit 3
```

然后问：

```text
根据当前项目记忆，请给我一个适合新人今天完成的小任务。
```

## 12. 最小执行标准

团队如果只想先低成本执行，至少做到：

1. 每个项目运行一次 `init`。
2. 每次 AI 改代码后运行 `update`。
3. 每次换人前运行 `handover`。
4. 每次提交前运行 `verify`。
5. 新人接手先读 `memory/HANDOVER.md`。

`verify` 会同时覆盖体检、变更关联、文档质量和安全扫描。

只要这五件事稳定执行，项目上下文就不会随着人员流动彻底断掉。

## 13. 自动化检查循环

团队稳定执行后，建议开启 Gitee Go 自动检查：

```bash
node plugins/project-guardian/scripts/guardian.js install-ci
git add .workflow/project-guardian.yml
git commit -m "ci: add project guardian checks"
git push
```

之后每次 push 时，流水线推荐运行 `verify`，或者至少运行 `check`、`validate-docs` 和 `scan-secrets`。其中 `check` 负责确认代码变更是否带上记忆更新，`validate-docs` 负责确认记忆文档没有停留在模板状态，`scan-secrets` 负责避免把真实密码或 token 写入记忆。

详细命令说明、失败处理和 Gitee Go 分支配置见 `plugins/project-guardian/docs/CLI_AND_CI.md`。
