# Add MCP tool gating before deeper IDE integrations

日期: 2026-06-02

## 决策记录

### 2026-06-02 - Add MCP tool gating before deeper IDE integrations

- 背景：`guardian mcp` 已经能让 AI IDE 直接调用本地 Project Guardian 命令，其中 `guardian_update`、`guardian_decision_add` 和 `guardian_handover` 会写入项目记忆。
- 决策：新增项目级 MCP 工具限制，默认保持全部工具可用；通过 `mcp.readOnly` 隐藏并阻止写入类工具，通过 `mcp.allowedTools` 只暴露指定工具，并允许 `PROJECT_GUARDIAN_MCP_READ_ONLY=1` 临时强制只读。
- 备选方案：默认只读；为 MCP 做完整身份认证；继续只依赖文档提醒和代码评审。
- 影响文件/模块：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`、`project-guardian.config.json`、`tests/guardian.test.js`、Project Guardian 文档和记忆文件。
- 关联变更：MCP `tools/list` 会按配置返回工具，`tools/call` 会拒绝被禁用工具；`doctor` 会校验 `mcp.readOnly` 和 `mcp.allowedTools`。
- 验证方式：运行 lint、Node 测试套件、MCP 只读/允许列表回归测试、完整 `guardian verify` 和 MCP 只读冒烟测试。
- 风险：这是工具过滤，不是身份认证或逐次审批；接入高风险环境仍要保留仓库权限、Git 权限、代码评审和安全扫描。
- 复审时间：2026-07-02。
- 后续动作：真实 MCP 客户端接入后，评估是否需要 prompts/resources、权限细化、审计日志或官方 SDK 集成。
