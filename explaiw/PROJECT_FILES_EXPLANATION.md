# Project Guardian 文件说明总览

本文档用于帮助第一次接触本仓库的人快速看懂：当前目录结构是什么、每个文档是干嘛的、为什么存在、里面写什么、什么情况下需要新增或修改。除了文档文件，也列出剩余代码、配置、资源和测试文件的职责。

当前统计口径：

- 仓库文件总数：49 个。
- 文档、规则、模板、说明类文件：39 个。
- 代码、配置、资源、测试和忽略规则等其它文件：10 个。
- 统计不包含 `.git/` 和 `node_modules/`。

## 目录结构

```text
project_ai/
  .agents/
    plugins/
      marketplace.json
  .cursor/
    rules/
      project-guardian.mdc
  docs/
    AI_CHANGELOG.md
    HANDOVER.md
    decisions/
      2026-05-14-use-per-decision-files.md
  explaiw/
    PROJECT_FILES_EXPLANATION.md
  plugins/
    project-guardian/
      .codex-plugin/
        plugin.json
      assets/
        icon.svg
        templates/
          AGENTS.md
          AI_CHANGELOG.md
          DECISIONS.md
          HANDOVER.md
          PROJECT_CONTEXT.md
          STATE.md
          copilot-instructions.md
          copilot-project-guardian.instructions.md
          cursor-rules.mdc
          cursorrules
          gitee-go-project-guardian.yml
          zh-CN/
            AGENTS.md
            AI_CHANGELOG.md
            DECISIONS.md
            HANDOVER.md
            PROJECT_CONTEXT.md
            STATE.md
            copilot-instructions.md
            copilot-project-guardian.instructions.md
            cursor-rules.mdc
            cursorrules
      docs/
        CLI_AND_CI.md
        INTEGRATION.md
        STANDARD.md
        WORKFLOW.md
      scripts/
        guardian.js
        lib/
          adapters.js
      skills/
        project-guardian/
          SKILL.md
  tests/
    guardian.test.js
  .cursorrules
  .gitignore
  .guardianignore
  AGENTS.md
  DECISIONS.md
  LICENSE
  PROJECT_CONTEXT.md
  README.md
  STATE.md
  package.json
  project-guardian.config.json
  零基础超简单入门.md
```

## 文档、规则和模板文件

