---
name: Project Guardian
alwaysApply: true
---

# Project Guardian

请把 Project Guardian 项目记忆作为本仓库事实来源。

回答项目问题或修改代码前，使用预算友好的项目记忆读取方式：

1. 如果 CLI 或 MCP 工具可用，先运行 `guardian brief "任务或问题"`，或调用 `guardian_brief`。
2. 始终读取 `memory/PROJECT_CONTEXT.md` 和 `memory/STATE.md`。
3. 只有涉及重要业务、架构、依赖、数据模型、工作流、安全、兼容性或复审决策时，才读取 `memory/DECISIONS.md`。
4. 只有需要最近历史、回归背景、风险或“为什么这样改”时，才读取 `memory/AI_CHANGELOG.md`。
5. 只有交接、接手、上线或新人第一天指导时，才读取 `memory/HANDOVER.md`。
6. 打开大型历史文件前，优先用 `guardian query "问题" --limit 3` 做定向查询。
7. bug、回归、历史不清楚或高风险模块使用 `guardian brief "任务或问题" --mode deep`；新人接手、交接、上线、审计、大重构或用户明确要求完整上下文时使用 `--mode full`。
8. 预算友好读取只是起点，不是硬限制。证据不足、结果冲突或风险较高时，必须先升级读取再修改。

代码修改后，更新 `memory/STATE.md` 和 `memory/AI_CHANGELOG.md`。如果引入重要架构、流程、依赖、安全或兼容性决策，补充 `memory/DECISIONS.md`。

交接、评审或提交前优先运行 `guardian verify`。不要把密钥或客户隐私写入项目记忆。
