# Run visual layer

日期：2026-06-03

## 决策记录

### 2026-06-03 - Add isolated Run visual layer

- 背景：Project Guardian 已经有 CLI、MCP 和规则适配器，但完全依赖命令行会让零基础用户或管理者查看状态、运行检查和查询项目记忆时有门槛。
- 决策：新增根目录 `Run/` 作为可选可视化运行层，保存本地 Web server、静态页面、样式、浏览器交互和说明文档。`Run/` 和核心插件代码隔离，但通过 package `files` 随插件一起发布。
- 备选方案：把可视化代码塞进 `plugins/project-guardian/scripts/guardian.js`；单独做独立仓库；立即做 Electron/VS Code 原生扩展。
- 影响文件/模块：`Run/*`、`package.json`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/*`。
- 关联变更：`npm run ui` 启动 `node Run/server.js`；Run server 默认监听 `127.0.0.1`，`/api/command` 只开放只读命令白名单，记忆读取和追加只允许核心记忆文件白名单并优先使用 `project-guardian.config.json` 路径；初始化必须输入 `RUN_INIT`，手动追加记忆必须输入 `APPEND_MEMORY`，后端拒绝疑似密钥内容，不提供任意 shell。
- 验证方式：运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check` 和本地 UI/API 冒烟测试；发布前补跑 `npm.cmd pack --dry-run` 确认 `Run/` 被打入包。
- 风险：当前 Web UI 没有内置认证，不能直接公网暴露；手动追加记忆只有基础敏感词拦截，不能替代 `guardian verify`、代码评审和人工安全审查；后续复杂写入类命令仍应增加预览和审计。
- 复审时间：2026-07-03。
- 后续动作：观察真实用户是否需要写入 diff 预览、操作日志、复审日历、记忆搜索或桌面窗口包装。
