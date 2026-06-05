# 2026-06-04 - 拆分 CLI 核心模块并增强 Run 写入前可见性

- 背景：`plugins/project-guardian/scripts/guardian.js` 仍然偏大，配置加载、文档校验、query/brief 检索等逻辑和命令编排混在一起；同时 Run 控制台的命令数量增加后，用户需要更快查找命令，并在执行写入类命令前看见当前 Git 改动状态。
- 决策：新增 `plugins/project-guardian/scripts/lib/config.js`、`plugins/project-guardian/scripts/lib/doc-validation.js` 和 `plugins/project-guardian/scripts/lib/knowledge.js`，分别承接配置默认值/加载/校验、核心记忆文档质量检查、query/brief 检索与读取计划格式化；Run 控制台新增命令搜索、短操作日志和 `/api/diff-preview` 固定只读 Git 预览。
- 备选方案：继续把逻辑留在 `guardian.js`；一次性把所有 CLI 命令拆成很多文件；Run 控制台开放自定义 Git 命令或任意 shell 预览。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/config.js`、`plugins/project-guardian/scripts/lib/doc-validation.js`、`plugins/project-guardian/scripts/lib/knowledge.js`、`Run/server.js`、`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`Run/README.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`tests/guardian.test.js` 和项目记忆文件。
- 关联变更：`package.json` 的 lint 纳入新模块；测试直接覆盖配置模块、文档校验模块、knowledge 模块、Run 命令搜索、Run diff preview API 和页面节点；Run diff preview 只执行固定 `git status --short`、`git diff --stat` 和 `git diff --cached --stat`。
- 验证方式：运行 `npm.cmd run lint`、`npm.cmd test`、`guardian verify`、安全审计、diff 空白检查和 Run UI 浏览器冒烟。
- 风险：`guardian.js` 仍然保留 Git、handover、decision、reviews、安全扫描和命令编排，后续还可以继续小步拆分；Run 操作日志保存在浏览器本地，只是辅助查看，不能替代 `AI_CHANGELOG.md`、Git 历史或正式审计；diff preview 是只读摘要，不展示完整补丁。
- 复审时间：2026-07-04。
- 后续动作：观察真实使用中是否需要把 Run API 路由继续拆成模块、为 diff preview 增加完整补丁查看或导出操作日志。

## 复审结果

- 复审状态：正常
- 复审完成时间：2026-06-05 17:23
- 复审人：AI 或人工复审者
- 复审结论：Still valid - config.js/doc-validation.js/knowledge.js split from guardian.js, Run command search + short ops log + /api/diff-preview with fixed git status/diff--stat/cached--stat all implemented
- 验证方式：Verified: 3 new lib modules exist and imported in guardian.js, diffPreviewPayload does fixed git status/diff--stat/cached--stat, Run command search works, lint/test/verify pass
- 后续复审：无需继续复审
