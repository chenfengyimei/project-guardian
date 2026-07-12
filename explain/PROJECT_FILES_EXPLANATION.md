# Project Guardian 文件说明总览

本文档用于帮助第一次接触本仓库的人快速看懂：当前目录结构是什么、每个文档是干嘛的、为什么存在、里面写什么、什么情况下需要新增或修改。除了文档文件，也列出剩余代码、配置、资源和测试文件的职责�?

当前统计口径�?

- 仓库文件总数�?4 个�?
- 普通文件清单：78 个�?
- 隐藏配置和隐藏插件元数据�? 个�?
- 统计不包�?`.git/`、`node_modules/` 和被 `.gitignore` 排除的本地材料�?

## 目录结构

```text
project_ai/
  .agents/
    plugins/
      marketplace.json
  .cursor/
    rules/
      project-guardian.mdc
  memory/
    AI_CHANGELOG.md
    DECISIONS.md
    HANDOVER.md
    PROJECT_CONTEXT.md
    STATE.md
    decisions/
      2026-05-14-use-per-decision-files.md
      2026-05-15-ai-ide.md
      2026-05-15-memory.md
  explain/
    PROJECT_FILES_EXPLANATION.md
  Run/
    README.md
    server.js
    lib/
      audit.js
      commands.js
    public/
      index.html
      styles.css
      app.js
  plugins/
    project-guardian/
      .codex-plugin/
        plugin.json
      cmd/
        README.md
        guardian-cmd.js
      assets/
        icon.svg
        templates/
          AGENTS.md
          AI_CHANGELOG.md
          CLAUDE.md
          cline-rule.md
          continue-rule.md
          DECISIONS.md
          GEMINI.md
          HANDOVER.md
          PROJECT_CONTEXT.md
          STATE.md
          copilot-instructions.md
          copilot-project-guardian.instructions.md
          cursor-rules.mdc
          cursorrules
          gitee-go-project-guardian.yml
          vscode-tasks.json
          windsurf-rule.md
          zh-CN/
            AGENTS.md
            AI_CHANGELOG.md
            CLAUDE.md
            cline-rule.md
            continue-rule.md
            DECISIONS.md
            GEMINI.md
            HANDOVER.md
            PROJECT_CONTEXT.md
            STATE.md
            copilot-instructions.md
            copilot-project-guardian.instructions.md
            cursor-rules.mdc
            cursorrules
            vscode-tasks.json
            windsurf-rule.md
      docs/
        CLI_AND_CI.md
        INTEGRATION.md
        STANDARD.md
        WORKFLOW.md
      scripts/
        guardian.js
        lib/
          adapters.js
          config.js
          decisions.js
          doc-validation.js
          git-utils.js
          handover.js
          knowledge.js
          manual-memory.js
          mcp.js
          reviews.js
          security.js
      skills/
        project-guardian/
          SKILL.md
  tests/
    guardian.test.js
  .cursorrules
  .gitignore
  .guardianignore
  AGENTS.md
  CONTRIBUTING.md
  LICENSE
  README.md
  package-lock.json
  package.json
  project-guardian.config.json
  零基础超简单入�?md
```

## 文档、规则和模板文件

