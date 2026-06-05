# 2026-06-05 - 将 MCP 作为可被 Run 网页复用的系统模块

- 背景：用户进一步明确 MCP 不能只是显示在可视化控制台里，而是要和网页版同步，作为同一套系统；MCP 保持独立系统模块，网页负责与它互联、传入信息并使用工具能力。
- 决策：在 `plugins/project-guardian/scripts/lib/mcp.js` 中暴露共享 `executeMcpTool()`，让 stdio MCP server 和 Run 网页 `/api/mcp/call` 复用同一套工具定义、权限过滤、参数 schema 校验和执行队列；Run 页面新增 MCP 工具调用表单和输出区。
- 备选方案：浏览器直接启动 stdio MCP 长连接；继续只展示 MCP 状态；在 Run 后端重新实现一套类似 MCP 的工具路由。
- 影响文件/模块：`plugins/project-guardian/scripts/lib/mcp.js`、`Run/server.js`、`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`Run/README.md`、`tests/guardian.test.js` 和项目记忆文件。
- 关联变更：`/api/status` 继续提供 MCP 元数据和动态字段；`/api/mcp/call` 调用启用工具；写入类工具必须输入 `RUN_MCP`；服务端审计日志只记录工具名和参数名，不记录参数值。
- 验证方式：运行 MCP 共享执行器测试、Run API 测试、lint、全量测试、`guardian verify` 和 `git diff --check`。
- 风险：这是本地网页客户端复用 MCP 模块，不是公网权限系统；如果使用 `--host 0.0.0.0` 暴露 Run，需要额外登录鉴权、访问控制和正式审计。
- 复审时间：2026-07-05。
- 后续动作：观察真实使用中是否需要 MCP 工具分组、常用参数模板、外部 MCP 客户端连接诊断或更细粒度权限。

## 复审结果

- 复审状态：正常
- 复审完成时间：2026-06-05 17:24
- 复审人：AI 或人工复审者
- 复审结论：Still valid - executeMcpTool() shared between stdio MCP server and Run /api/mcp/call, same tool definitions/permissions/schema validation/execution queue, Run UI has tool call form and output area with RUN_MCP confirmation
- 验证方式：Verified: mcp.js exports executeMcpTool(), Run/server.js imports and calls it for /api/mcp/call, audit logs tool name only (no param values), WRITE_TOOL_NAMES gating works in both paths, lint/test/verify pass
- 后续复审：无需继续复审
