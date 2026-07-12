# Project Guardian 保持零服务 Node.js CLI 形态

日期: 2026-05-14

## 决策记录

### 2026-05-14 - Project Guardian 保持零服务 Node.js CLI 形态

- 背景：目标用户是小团队和实习生，需要可靠工作流，但不应要求他们运维数据库、Web 服务或内部平台。
- 决策：默认实现保持为本地 Node.js CLI，只使用标准库模块、Git 元数据、Markdown 记忆文件，以及可选 Git hook 或 Gitee CI 集成。
- 备选方案：构建 Web 平台、强制使用向量数据库、只发布 Codex skill，或让每个命令都依赖托管 AI API。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/*`、`plugins/project-guardian/docs/*`。
- 关联变更：P0 和 P2 路线图引入 `guardian verify`、配置加载、更强文档校验和安全扫描，同时保留零配置本地使用方式。
- 验证方式：运行 `node --check plugins/project-guardian/scripts/guardian.js`、Windows PowerShell 下的 `npm.cmd test`，以及 `node plugins/project-guardian/scripts/guardian.js verify`。
- 风险：本地关键词查询不如 RAG 强大；工具必须保持简单，同时为未来检索集成保留清晰扩展点。
- 复审时间：未安排。
- 后续动作：本地工作流稳定并经过测试后，再重新评估 package 发布和可选向量搜索。
