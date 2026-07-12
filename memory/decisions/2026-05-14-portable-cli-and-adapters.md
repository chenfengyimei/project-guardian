# 暴露可移植 CLI 和 AI 工具适配层

日期: 2026-05-14

## 决策记录

### 2026-05-14 - 暴露可移植 CLI 和 AI 工具适配层

- 背景：通过长相对 Node 路径调用 CLI 不利于使用；只支持 Codex 规则会限制 Cursor、Copilot 或混合 AI 工具团队的价值。
- 决策：为 `guardian` 和 `project-guardian` 增加 package `bin` 入口，保留随项目提交脚本路径作为 fallback，并通过适配器生成各 AI 工具规则。外部 CLI 场景写入可移植 `guardian ...` 命令，项目内源码场景才写本地脚本路径。
- 备选方案：只保留 Codex 插件元数据、要求每个项目都内置插件源码，或为每个 AI 工具创建独立插件。
- 影响文件/模块：`package.json`、`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/adapters.js`、`plugins/project-guardian/assets/templates/*`、README 和插件文档。
- 关联变更：`guardian init --adapter all` 与 `guardian install-adapters` 创建工具专用规则文件，但不改变核心记忆文件。
- 验证方式：CLI 语法检查、Node 测试套件、version/help 冒烟测试、package scripts 回归测试和 package dry-run。
- 风险：全局 CLI 依赖实际 npm 或 Git 安装源；AI 工具的规则格式可能演进，需要定期复核。
- 复审时间：未安排。
- 后续动作：只有团队需要 npm 原生发布时再评估 npm registry 发布。