| 文件 | 干嘛�?| 为什么会有它 | 内容是什�?| 什么时候新增或修改 |
| --- | --- | --- | --- | --- |
| `README.md` | 仓库入口文档 | 第一次打开项目的人需要先知道这是什么、怎么开�?| 插件介绍、适用场景、安装方式、快速使用、常用命令、推荐工作流 | 安装方式、命令、目录、主要能力或用户入口变化�?|
| `CONTRIBUTING.md` | 贡献指南 | 降低单人维护风险，让后续贡献者知道如何安全改项目 | 开发前检查、提交前验证、查询能力贡献标准、文档和记忆更新要求、优先贡献方�?| 贡献流程、测试要求、发布标准或查询增强方向变化�?|
| `零基础超简单入�?md` | 小白教程 | 给完全没编程基础的人按步骤照�?| �?0 开始使用插件、初始化、记录、验证、提交的傻瓜式流�?| 新手反馈看不懂、命令变化、接入步骤变化时 |
| `LICENSE` | 开源许可证 | 明确代码使用、复制、分发和修改规则 | Apache-2.0 许可证文�?| 基本不修改；只有更换许可证时才改 |
| `AGENTS.md` | 通用 AI Agent 规则 | �?Codex 或其它通用 AI Agent 知道本项目使�?Project Guardian 记忆 | 修改前先�?`brief` 读取计划、按需读记忆、修改后更新记忆、禁止写入密�?| AI 工作规则、记忆文件路径或质量要求变化�?|
| `.cursorrules` | Cursor 旧版规则文件 | 兼容仍读�?`.cursorrules` �?Cursor 版本 | 要求 Cursor 先做读取计划、按需读项目记忆，修改后更新记�?| Cursor 兼容规则变化；可长期保留作为兼容�?|
| `.cursor/rules/project-guardian.mdc` | Cursor 新版规则文件 | 适配 Cursor rules 目录机制 | Cursor 中的 Project Guardian 必读和更新规�?| Cursor 新规则格式、项目记忆规则变化时 |
| `memory/PROJECT_CONTEXT.md` | 项目长期上下�?| AI 和新人需要稳定理解项目为什么存在、怎么运行、核心流程是什�?| 项目概览、技术栈、核心业务流程、依赖、数据模型、运行方式、约�?| 项目目标、技术栈、核心流程、运行方式、重要约束变化时 |
| `memory/STATE.md` | 当前状态文�?| 接手者需要知道现在做到哪里、下一步是什么、有什么风�?| 当前状态、已完成、进行中、下一步、已知问题、风险区域、最�?AI 协助变更 | 每次阶段状态变化、AI 协助改动后、交接前 |
| `memory/DECISIONS.md` | 决策索引和主记录 | 记录“为什么这样做”，避免后人只看到结果不知道原因 | 架构、流程、兼容、安全、语言策略等重要决�?| 出现重要业务、架构、依赖、流程、安全或兼容性决策时 |
| `memory/AI_CHANGELOG.md` | AI 协助变更日志 | 保存聊天窗口之外�?AI 修改上下�?| 用户需求、AI 总结、变更文件、业务原因、技术说明、验证、风险、敏感信息检查、下一�?| 每次 AI 协助修改代码或重要文档后 |
| `memory/HANDOVER.md` | 交接指南 | 新人或下一位开发者需要第一天就能上�?| 优先阅读、如何运行、项目地图、核心流程、常见问题、风险和新人第一天步�?| 交接、阶段结束、发布前、项目结构或运行方式变化�?|
| `memory/decisions/2026-05-14-use-per-decision-files.md` | 单条决策文件 | 降低多人同时修改 `memory/DECISIONS.md` 的冲突概�?| “使用单独决策文件”的决策详情 | 每次通过 `guardian decision add` 记录重要决策时可新增类似文件 |
| `memory/decisions/2026-05-15-ai-ide.md` | 单条决策文件 | 记录扩展 AI IDE 适配器的原因和范�?| 支持矩阵、CLI 通用层、适配器扩展、验证方式、风险和后续动作 | AI IDE 兼容策略调整或新增适配器时复审 |
| `memory/decisions/2026-05-15-memory.md` | 单条决策文件 | 记录本次把项目记忆集中迁移到 `memory/` 的原�?| 背景、决策、影响文件、验证方式、风险和后续动作 | 本次结构迁移决策需要回溯时查看；后续复审或调整迁移策略时修�?|
| `memory/decisions/2026-06-08-hybrid-search-and-contributing.md` | 单条决策文件 | 记录本次先做零依赖混合检索而不直接引入向量库的原因 | 背景、决策、备选方案、影响文件、验证方式、风险和后续动作 | 查询策略、可选向量索引或贡献标准变化时复�?|
| `memory/decisions/2026-06-04-run-command-catalog-module.md` | 单条决策文件 | 记录本次�?Run 命令目录�?HTTP server 拆成独立模块的原�?| 背景、决策、备选方案、影响文件、验证方式、风险、复审时间和后续动作 | Run 命令目录继续扩展、API 路由继续拆分或复审该架构选择�?|
| `explain/PROJECT_FILES_EXPLANATION.md` | 文件说明总览 | 把当前所有文档和非文档文件集中解释给新人�?| 目录结构、文档清单、代码配置清单、重复文件说明、维护判断标�?| 仓库新增、删除文件，或文件职责发生变化时 |
| `Run/README.md` | 可视化运行层说明 | 让第一次使�?Run 的人知道怎么启动、能做什么、有什么安全限�?| 本地 Web UI 的启动方式、可收起侧边栏、Markdown 记忆预览、初始化、手动追加记忆、知识查询独立输出、命令搜索、写入前 diff 预览、浏览器本地操作日志、服务端本地审计日志、全�?CLI 命令目录、安全边界、目录结构和后续扩展方向 | 可视化界面启动方式、安全边界、目录结构或功能范围变化�?|
| `plugins/project-guardian/docs/INTEGRATION.md` | 接入文档 | 目标项目需要知道怎么把插件接进去 | 新项目、已有项目、Gitee 项目、全局安装和源码内置接入步�?| 接入流程、安装源、初始化命令、目录结构变化时 |
| `plugins/project-guardian/docs/STANDARD.md` | 使用规范文档 | 统一团队怎么写、怎么审、怎么维护项目记忆 | 标准目录、记忆文件职责、记录质量、AI 使用规则、提交规范、配置标�?| 团队规范、目录标准、记录字段、配置项变化�?|
| `plugins/project-guardian/docs/WORKFLOW.md` | 工作流文�?| 解释完整闭环，不只是单条命令 | 接手项目、初始化、日常开发、记录、提交、交接、新人接手、每周维�?| 团队协作流程、Gitee 分支流程、交接流程变化时 |
| `plugins/project-guardian/docs/CLI_AND_CI.md` | 命令行和 CI 文档 | 专门说明 CLI、Git hook �?Gitee Go CI | 所�?`guardian` 命令、verify、hook、CI 模板、失败处�?| CLI 命令新增/修改、CI 模板�?hook 行为变化�?|
| `plugins/project-guardian/skills/project-guardian/SKILL.md` | Codex skill 说明 | Codex 插件需要一个可读取的技能入�?| 预算友好读取顺序、记忆更新规则、自助知识查询循环、记录标�?| Codex 使用规则、技能描述、项目记忆流程变化时 |
| `plugins/project-guardian/assets/templates/PROJECT_CONTEXT.md` | 英文项目上下文模�?| 英文项目执行 `guardian init --language en` 时生�?| 英文版项目长期上下文模板 | 英文上下文字段标准变化时 |
| `plugins/project-guardian/assets/templates/STATE.md` | 英文状态模�?| 英文项目初始�?`memory/STATE.md` �?| 英文当前状态、下一步、已知问题模�?| 状态记录标准变化时 |
| `plugins/project-guardian/assets/templates/DECISIONS.md` | 英文决策模板 | 英文项目初始�?`memory/DECISIONS.md` �?| 英文决策字段模板 | 决策字段或决策结构变化时 |
| `plugins/project-guardian/assets/templates/AI_CHANGELOG.md` | 英文 AI 变更日志模板 | 英文项目初始�?changelog �?| 英文 AI 协助变更记录字段 | changelog 记录标准变化�?|
| `plugins/project-guardian/assets/templates/HANDOVER.md` | 英文交接模板 | 英文项目初始�?handover �?| First Read、How To Run、Project Map、New Developer First Day | 交接文档结构变化�?|
| `plugins/project-guardian/assets/templates/AGENTS.md` | 英文通用 Agent 规则模板 | 英文项目生成 `AGENTS.md` �?| 英文 AI 必读和更新规�?| Agent 规则变化�?|
| `plugins/project-guardian/assets/templates/cursor-rules.mdc` | 英文 Cursor 新规则模�?| 英文项目生成 `.cursor/rules/project-guardian.mdc` �?| Cursor 新版规则格式下的项目记忆要求 | Cursor 规则格式或项目规则变化时 |
| `plugins/project-guardian/assets/templates/cursorrules` | 英文 Cursor 旧规则模�?| 英文项目生成 `.cursorrules` �?| 旧版 Cursor 可读的英文项目记忆规�?| 旧版 Cursor 兼容要求变化�?|
| `plugins/project-guardian/assets/templates/copilot-instructions.md` | 英文 Copilot 指令模板 | 英文项目生成 `.github/copilot-instructions.md` �?| GitHub Copilot 的英文项目记忆指�?| Copilot 指令格式变化�?|
| `plugins/project-guardian/assets/templates/copilot-project-guardian.instructions.md` | 英文 Copilot 局部指令模�?| 英文项目生成 `.github/instructions/project-guardian.instructions.md` �?| Project Guardian 专用 Copilot 英文规则 | Copilot 项目�?instructions 变化�?|
| `plugins/project-guardian/assets/templates/windsurf-rule.md` | 英文 Windsurf 规则模板 | 英文项目生成 `.windsurf/rules/project-guardian.md` �?| Windsurf 工作区英文项目记忆规�?| Windsurf 规则格式或项目规则变化时 |
| `plugins/project-guardian/assets/templates/cline-rule.md` | 英文 Cline 规则模板 | 英文项目生成 `.clinerules/project-guardian.md` �?| Cline 英文项目记忆规则 | Cline 规则格式或项目规则变化时 |
| `plugins/project-guardian/assets/templates/continue-rule.md` | 英文 Continue 规则模板 | 英文项目生成 `.continue/rules/project-guardian.md` �?| Continue 英文项目记忆规则 | Continue 规则格式或项目规则变化时 |
| `plugins/project-guardian/assets/templates/CLAUDE.md` | 英文 Claude Code 规则模板 | 英文项目生成 `CLAUDE.md` �?| Claude Code 英文项目记忆指令 | Claude Code 记忆文件约定变化�?|
| `plugins/project-guardian/assets/templates/GEMINI.md` | 英文 Gemini CLI 规则模板 | 英文项目生成 `GEMINI.md` �?| Gemini CLI 英文项目记忆指令 | Gemini CLI 记忆文件约定变化�?|
| `plugins/project-guardian/assets/templates/vscode-tasks.json` | 英文 VS Code tasks 模板 | 英文项目生成 `.vscode/tasks.json` �?| Verify、Update Memory、Brief、Query、Handover 任务 | VS Code task 命令或字段变化时 |
| `plugins/project-guardian/assets/templates/gitee-go-project-guardian.yml` | Gitee Go CI 模板 | `guardian install-ci` 生成流水线用 | Gitee Go 中运�?Project Guardian 检查的 YAML 模板 | CI 命令、默认分支、Node 版本或流水线结构变化�?|
| `plugins/project-guardian/assets/templates/zh-CN/PROJECT_CONTEXT.md` | 中文项目上下文模�?| 默认 `guardian init` 生成项目上下�?| 中文项目概览、技术栈、核心业务流程模�?| 中文上下文字段标准变化时 |
| `plugins/project-guardian/assets/templates/zh-CN/STATE.md` | 中文状态模�?| 默认初始�?`memory/STATE.md` | 中文当前状态、下一步、已知问题模�?| 中文状态记录标准变化时 |
| `plugins/project-guardian/assets/templates/zh-CN/DECISIONS.md` | 中文决策模板 | 默认初始�?`memory/DECISIONS.md` | 背景、决策、备选方案、影响文件、验证、风险等字段 | 中文决策字段变化�?|
| `plugins/project-guardian/assets/templates/zh-CN/AI_CHANGELOG.md` | 中文 AI 变更日志模板 | 默认初始�?`memory/AI_CHANGELOG.md` | 用户需求、AI 总结、变更文件、验证、风险等字段 | 中文 changelog 标准变化�?|
| `plugins/project-guardian/assets/templates/zh-CN/HANDOVER.md` | 中文交接模板 | 默认初始�?`memory/HANDOVER.md` | 优先阅读、如何运行、项目地图、新人第一�?| 中文交接结构变化�?|
| `plugins/project-guardian/assets/templates/zh-CN/AGENTS.md` | 中文通用 Agent 规则模板 | 默认生成 `AGENTS.md` | 中文 AI 必读、更新记忆、安全限�?| 中文 Agent 规则变化�?|
| `plugins/project-guardian/assets/templates/zh-CN/cursor-rules.mdc` | 中文 Cursor 新规则模�?| 默认生成 `.cursor/rules/project-guardian.mdc` | Cursor 新版中文项目记忆规则 | Cursor 中文适配变化�?|
| `plugins/project-guardian/assets/templates/zh-CN/cursorrules` | 中文 Cursor 旧规则模�?| 默认生成 `.cursorrules` | 旧版 Cursor 中文项目记忆规则 | 旧版 Cursor 中文兼容规则变化�?|
| `plugins/project-guardian/assets/templates/zh-CN/copilot-instructions.md` | 中文 Copilot 指令模板 | 默认生成 `.github/copilot-instructions.md` | Copilot 中文项目记忆指令 | Copilot 中文指令变化�?|
| `plugins/project-guardian/assets/templates/zh-CN/copilot-project-guardian.instructions.md` | 中文 Copilot 局部指令模�?| 默认生成 `.github/instructions/project-guardian.instructions.md` | Project Guardian 专用 Copilot 中文规则 | Copilot 项目级中文规则变化时 |
| `plugins/project-guardian/assets/templates/zh-CN/windsurf-rule.md` | 中文 Windsurf 规则模板 | 默认生成 `.windsurf/rules/project-guardian.md` | Windsurf 中文项目记忆规则 | Windsurf 中文适配变化�?|
| `plugins/project-guardian/assets/templates/zh-CN/cline-rule.md` | 中文 Cline 规则模板 | 默认生成 `.clinerules/project-guardian.md` | Cline 中文项目记忆规则 | Cline 中文适配变化�?|
| `plugins/project-guardian/assets/templates/zh-CN/continue-rule.md` | 中文 Continue 规则模板 | 默认生成 `.continue/rules/project-guardian.md` | Continue 中文项目记忆规则 | Continue 中文适配变化�?|
| `plugins/project-guardian/assets/templates/zh-CN/CLAUDE.md` | 中文 Claude Code 规则模板 | 默认生成 `CLAUDE.md` | Claude Code 中文项目记忆指令 | Claude Code 中文适配变化�?|
| `plugins/project-guardian/assets/templates/zh-CN/GEMINI.md` | 中文 Gemini CLI 规则模板 | 默认生成 `GEMINI.md` | Gemini CLI 中文项目记忆指令 | Gemini CLI 中文适配变化�?|
| `plugins/project-guardian/assets/templates/zh-CN/vscode-tasks.json` | 中文 VS Code tasks 模板 | 默认生成 `.vscode/tasks.json` | 中文输入提示�?Verify、Update Memory、Brief、Query、Handover 任务 | VS Code 中文任务模板变化�?|

