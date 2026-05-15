# AI Agent 规则

本项目使用 Project Guardian 项目记忆。

在修改代码或回答项目相关问题前，先阅读：

1. `PROJECT_CONTEXT.md`
2. `STATE.md`
3. `DECISIONS.md`
4. `docs/AI_CHANGELOG.md`
5. `docs/HANDOVER.md`

完成代码修改后：

- 更新 `STATE.md`，写清当前状态、已知问题、下一步和最新变更。
- 向 `docs/AI_CHANGELOG.md` 追加一条简洁记录。
- 如果引入重要业务、架构、依赖、数据模型、工作流、安全或兼容性决策，更新 `DECISIONS.md`。
- 准备交接、接手、上线或阶段总结时刷新 `docs/HANDOVER.md`。
- CLI 可用时，在结束前运行 `guardian verify`。

每次 AI 协助变更都必须记录：改了什么、为什么改、验证了什么、下一个开发者要注意什么。
不要把生产密码、真实 token、客户隐私或其他敏感信息写入项目记忆。