| 文件 | 干嘛的 | 为什么会有它 | 内容是什么 | 什么时候新增或修改 |
| --- | --- | --- | --- | --- |
| `README.md` | 仓库入口文档 | 第一次打开项目的人需要先知道这是什么、怎么开始 | 插件介绍、适用场景、安装方式、快速使用、常用命令、推荐工作流 | 安装方式、命令、目录、主要能力或用户入口变化时 |
| `零基础超简单入门.md` | 小白教程 | 给完全没编程基础的人按步骤照做 | 从 0 开始使用插件、初始化、记录、验证、提交的傻瓜式流程 | 新手反馈看不懂、命令变化、接入步骤变化时 |
| `LICENSE` | 开源许可证 | 明确代码使用、复制、分发和修改规则 | Apache-2.0 许可证文本 | 基本不修改；只有更换许可证时才改 |
| `AGENTS.md` | 通用 AI Agent 规则 | 让 Codex 或其它通用 AI Agent 知道本项目使用 Project Guardian 记忆 | 修改前要读哪些记忆文件、修改后更新哪些记忆、禁止写入密钥 | AI 工作规则、记忆文件路径或质量要求变化时 |
| `.cursorrules` | Cursor 旧版规则文件 | 兼容仍读取 `.cursorrules` 的 Cursor 版本 | 要求 Cursor 先读项目记忆，修改后更新记忆 | Cursor 兼容规则变化；可长期保留作为兼容层 |
| `.cursor/rules/project-guardian.mdc` | Cursor 新版规则文件 | 适配 Cursor rules 目录机制 | Cursor 中的 Project Guardian 必读和更新规则 | Cursor 新规则格式、项目记忆规则变化时 |
| `PROJECT_CONTEXT.md` | 项目长期上下文 | AI 和新人需要稳定理解项目为什么存在、怎么运行、核心流程是什么 | 项目概览、技术栈、核心业务流程、依赖、数据模型、运行方式、约束 | 项目目标、技术栈、核心流程、运行方式、重要约束变化时 |
| `STATE.md` | 当前状态文件 | 接手者需要知道现在做到哪里、下一步是什么、有什么风险 | 当前状态、已完成、进行中、下一步、已知问题、风险区域、最新 AI 协助变更 | 每次阶段状态变化、AI 协助改动后、交接前 |
| `DECISIONS.md` | 决策索引和主记录 | 记录“为什么这样做”，避免后人只看到结果不知道原因 | 架构、流程、兼容、安全、语言策略等重要决策 | 出现重要业务、架构、依赖、流程、安全或兼容性决策时 |
| `docs/AI_CHANGELOG.md` | AI 协助变更日志 | 保存聊天窗口之外的 AI 修改上下文 | 用户需求、AI 总结、变更文件、业务原因、技术说明、验证、风险、敏感信息检查、下一步 | 每次 AI 协助修改代码或重要文档后 |
| `docs/HANDOVER.md` | 交接指南 | 新人或下一位开发者需要第一天就能上手 | 优先阅读、如何运行、项目地图、核心流程、常见问题、风险和新人第一天步骤 | 交接、阶段结束、发布前、项目结构或运行方式变化时 |
| `docs/decisions/2026-05-14-use-per-decision-files.md` | 单条决策文件 | 降低多人同时修改 `DECISIONS.md` 的冲突概率 | “使用单独决策文件”的决策详情 | 每次通过 `guardian decision add` 记录重要决策时可新增类似文件 |
| `explaiw/PROJECT_FILES_EXPLANATION.md` | 文件说明总览 | 把当前所有文档和非文档文件集中解释给新人看 | 目录结构、文档清单、代码配置清单、重复文件说明、维护判断标准 | 仓库新增、删除文件，或文件职责发生变化时 |
| `plugins/project-guardian/docs/INTEGRATION.md` | 接入文档 | 目标项目需要知道怎么把插件接进去 | 新项目、已有项目、Gitee 项目、全局安装和源码内置接入步骤 | 接入流程、安装源、初始化命令、目录结构变化时 |
| `plugins/project-guardian/docs/STANDARD.md` | 使用规范文档 | 统一团队怎么写、怎么审、怎么维护项目记忆 | 标准目录、记忆文件职责、记录质量、AI 使用规则、提交规范、配置标准 | 团队规范、目录标准、记录字段、配置项变化时 |
| `plugins/project-guardian/docs/WORKFLOW.md` | 工作流文档 | 解释完整闭环，不只是单条命令 | 接手项目、初始化、日常开发、记录、提交、交接、新人接手、每周维护 | 团队协作流程、Gitee 分支流程、交接流程变化时 |
| `plugins/project-guardian/docs/CLI_AND_CI.md` | 命令行和 CI 文档 | 专门说明 CLI、Git hook 和 Gitee Go CI | 所有 `guardian` 命令、verify、hook、CI 模板、失败处理 | CLI 命令新增/修改、CI 模板或 hook 行为变化时 |
| `plugins/project-guardian/skills/project-guardian/SKILL.md` | Codex skill 说明 | Codex 插件需要一个可读取的技能入口 | 必读顺序、记忆更新规则、自助知识查询循环、记录标准 | Codex 使用规则、技能描述、项目记忆流程变化时 |
| `plugins/project-guardian/assets/templates/PROJECT_CONTEXT.md` | 英文项目上下文模板 | 英文项目执行 `guardian init --language en` 时生成 | 英文版项目长期上下文模板 | 英文上下文字段标准变化时 |
| `plugins/project-guardian/assets/templates/STATE.md` | 英文状态模板 | 英文项目初始化 `STATE.md` 用 | 英文当前状态、下一步、已知问题模板 | 状态记录标准变化时 |
| `plugins/project-guardian/assets/templates/DECISIONS.md` | 英文决策模板 | 英文项目初始化 `DECISIONS.md` 用 | 英文决策字段模板 | 决策字段或决策结构变化时 |
| `plugins/project-guardian/assets/templates/AI_CHANGELOG.md` | 英文 AI 变更日志模板 | 英文项目初始化 changelog 用 | 英文 AI 协助变更记录字段 | changelog 记录标准变化时 |
| `plugins/project-guardian/assets/templates/HANDOVER.md` | 英文交接模板 | 英文项目初始化 handover 用 | First Read、How To Run、Project Map、New Developer First Day | 交接文档结构变化时 |
| `plugins/project-guardian/assets/templates/AGENTS.md` | 英文通用 Agent 规则模板 | 英文项目生成 `AGENTS.md` 用 | 英文 AI 必读和更新规则 | Agent 规则变化时 |
| `plugins/project-guardian/assets/templates/cursor-rules.mdc` | 英文 Cursor 新规则模板 | 英文项目生成 `.cursor/rules/project-guardian.mdc` 用 | Cursor 新版规则格式下的项目记忆要求 | Cursor 规则格式或项目规则变化时 |
| `plugins/project-guardian/assets/templates/cursorrules` | 英文 Cursor 旧规则模板 | 英文项目生成 `.cursorrules` 用 | 旧版 Cursor 可读的英文项目记忆规则 | 旧版 Cursor 兼容要求变化时 |
| `plugins/project-guardian/assets/templates/copilot-instructions.md` | 英文 Copilot 指令模板 | 英文项目生成 `.github/copilot-instructions.md` 用 | GitHub Copilot 的英文项目记忆指令 | Copilot 指令格式变化时 |
| `plugins/project-guardian/assets/templates/copilot-project-guardian.instructions.md` | 英文 Copilot 局部指令模板 | 英文项目生成 `.github/instructions/project-guardian.instructions.md` 用 | Project Guardian 专用 Copilot 英文规则 | Copilot 项目级 instructions 变化时 |
| `plugins/project-guardian/assets/templates/gitee-go-project-guardian.yml` | Gitee Go CI 模板 | `guardian install-ci` 生成流水线用 | Gitee Go 中运行 Project Guardian 检查的 YAML 模板 | CI 命令、默认分支、Node 版本或流水线结构变化时 |
| `plugins/project-guardian/assets/templates/zh-CN/PROJECT_CONTEXT.md` | 中文项目上下文模板 | 默认 `guardian init` 生成项目上下文 | 中文项目概览、技术栈、核心业务流程模板 | 中文上下文字段标准变化时 |
| `plugins/project-guardian/assets/templates/zh-CN/STATE.md` | 中文状态模板 | 默认初始化 `STATE.md` | 中文当前状态、下一步、已知问题模板 | 中文状态记录标准变化时 |
| `plugins/project-guardian/assets/templates/zh-CN/DECISIONS.md` | 中文决策模板 | 默认初始化 `DECISIONS.md` | 背景、决策、备选方案、影响文件、验证、风险等字段 | 中文决策字段变化时 |
| `plugins/project-guardian/assets/templates/zh-CN/AI_CHANGELOG.md` | 中文 AI 变更日志模板 | 默认初始化 `docs/AI_CHANGELOG.md` | 用户需求、AI 总结、变更文件、验证、风险等字段 | 中文 changelog 标准变化时 |
| `plugins/project-guardian/assets/templates/zh-CN/HANDOVER.md` | 中文交接模板 | 默认初始化 `docs/HANDOVER.md` | 优先阅读、如何运行、项目地图、新人第一天 | 中文交接结构变化时 |
| `plugins/project-guardian/assets/templates/zh-CN/AGENTS.md` | 中文通用 Agent 规则模板 | 默认生成 `AGENTS.md` | 中文 AI 必读、更新记忆、安全限制 | 中文 Agent 规则变化时 |
| `plugins/project-guardian/assets/templates/zh-CN/cursor-rules.mdc` | 中文 Cursor 新规则模板 | 默认生成 `.cursor/rules/project-guardian.mdc` | Cursor 新版中文项目记忆规则 | Cursor 中文适配变化时 |
| `plugins/project-guardian/assets/templates/zh-CN/cursorrules` | 中文 Cursor 旧规则模板 | 默认生成 `.cursorrules` | 旧版 Cursor 中文项目记忆规则 | 旧版 Cursor 中文兼容规则变化时 |
| `plugins/project-guardian/assets/templates/zh-CN/copilot-instructions.md` | 中文 Copilot 指令模板 | 默认生成 `.github/copilot-instructions.md` | Copilot 中文项目记忆指令 | Copilot 中文指令变化时 |
| `plugins/project-guardian/assets/templates/zh-CN/copilot-project-guardian.instructions.md` | 中文 Copilot 局部指令模板 | 默认生成 `.github/instructions/project-guardian.instructions.md` | Project Guardian 专用 Copilot 中文规则 | Copilot 项目级中文规则变化时 |