## 代码、配置、资源和测试文件

| 文件 | 干嘛�?| 为什么会有它 | 内容是什�?| 什么时候新增或修改 |
| --- | --- | --- | --- | --- |
| `package.json` | npm 包和脚本配置 | 让项目能作为 CLI package 使用并运行测�?| 包名、版本、license、bin、files、engines、scripts | CLI 入口、版本、发布范围、测试脚本变化时 |
| `package-lock.json` | npm 锁定文件 | �?`npm audit` 和安装元数据可重复验�?| 当前 package 的锁定元数据；本项目暂无第三方依�?| package 元数据、依赖或 npm 审计流程变化�?|
| `project-guardian.config.json` | Project Guardian 配置 | 让项目无需�?CLI 源码就能调整规则 | 记忆文件路径、质量规则、hook、CI、security、MCP 权限、language、adapters、ignore | 记忆路径、语言、适配器、MCP 工具权限、CI 分支、扫描规则变化时 |
| `.agents/plugins/marketplace.json` | Codex 本地插件市场入口 | �?Codex 能发现本仓库中的插件 | 插件 id、路径、显示顺序或市场元数�?| 插件路径、插件入口、市场展示信息变化时 |
| `plugins/project-guardian/.codex-plugin/plugin.json` | Codex 插件元数�?| Codex 插件标准需要它 | 插件名称、版本、描述、skill 入口�?| 插件版本、描述、能力、入口变化时 |
| `plugins/project-guardian/cmd/README.md` | 受控命令层说�?| �?AI IDE 和维护者知道如何通过固定命令目录替代常见系统命令 | `guardian-cmd` 使用方式、日志位置、安全边界、常用命令和新增替代命令标准 | 受控命令目录、日志字段、安全边界或使用方式变化�?|
| `plugins/project-guardian/cmd/guardian-cmd.js` | AI IDE 受控命令代理 | 给常�?Git、npm、Node �?Project Guardian 命令提供固定替代入口，并自动写入本地命令审计日志 | 命令白名单、参数校验、子进程执行、参数脱敏、`.project-guardian/cmd-audit.jsonl` 写入和错误记�?| 新增命令替代项、修改日志字段、调整脱敏规则或安全边界�?|
| `plugins/project-guardian/scripts/guardian.js` | CLI 主程�?| Project Guardian 的所有命令都从这里进入，并协调各拆分模块 | init、update、append-memory、handover、check、doctor、validate-docs、brief、brief mode、query、query limit、decision、reviews、conflicts、mcp、hooks、CI、安全扫描、可移植 package scripts 等命令编�?| 新增命令、修改规则、修 bug、改变生成内容时 |
| `plugins/project-guardian/scripts/lib/adapters.js` | AI 工具适配器模�?| 把适配器解析从�?CLI 中拆出来，降低耦合 | adapter 名称解析、校验、模板到目标路径的映�?| 新增 Cursor/Copilot 之外�?AI 工具适配器时 |
| `plugins/project-guardian/scripts/lib/config.js` | CLI 配置模块 | 把配置加载、默认值合并和配置校验从主 CLI 中拆出来 | `project-guardian.config.json` 默认值、语言列表、加载、深度合并、init 语言参数应用、配置合法性校�?| 新增配置项、调整默认值、改变配置校验规则时 |
| `plugins/project-guardian/scripts/lib/decisions.js` | 决策记录模块 | �?`guardian decision add` 的字段解析、交互补齐和决策文件写入从主 CLI 中拆出来 | 决策字段收集、中英文决策条目生成、单条决策文件创建、slug 生成和影响文件默认�?| 决策字段、决策文件格式、复审字段或命令参数变化�?|
| `plugins/project-guardian/scripts/lib/doc-validation.js` | 文档质量校验模块 | �?`validate-docs` 的文档检查规则从�?CLI 中拆出来，降低主文件体积 | 核心记忆文件规则、占位符检查、必填字段检查、表格空行检查、决策有效性、最�?changelog TODO �?00:00 时间检�?| 文档质量标准、记忆字段、changelog 时间规则或决策规则变化时 |
| `plugins/project-guardian/scripts/lib/git-utils.js` | Git 和项目文件扫描模�?| �?Git diff、变更集合、变更行范围和源码文件收集从�?CLI 中拆出来，降�?`guardian.js` �?Git 细节的耦合 | `git` 安全子进程封装、staged/working/untracked 变更读取、diff stat、changed line ranges、源�?文档候选文件收集、`.guardianignore` 和配�?ignore 解析 | Git 行为、query/handover 文件收集、check/update 变更识别�?ignore 规则变化�?|
| `plugins/project-guardian/scripts/lib/handover.js` | 交接指南生成模块 | �?`guardian handover` 的记忆汇总和交接文档生成从主 CLI 中拆出来 | 读取上下文、状态、决策、项目文件和 package 信息，生成中英文交接指南，并在主命令中继续配合文档校�?| 交接文档结构、生成语言、读取范围或新人接手步骤变化�?|
| `plugins/project-guardian/scripts/lib/knowledge.js` | query/brief 检索模�?| 把混合检索、结果格式化�?token 预算读取计划从主 CLI 中拆出来 | query 排名、同义词扩展、n-gram 相似度、memory/source/git-history 结果格式化、brief 文件推荐、token 粗估、quick/deep/full/auto 读取计划格式�?| 检索策略、brief 模式、token 预算或输出格式变化时 |
| `plugins/project-guardian/scripts/lib/manual-memory.js` | 手动记忆模板模块 | �?CLI �?Run 控制台共用同一套追加记忆模板、白名单和基础敏感词拦�?| 核心记忆文件配置、追加模板字段、模板渲染、追加记录格式、路径解析和敏感内容拦截 | 追加记忆字段、模板、写入格式或安全边界变化�?|
| `plugins/project-guardian/scripts/lib/mcp.js` | MCP server 模块 | 让支�?MCP �?AI IDE 可以直接调用 Project Guardian CLI 能力 | stdio JSON-RPC 处理、MCP 工具定义、`guardian_brief` 读取计划�?mode 参数、配置化工具过滤、入�?schema 校验、CLI 子命令转发、复审查询和完成工具映射 | MCP 协议工具、暴露命令或安全策略变化�?|
| `plugins/project-guardian/scripts/lib/reviews.js` | 决策复审模块 | �?`guardian reviews`、`reviews due` �?`reviews complete` 从主 CLI 中拆出来 | 扫描 `memory/decisions/*.md`、解析复审时间、检测到期未完成复审、追加复审完成记录和限制复审文件路径 | 复审字段、到期判断、完成记录格式或复审命令行为变化�?|
| `plugins/project-guardian/scripts/lib/security.js` | 安全扫描模块 | �?`scan-secrets` 的敏感内容识别和脱敏从主 CLI 中拆出来，降低安全逻辑耦合 | 核心记忆与单独决策文件扫描、password/token/api_key/private key 关键词识别、高熵字符串识别、结果脱敏和 `.guardianignore` 支持 | 密钥识别规则、扫描范围、误报处理或脱敏格式变化�?|
| `Run/server.js` | 可视化层本地 HTTP server | 让用户可以自行启动网页控制台，同时和核心 CLI/MCP 代码隔离 | 静态文件服务、状�?API、按配置解析核心记忆路径、核心记忆读�?API、只�?diff 预览 API、受控初始化 API、模板化手动追加记忆 API、brief/query API、命令操�?API、MCP 工具调用 API、CLI 子进程调用和本地安全边界；审计和 token 校验委托�?`Run/lib/audit.js` | 可视�?API、启动参数、安全策略或网页入口变化�?|
| `Run/lib/audit.js` | Run 审计�?API token 模块 | 把服务端本地审计日志和可选访问口令从 Run server 主流程中拆出�?| `.project-guardian/run-audit.jsonl` 写入、hash 链生成、完整性校验、审计摘要脱敏、最近记录读取、`GUARDIAN_RUN_TOKEN` 校验和未授权请求记录 | 审计字段、脱敏策略、完整性校验或本地访问保护变化�?|
| `Run/lib/commands.js` | Run 命令目录模块 | 把网页控制台的固�?CLI 命令目录�?HTTP server 中拆出来，降低后端主文件耦合 | 命令定义、公开给前端的命令字段、写入命令参数构造、适配器列表校验、复审文件路径校验和基础敏感词拦�?| 命令操作模块新增命令、调整字段、修改确认规则或修复参数校验�?|
| `Run/public/index.html` | 可视化页面结�?| 给本地网页控制台提供实际界面 | 可收起侧边栏、状态概览、核心记忆、记忆内容预览、插件初始化、模板化手动追加记忆、brief、知识查询独立输出区、命令搜索、浏览器本地操作日志、服务端审计日志、命令操作页面、参数弹窗和写入�?diff 预览�?| 页面结构、控件或用户操作入口变化�?|
| `Run/public/styles.css` | 可视化页面样�?| �?Run 网页在桌面和移动端可读、可操作 | 侧边栏布局和收起动画、面板、按钮、状态、表单、Markdown 记忆预览、命令卡片、操作日志、diff 预览、参数弹窗、表格、文本框和输出区样式 | 视觉风格、响应式布局或组件样式变化时 |
| `Run/public/app.js` | 可视化页面交�?| 把浏览器按钮和表单连接到 Run server API | 功能页切换、侧边栏收起状态、状态加载、记忆文件点击预览、轻�?Markdown 渲染、初始化提交、模板化手动追加记忆、命令目录搜�?渲染、命令参数弹窗、写入前 diff 预览、浏览器本地短操作日志、服务端审计日志完整性展示、API token 请求头、brief/query 提交、分区输出显示和错误提示 | 前端 API、交互流程或输出展示变化�?|
| `tests/guardian.test.js` | 自动化测�?| 防止 CLI 行为回归 | 初始化、校验、check、hooks、CI、append-memory、decision、reviews、handover、brief、query、query limit、mcp、MCP 参数校验、scan-secrets、conflicts、CLI 拆分模块、Run diff preview、Run 服务�?hash 链审计日志、Run API token、Run 命令搜索、AI IDE 适配器和 package scripts 等测�?| CLI 行为变化、修 bug、新增命令或模板规则变化�?|
| `.gitignore` | Git 忽略规则 | 避免提交临时文件、依赖、构建产物或本地运行日志 | Git 忽略路径，包�?`node_modules/`、构建目录、测试临时目录、环境变量文件、软著材料目录和 `.project-guardian/` 本地审计日志目录 | 新增构建产物、缓存目录、临时文件类型或本地日志目录�?|
| `.guardianignore` | Project Guardian 忽略规则 | 让安全扫描或索引跳过特定路径 | Guardian 自己使用的忽略路�?| 示例密钥、测试数据或无需扫描目录需要排除时 |
| `plugins/project-guardian/assets/icon.svg` | 插件图标资源 | 插件市场�?UI 展示需要图�?| SVG 图标 | 品牌、视觉或插件展示资源变化�?|

