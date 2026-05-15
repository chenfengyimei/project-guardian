---
trigger: always_on
description: Project Guardian 中文项目记忆规则
---

# Project Guardian

修改代码或回答项目相关问题前，先阅读：

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`
3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`
5. `memory/HANDOVER.md`

完成代码修改后：

- 更新 `memory/STATE.md`，写清当前状态、已知问题、下一步和最新变更。
- 向 `memory/AI_CHANGELOG.md` 追加一条简洁记录。
- 如果引入重要业务、架构、依赖、数据模型、工作流、安全或兼容性决策，更新 `memory/DECISIONS.md`。
- CLI 可用时，在交接或提交前运行 `guardian verify`。

不要把生产密码、真实 token、私钥、客户隐私或其他敏感信息写入项目记忆。