## 代码、配置、资源和测试文件

| 文件 | 干嘛的 | 为什么会有它 | 内容是什么 | 什么时候新增或修改 |
| --- | --- | --- | --- | --- |
| `package.json` | npm 包和脚本配置 | 让项目能作为 CLI package 使用并运行测试 | 包名、版本、license、bin、files、engines、scripts | CLI 入口、版本、发布范围、测试脚本变化时 |
| `project-guardian.config.json` | Project Guardian 配置 | 让项目无需改 CLI 源码就能调整规则 | 记忆文件路径、质量规则、hook、CI、security、language、adapters、ignore | 记忆路径、语言、适配器、CI 分支、扫描规则变化时 |
| `.agents/plugins/marketplace.json` | Codex 本地插件市场入口 | 让 Codex 能发现本仓库中的插件 | 插件 id、路径、显示顺序或市场元数据 | 插件路径、插件入口、市场展示信息变化时 |
| `plugins/project-guardian/.codex-plugin/plugin.json` | Codex 插件元数据 | Codex 插件标准需要它 | 插件名称、版本、描述、skill 入口等 | 插件版本、描述、能力、入口变化时 |
| `plugins/project-guardian/scripts/guardian.js` | CLI 主程序 | Project Guardian 的所有命令都从这里执行 | init、update、handover、check、doctor、validate-docs、query、decision、conflicts、hooks、CI、安全扫描等逻辑 | 新增命令、修改规则、修 bug、改变生成内容时 |
| `plugins/project-guardian/scripts/lib/adapters.js` | AI 工具适配器模块 | 把适配器解析从主 CLI 中拆出来，降低耦合 | adapter 名称解析、校验、模板到目标路径的映射 | 新增 Cursor/Copilot 之外的 AI 工具适配器时 |
| `tests/guardian.test.js` | 自动化测试 | 防止 CLI 行为回归 | 初始化、校验、check、hooks、CI、decision、query、scan-secrets、conflicts 等测试 | CLI 行为变化、修 bug、新增命令或模板规则变化时 |
| `.gitignore` | Git 忽略规则 | 避免提交临时文件、依赖或构建产物 | Git 忽略路径 | 新增构建产物、缓存目录、临时文件类型时 |
| `.guardianignore` | Project Guardian 忽略规则 | 让安全扫描或索引跳过特定路径 | Guardian 自己使用的忽略路径 | 示例密钥、测试数据或无需扫描目录需要排除时 |
| `plugins/project-guardian/assets/icon.svg` | 插件图标资源 | 插件市场或 UI 展示需要图标 | SVG 图标 | 品牌、视觉或插件展示资源变化时 |

