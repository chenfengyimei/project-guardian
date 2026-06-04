# 扩展 Run 命令操作为受控 CLI 命令目录

日期：2026-06-03

## 决策记录

### 2026-06-03 - 扩展 Run 命令操作为受控 CLI 命令目录

- 背景：Run 原本只暴露少量检查命令。用户需要在网页里看见 Guardian CLI 的完整能力，但 Web server 不能变成任意 shell。
- 决策：在 `Run/server.js` 新增后端固定命令目录，并把命令分为 `read`、`write`、`linked` 和 `terminal`。只读命令可直接运行。写入类命令必须输入 `RUN_COMMAND`。`init`、`brief` 和 `query` 引导到专用 UI 模块。`mcp` 仍只适合在终端或 AI IDE 配置中启动。
- 备选方案：继续只保留少量只读按钮；增加自由命令输入框；把全部写入命令继续完全留给 CLI/MCP。
- 影响文件/模块：`Run/server.js`、`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`Run/README.md`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`tests/guardian.test.js`。
- 关联变更：知识查询模块现在拥有独立输出记录。侧边栏可以平滑收起和展开。`decision add` 暴露完整结构化决策字段。`install-adapters` 接受逗号分隔适配器列表。
- 验证方式：运行 `node --check`、`npm.cmd run lint`、`npm.cmd test`、`guardian verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、本地 UI/API 冒烟和 `npm.cmd pack --dry-run`。
- 风险：`RUN_COMMAND` 能降低误点风险，但不是登录认证或权限系统。Run 除非由团队额外加认证、访问控制、反向代理保护和审计日志，否则仍应只在本机使用。写入类命令仍需要 Git diff 审查和 `guardian verify`。
- 复审时间：2026-07-03。
- 后续动作：观察真实使用情况，再决定是否需要命令搜索、分组折叠、写入前预览、diff 预览或操作审计日志。