## 当前哪些文件可能看起来重�?

| 看起来重复的文件 | 实际原因 |
| --- | --- |
| `.cursorrules` �?`.cursor/rules/project-guardian.mdc` | 前者兼容旧�?Cursor，后者适配新版 Cursor rules 目录�?|
| 英文模板�?`zh-CN` 中文模板 | 默认中文项目使用 `zh-CN`；英文团队使�?`guardian init --language en`�?|
| `memory/DECISIONS.md` �?`memory/decisions/*.md` | 前者是总索引和兼容入口；后者是一条决策一个文件，降低多人协作冲突�?|
| `AGENTS.md`、Cursor 规则、Copilot 指令 | 它们分别服务不同 AI 工具，不是给同一个工具重复读取�?|
| 规则文件适配器和 `guardian mcp` | 前者让 AI 按预算读取项目记忆规则，后者让支持 MCP �?AI IDE 直接调用 brief、查询、更新、验证等工具�?|

## 新增或修改文件的判断标准

- 新增功能、命令、配置项：通常要改 `guardian.js`、测试、README、CLI 文档、标准文档，必要时改模板�?
- 新增 AI 工具适配器：通常要改 `scripts/lib/adapters.js`、模板、测试、接入文档和标准文档�?
- 修改项目记忆标准：通常要改模板、`STANDARD.md`、`validate-docs` 规则和测试�?
- 修改使用流程：通常要改 `WORKFLOW.md`、`INTEGRATION.md`、`README.md`�?
- 修改 CI �?hook 行为：通常要改 `CLI_AND_CI.md`、`guardian.js`、CI 模板和测试�?
- 每次 AI 协助的重要变更：通常要更�?`memory/STATE.md` �?`memory/AI_CHANGELOG.md`�?
