# Project Guardian

本项目使用 Project Guardian 项目记忆。

修改代码或回答项目相关问题前，先阅读：

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`
3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`
5. `memory/HANDOVER.md`

完成代码修改后：

- 更新 `memory/STATE.md`。
- 向 `memory/AI_CHANGELOG.md` 追加一条简洁记录。
- 对重要决策更新 `memory/DECISIONS.md`。
- CLI 可用时，在结束前运行 `guardian verify`。

每条长期记忆都应说明：改了什么、为什么改、影响文件、验证方式、敏感信息检查、风险和下一步。
不要把密钥或客户隐私写入项目记忆。
