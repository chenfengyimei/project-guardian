# Project Guardian 中文指令

本仓库使用 Project Guardian 项目记忆管理 AI 协助开发上下文。

在建议或修改项目代码前，请先查看这些文件：

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`
3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`
5. `memory/HANDOVER.md`

代码修改后：

- 更新 `memory/STATE.md`。
- 向 `memory/AI_CHANGELOG.md` 追加一条简洁记录。
- 如果引入重要架构、业务、依赖、数据模型、安全、工作流或兼容性决策，更新 `memory/DECISIONS.md`。
- 建议提交前运行 `guardian verify`。

每条长期记忆都应说明：改了什么、为什么改、影响文件、验证方式、敏感信息检查、风险和下一步。
不要把生产密码、真实 token、私钥、客户隐私或其他敏感信息写入项目记忆。
