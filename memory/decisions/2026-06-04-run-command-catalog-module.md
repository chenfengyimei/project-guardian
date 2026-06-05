# 拆分 Run 命令目录模块

日期: 2026-06-04

## 决策记录

### 2026-06-04 - 拆分 Run 命令目录模块

- 背景：`Run/server.js` 同时负责本地 HTTP server、静态文件服务、API 路由、CLI 子进程执行、固定命令目录、写入参数构造和字段校验，后续新增命令时容易让服务端主流程继续变大。
- 决策：新增 `Run/lib/commands.js`，把 Run 控制台的 CLI 命令定义、公开给前端的命令描述、写入类命令参数构造、适配器列表校验和复审路径校验集中到独立模块；`Run/server.js` 只引用该模块并保留 HTTP/API/执行边界。
- 备选方案：继续把命令目录放在 `Run/server.js`；把 Run 命令目录并入核心 `guardian.js`；立即为每个命令做单独后端文件。
- 影响文件/模块：`Run/lib/commands.js`、`Run/server.js`、`tests/guardian.test.js`、`package.json`、`Run/README.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、项目记忆文件。
- 关联变更：`npm run lint` 纳入新模块；测试直接覆盖命令参数构造、非法适配器拒绝、越界复审路径拒绝和公开命令信息。
- 验证方式：运行 `npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify` 和 `git diff --check`。
- 风险：Run 命令目录仍然是固定白名单，不是权限系统；写入类命令仍会修改目标项目文件，必须继续依赖确认词、Git diff、代码评审和 `guardian verify`。
- 复审时间：2026-07-04。
- 后续动作：真实使用后观察是否需要命令搜索、写入前 diff 预览、操作日志，或进一步把 Run API 路由拆成独立模块。

## 复审结果

- 复审状态：正常
- 复审完成时间：2026-06-05 17:24
- 复审人：AI 或人工复审者
- 复审结论：Still valid - commands.js split from server.js, centralized command definitions/param building/adapter validation/review path validation, server.js imports and delegates cleanly
- 验证方式：Verified: Run/lib/commands.js exists with full command catalog (read/write/linked/terminal), Run/server.js imports from ./lib/commands, lint/test/verify pass
- 后续复审：无需继续复审
