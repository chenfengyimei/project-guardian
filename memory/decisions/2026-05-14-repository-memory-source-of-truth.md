# 仓库内项目记忆作为交接事实来源

日期: 2026-05-14

## 决策记录

### 2026-05-14 - 仓库内项目记忆作为交接事实来源

- 背景：AI 辅助编程上下文会随着聊天记录、实习生或本地 IDE 会话丢失。
- 决策：把可持续项目上下文保存在仓库 Markdown 文件中，并通过 `check`、`validate-docs`、`scan-secrets` 和统一的 `verify` 命令强制维护。
- 备选方案：依赖聊天导出、要求开发者手写外部交接文档，或等平台化以后再做质量闸门。
- 影响文件/模块：`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md`、`project-guardian.config.json`。
- 关联变更：本仓库运行 self-init，Project Guardian 自身遵循它要求目标项目使用的同一套记忆工作流。
- 验证方式：填好的记忆文件必须通过 `guardian validate-docs`；代码变更缺少记忆更新时，`guardian check` 必须失败。
- 风险：如果模板解释不够清楚，过严校验可能拖慢非专业开发者的接入。
- 复审时间：未安排。
- 后续动作：保持零基础文档实用，并持续增加能区分空模板和真实记忆的测试。
