---
applyTo: "**"
---

# Project Guardian

把仓库内项目记忆作为主要上下文来源，但使用预算友好的读取顺序：

- CLI 或 MCP 工具可用时，先运行 `guardian brief "任务或问题"`，或调用 `guardian_brief`。
- 始终读取 `memory/PROJECT_CONTEXT.md` 和 `memory/STATE.md`。
- 只有涉及重要业务、架构、依赖、数据模型、工作流、安全、兼容性或复审决策时，才读取 `memory/DECISIONS.md`。
- 只有需要最近历史、回归背景、风险或“为什么这样改”时，才读取 `memory/AI_CHANGELOG.md`。
- 只有交接、接手、上线或新人第一天指导时，才读取 `memory/HANDOVER.md`。
- 打开大型历史文件前，优先用 `guardian query "问题" --limit 3` 做定向查询。
- bug、回归、历史不清楚或高风险模块使用 `guardian brief "任务或问题" --mode deep`。
- 新人接手、交接、上线、审计、大重构或用户明确要求完整上下文时使用 `guardian brief "任务或问题" --mode full`。
- 预算友好读取只是起点，不是硬限制。证据不足、结果冲突或风险较高时，必须先升级读取再修改。

运行常见系统命令前，如果存在受控替代命令，优先运行 `guardian-cmd list`，再使用 `guardian-cmd <command-id> [args]`。这会把调用自动记录到 `.project-guardian/cmd-audit.jsonl`。

协助实现时，需要说明历史背景、影响文件、验证方式、风险和记忆更新。优先做小而安全的改动，提交前优先运行或建议运行 `guardian-cmd guardian-verify`；受控命令层不可用时运行或建议运行 `guardian verify`。