## 当前哪些文件可能看起来重复

| 看起来重复的文件 | 实际原因 |
| --- | --- |
| `.cursorrules` 和 `.cursor/rules/project-guardian.mdc` | 前者兼容旧版 Cursor，后者适配新版 Cursor rules 目录。 |
| 英文模板和 `zh-CN` 中文模板 | 默认中文项目使用 `zh-CN`；英文团队使用 `guardian init --language en`。 |
| `DECISIONS.md` 和 `docs/decisions/*.md` | 前者是总索引和兼容入口；后者是一条决策一个文件，降低多人协作冲突。 |
| `AGENTS.md`、Cursor 规则、Copilot 指令 | 它们分别服务不同 AI 工具，不是给同一个工具重复读取。 |

## 新增或修改文件的判断标准

- 新增功能、命令、配置项：通常要改 `guardian.js`、测试、README、CLI 文档、标准文档，必要时改模板。
- 新增 AI 工具适配器：通常要改 `scripts/lib/adapters.js`、模板、测试、接入文档和标准文档。
- 修改项目记忆标准：通常要改模板、`STANDARD.md`、`validate-docs` 规则和测试。
- 修改使用流程：通常要改 `WORKFLOW.md`、`INTEGRATION.md`、`README.md`。
- 修改 CI 或 hook 行为：通常要改 `CLI_AND_CI.md`、`guardian.js`、CI 模板和测试。
- 每次 AI 协助的重要变更：通常要更新 `STATE.md` 和 `docs/AI_CHANGELOG.md`。
