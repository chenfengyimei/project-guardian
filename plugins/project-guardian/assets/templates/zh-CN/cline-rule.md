# Project Guardian

本项目使用 Project Guardian 项目记忆。

修改代码或回答项目相关问题前，使用预算友好的项目记忆读取方式：

1. 如果 CLI 或 MCP 工具可用，先运行 `guardian brief "任务或问题"`，或调用 `guardian_brief`。
2. 始终读取 `memory/PROJECT_CONTEXT.md` 和 `memory/STATE.md`。
3. 只有涉及重要业务、架构、依赖、数据模型、工作流、安全、兼容性或复审决策时，才读取 `memory/DECISIONS.md`。
4. 只有需要最近历史、回归背景、风险或“为什么这样改”时，才读取 `memory/AI_CHANGELOG.md`。
5. 只有交接、接手、上线或新人第一天指导时，才读取 `memory/HANDOVER.md`。
6. 打开大型历史文件前，优先用 `guardian query "问题" --limit 3` 做定向查询。
7. bug、回归、历史不清楚或高风险模块使用 `guardian brief "任务或问题" --mode deep`；新人接手、交接、上线、审计、大重构或用户明确要求完整上下文时使用 `--mode full`。
8. 预算友好读取只是起点，不是硬限制。证据不足、结果冲突或风险较高时，必须先升级读取再修改。

运行常见系统命令前，如果存在受控替代命令，优先运行 `guardian-cmd list`，再使用 `guardian-cmd <command-id> [args]`。这会把调用自动记录到 `.project-guardian/cmd-audit.jsonl`。只有没有受控替代命令时，才临时使用原始终端命令。

完成代码修改后：

- 更新 `memory/STATE.md`。
- 向 `memory/AI_CHANGELOG.md` 追加一条简洁记录。
- 对重要决策更新 `memory/DECISIONS.md`。
- 受控命令层可用时，在结束前运行 `guardian-cmd guardian-verify`；否则运行 `guardian verify`。

每条长期记忆都应说明：改了什么、为什么改、影响文件、验证方式、敏感信息检查、风险和下一步。
不要把密钥或客户隐私写入项目记忆。
