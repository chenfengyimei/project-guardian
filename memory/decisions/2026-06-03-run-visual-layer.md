# Run visual layer

日期：2026-06-03

## 决策记录

### 2026-06-03 - Add isolated Run visual layer

- 背景：Project Guardian 已经有 CLI、MCP 和规则适配器，但完全依赖命令行会让零基础用户或管理者查看状态、运行检查和查询项目记忆时有门槛。
- 决策：新增根目录 `Run/` 作为可选可视化运行层，保存本地 Web server、静态页面、样式、浏览器交互和说明文档。`Run/` 和核心插件代码隔离，但通过 package `files` 随插件一起发布。
- 备选方案：把可视化代码塞进 `plugins/project-guardian/scripts/guardian.js`；单独做独立仓库；立即做 Electron/VS Code 原生扩展。
- 影响文件/模块：`Run/*`、`package.json`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/*`。
- 关联变更：`npm run ui` 启动 `node Run/server.js`；Run server 默认监听 `127.0.0.1`，只开放只读命令白名单，使用固定参数调用现有 Project Guardian CLI。
- 验证方式：运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check` 和本地 UI/API 冒烟测试；发布前补跑 `npm.cmd pack --dry-run` 确认 `Run/` 被打入包。
- 风险：当前 Web UI 没有内置认证，不能直接公网暴露；后续写入类命令必须增加确认、预览和审计。
- 复审时间：2026-07-03。
- 后续动作：观察真实用户是否需要写入操作、复审日历、记忆预览或桌面窗口包装。
