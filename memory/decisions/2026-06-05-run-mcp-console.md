# 2026-06-05 - 在 Run 控制台展示 MCP 状态但不直接启动 MCP 服务

- 背景：用户希望把 MCP 系统写入可视化控制台；现有 Run 控制台已经有受控 CLI 命令目录，但 `guardian mcp` 是 stdio 长连接服务，不适合作为普通 `/api/command` 按钮直接启动。
- 决策：新增 Run `MCP 系统` 页面和 `/api/status` MCP 摘要，只展示启动命令、协议版本、只读状态、`allowedTools` 和工具启用状态；继续要求用户在终端或 AI IDE 配置中启动 `guardian mcp`。
- 备选方案：在网页按钮里直接启动 `guardian mcp`；把 MCP 当作普通 CLI 命令走 `/api/command`；暂时只保留命令操作页里的终端提示。
- 影响文件/模块：`plugins/project-guardian/scripts/lib/mcp.js`、`Run/server.js`、`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`Run/README.md`、`tests/guardian.test.js` 和项目记忆文件。
- 关联变更：`mcp.js` 新增 `publicMcpStatus()`；Run `/api/status` 新增 `mcp` 和 `features.mcpStatus`；前端新增 MCP 页面与工具卡片；测试覆盖 MCP 状态摘要和 Run API/page 节点。
- 验证方式：运行 `npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify` 和 `git diff --check`。
- 风险：控制台显示的是当前 Run 进程读取到的配置和环境变量，真实 AI IDE 启动 MCP 时仍可能使用不同工作目录或环境；页面不是 MCP 客户端调试器，不会验证 IDE 侧连接是否成功。
- 复审时间：2026-07-05。
- 后续动作：真实接入 Cursor、Cline、Continue、Claude Code 或 Gemini 等 MCP 客户端后，观察是否需要增加 IDE 配置示例、MCP 连接检查或独立调试器。
