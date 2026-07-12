# Run visual layer

日期�?026-06-03

## 决策记录

### 2026-06-03 - Add isolated Run visual layer

- 背景：Project Guardian 已经�?CLI、MCP 和规则适配器，但完全依赖命令行会让零基础用户或管理者查看状态、运行检查和查询项目记忆时有门槛�?
- 决策：新增根目录 `Run/` 作为可选可视化运行层，保存本地 Web server、静态页面、样式、浏览器交互和说明文档。`Run/` 和核心插件代码隔离，但通过 package `files` 随插件一起发布�?
- 备选方案：把可视化代码塞进 `plugins/project-guardian/scripts/guardian.js`；单独做独立仓库；立即做 Electron/VS Code 原生扩展�?
- 影响文件/模块：`Run/*`、`package.json`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/*`�?
- 关联变更：`npm run ui` 启动 `node Run/server.js`；Run server 默认监听 `127.0.0.1`，`/api/command` 只开放只读命令白名单，记忆读取和追加只允许核心记忆文件白名单并优先使�?`project-guardian.config.json` 路径；前端使用侧边栏切换功能页，首页只显示状态概览，核心记忆预览用轻�?Markdown 渲染标题、列表、代码块和表格；初始化必须输�?`RUN_INIT`，手动追加记忆必须输�?`APPEND_MEMORY`，后端拒绝疑似密钥内容，不提供任�?shell�?
- 验证方式：运�?`npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check` 和本�?UI/API 冒烟测试；发布前补跑 `npm.cmd pack --dry-run` 确认 `Run/` 被打入包�?
- 风险：当�?Web UI 没有内置认证，不能直接公网暴露；手动追加记忆只有基础敏感词拦截，不能替代 `guardian verify`、代码评审和人工安全审查；后续复杂写入类命令仍应增加预览和审计�?
- 复审时间�?026-07-03�?
- 后续动作：观察真实用户是否需要写�?diff 预览、操作日志、复审日历、记忆搜索或桌面窗口包装�?

## 复审结果

- 复审状态：正常
- 复审完成时间�?026-06-05 17:23
- 复审人：AI 或人工复审�?
- 复审结论：Still valid - Run/ directory fully implemented with server, web UI, command catalog, side nav, memory preview, scope init/append/command gating via fixed keywords, default bind 127.0.0.1, npm run ui entry
- 验证方式：Verified: Run/ directory structure intact, server.js with DEFAULT_HOST=127.0.0.1, RUN_INIT/APPEND_MEMORY/RUN_COMMAND gating, /api/command whitelist, /api/status, lint/verify pass, npm run ui available
- 后续复审：无需继续复审
