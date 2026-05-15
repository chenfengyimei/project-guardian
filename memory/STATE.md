# 项目状态

最后更新：2026-05-15

## 当前状态

- Project Guardian 是一个本地 Codex 插件加 Node.js CLI，用于为 AI 辅助编程项目创建和维护可持续的项目记忆。
- 当前开发阶段已经把工具从模板助手强化为可复用的工作流守卫，具备配置、校验、安全扫描、统一验证、冲突提示、决策文件和测试。
- CLI 已经提供 package `bin` 入口，团队可以安装为 `guardian`；仍然保留旧的随项目提交脚本路径，方便把插件源码放在项目内的团队使用。
- 官方 Git 安装源已经确认为 `git+https://gitee.com/chenfengloveyuri/project-guardian.git`。
- 工具已经包含 AI 适配层，支持通用/Codex 规则、Cursor 规则和 GitHub Copilot 指令文件。
- 适配器解析已经拆分到 `plugins/project-guardian/scripts/lib/adapters.js`，降低 `guardian.js` 中的耦合。
- CLI 现在默认生成中文项目记忆模板，也可以通过 `guardian init --language en` 生成英文模板。
- CLI 默认项目记忆路径已经集中到根目录 `memory/`，新项目运行 `guardian init` 会创建 `memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md` 和 `memory/HANDOVER.md`。
- 本仓库已经自举使用自己的 Project Guardian 记忆文件，后续变更可以按它推荐给其它团队的同一套工作流审查。

## 已完成

- 创建了插件结构，包括 `.codex-plugin/plugin.json`、skill 元数据、模板、CLI 脚本、根目录 README、工作流文档、规范文档、接入文档和零基础教程。
- 实现了初始命令：`init`、`update`、`handover`、`check`、`doctor`、`validate-docs`、`query`、`install-hooks` 和 `install-ci`。
- 加入了更严格的路线图要求，覆盖仓库完整性、默认质量闸门、决策质量、配置、安全扫描、CI 行为和自动化测试。
- 已经对本仓库运行自举初始化，并填入真实记忆内容，而不是保留空模板。
- 新增 `package.json` 和 `tests/` 下的 Node 测试套件，覆盖初始化、校验、check 失败、hooks、CI 生成、决策记录、安全扫描、查询和合并冲突提示。
- 更新了面向用户的文档，让 `guardian verify` 成为提交前和 CI 中推荐使用的默认命令。
- 新增 `guardian` / `project-guardian` package 二进制入口、`guardian --version`、可配置适配器生成，以及 Cursor 和 GitHub Copilot 模板。
- 新增独立适配器模块，并补充 `guardian init --adapter ...` 会把所选适配器写入新配置的回归测试。
- 新增 `explaiw/PROJECT_FILES_EXPLANATION.md`，集中说明当前所有文档、代码、配置、资源和测试文件的职责。
- 已将本仓库自举项目记忆从根目录和 `docs/` 迁移到 `memory/`，并同步默认配置、CLI、AI 规则、插件文档和测试。

## 进行中

- 正在验证 `memory/` 目录迁移后的 CLI 初始化、检查、查询、交接、决策和安全扫描流程。

## 下一步

1. 运行 `npm.cmd run lint`、`npm.cmd test` 和 `node plugins/project-guardian/scripts/guardian.js verify`。
2. 在临时目录运行 `guardian init` 冒烟测试，确认新项目不再把核心记忆创建到根目录。
3. 提交到 Gitee 前，复查是否仍有旧的根目录或 `docs/` 记忆路径引用。

## 已知问题

| 问题 | 影响 | 负责人 | 备注 |
| --- | --- | --- | --- |
| 查询仍是关键词检索，不是语义检索 | 不同表达方式的问题可能搜不到答案 | 维护者 | RAG 和向量检索规划在后续迭代 |
| 决策记录会同时写入索引和单独决策文件 | 文档输出略多 | 维护者 | 这是为了兼容现有 `memory/DECISIONS.md`，同时降低未来协作冲突 |
| Gitee Go 语法可能因账号模板不同而变化 | 团队可能需要调整生成的流水线细节 | 仓库负责人 | CLI 保持工作流小而可配置 |
| 已有项目保留旧配置时仍会写旧路径 | 旧项目不会自动迁移到 `memory/` | 维护者 | 本次保持尊重显式配置；旧项目迁移时应同步更新 `project-guardian.config.json` |

## 风险区域

- `plugins/project-guardian/scripts/guardian.js` 是主执行文件，协调 Git、文档、配置、hooks、CI 和扫描，修改时需要重点测试。
- 文档校验既要严格阻止空模板，又不能严格到让新团队难以逐步接入。
- 安全扫描必须隐藏敏感值，也要避免在普通文档中产生过多误报。
- hooks 和 CI 应保持追加式或明确生成，不能覆盖团队已有自动化。

## 最新 AI 协助变更

- 任务：将 Project Guardian 项目记忆集中迁移到根目录 `memory/`。
- 总结：移动本仓库自举记忆，修改 CLI 默认配置和项目配置，让新项目 `guardian init` 默认创建 `memory/` 下的记忆文件，并同步 AI 规则、模板说明、文档和测试。
- 文件：`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md`、`memory/decisions/*`、`project-guardian.config.json`、`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、AI 规则模板和 Project Guardian 文档。
- 验证：运行 `doctor`、`validate-docs`、`lint`、`test`、`verify` 和临时目录 `init` 冒烟测试。
- 后续：如旧项目需要自动迁移，可在后续增加显式 `guardian migrate-memory` 命令。
