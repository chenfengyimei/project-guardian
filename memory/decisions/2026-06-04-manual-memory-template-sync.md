# 共享手动记忆模板给 CLI 和 Run 控制台

日期：2026-06-04

## 决策记录

### 2026-06-04 - 共享手动记忆模板给 CLI 和 Run 控制台

- 背景：Run 控制台已经提供手动追加记忆，但如果模板、敏感词拦截和追加格式只存在于网页后端，就会让 CLI 与控制台能力分叉；同时，命令操作模块把复杂参数字段直接放在卡片里会让零基础用户难以填写。
- 决策：新增 `plugins/project-guardian/scripts/lib/manual-memory.js`，集中维护核心记忆白名单、追加记忆模板、字段校验、基础敏感词拦截和追加格式；Run 控制台从该模块读取模板并用弹窗收集命令参数；CLI 新增 `guardian append-memory` 使用同一套模板。
- 备选方案：继续让 Run 后端单独维护追加记忆逻辑；只保留自由文本追加；把所有手动补充都要求用户使用 `guardian update` 或直接编辑 Markdown。
- 影响文件/模块：`plugins/project-guardian/scripts/lib/manual-memory.js`、`plugins/project-guardian/scripts/guardian.js`、`Run/server.js`、`Run/public/app.js`、`Run/public/index.html`、`Run/public/styles.css`、`tests/guardian.test.js`、Project Guardian 文档和项目记忆文件。
- 关联变更：`guardian append-memory --templates` 可查看模板；Run `/api/status` 暴露 `memoryAppendTemplates`；命令操作模块对写入类或带参数命令使用弹窗输入。
- 验证方式：运行 `npm.cmd run lint`、`npm.cmd test`、`guardian append-memory` 回归测试、Run API 模板化追加测试和最终 `guardian verify`。
- 风险：模板字段可能无法覆盖所有团队表达习惯；基础敏感词拦截不是完整 DLP；Run 仍无内置鉴权，不能公网暴露。
- 复审时间：2026-07-04。
- 后续动作：观察真实用户是否需要更多模板、模板搜索、写入前 diff 预览、操作审计或 MCP 追加记忆工具。
