# Decisions

This file records decisions that future developers and AI agents must understand.

## Active Decisions

### 2026-05-14 - Keep Project Guardian as a zero-service Node.js CLI

- Context: The target users are small teams and interns who need a reliable workflow without operating a database, web service, or internal platform.
- Decision: Keep the default implementation as a local Node.js CLI using only standard library modules, Git metadata, Markdown memory files, and optional Git hook or Gitee CI integration.
- Alternatives considered: Build a web platform, require a vector database, publish only a Codex skill, or depend on a hosted AI API for every command.
- Affected files/modules: `plugins/project-guardian/scripts/guardian.js`, `plugins/project-guardian/assets/templates/*`, `plugins/project-guardian/docs/*`.
- Related change: P0 and P2 roadmap work introduced `guardian verify`, config loading, stronger validation, and security scanning while preserving zero-config local usage.
- Verification: Run `node --check plugins/project-guardian/scripts/guardian.js`, `npm.cmd test` on Windows PowerShell, and `node plugins/project-guardian/scripts/guardian.js verify`.
- Risks: A local keyword query is less powerful than RAG; the tool must stay simple while leaving clean extension points for future retrieval integrations.
- Review after: 2026-06-14.
- Follow-up: Revisit package publishing and optional vector search after the local workflow is stable and tested.

### 2026-05-14 - Treat repository memory as the source of handover truth

- Context: AI-assisted coding context disappears when conversations, interns, or local IDE sessions are lost.
- Decision: Store durable project context in root Markdown files and enforce updates through `check`, `validate-docs`, `scan-secrets`, and the unified `verify` command.
- Alternatives considered: Rely on chat exports, require developers to manually write external handover docs, or postpone quality gates until a platform exists.
- Affected files/modules: `PROJECT_CONTEXT.md`, `STATE.md`, `DECISIONS.md`, `docs/AI_CHANGELOG.md`, `docs/HANDOVER.md`, `project-guardian.config.json`.
- Related change: Self-init was run in this repository so Project Guardian follows the same memory workflow it asks target projects to use.
- Verification: `guardian validate-docs` must pass on filled memory files, and `guardian check` must fail when code changes omit memory updates.
- Risks: Overly strict validation can slow adoption if templates are not explained clearly to non-technical users.
- Review after: 2026-06-14.
- Follow-up: Keep beginner docs practical and add tests that distinguish empty templates from real memory.

### 2026-05-14 - Expose a portable CLI and AI tool adapter layer

- Context: Calling the CLI through `node plugins/project-guardian/scripts/guardian.js` made adoption feel like a raw script, and Codex-only rules limited usefulness for teams using Cursor, Copilot, or mixed AI tooling.
- Decision: Add package `bin` entries for `guardian` and `project-guardian`, keep the vendored script path as a fallback, and introduce adapter templates for generic/Codex, Cursor, and Copilot rule files.
- Alternatives considered: Keep only Codex plugin metadata, require every project to vendor the plugin, or create separate plugins for each AI tool.
- Affected files/modules: `package.json`, `plugins/project-guardian/scripts/guardian.js`, `plugins/project-guardian/scripts/lib/adapters.js`, `plugins/project-guardian/assets/templates/*`, `README.md`, and `plugins/project-guardian/docs/*`.
- Related change: `guardian init --adapter all` and `guardian install-adapters --adapter cursor,copilot` can create tool-specific rule files without changing core memory files. Adapter parsing and template mapping live in `scripts/lib/adapters.js` so new AI tool rules do not have to be wired through the main CLI body.
- Verification: CLI syntax checks, Node test suite, version/help smoke tests, and package dry-run verification.
- Risks: The global CLI still needs an actual npm or Git installation source in each company environment; Copilot and Cursor rule formats may evolve and need periodic review.
- Review after: 2026-06-14.
- Follow-up: Official Git install source is `git+https://gitee.com/chenfengloveyuri/project-guardian.git`; revisit npm registry publishing only if the team needs npm-native releases later.

### 2026-05-14 - Use per-decision files

- Context: Multiple maintainers may edit decision history during handover or review.
- Decision: Mirror new structured decisions into docs/decisions while keeping DECISIONS.md compatible.
- Alternatives considered: None recorded.
- Affected files/modules: plugins/project-guardian/scripts/guardian.js, docs/decisions
- Related change: P4 collaboration conflict handling and the new `guardian decision add` command.
- Verification: npm.cmd test and guardian verify
- Risks: Decision content is duplicated for compatibility.
- Review after: 2026-06-14
- Follow-up: Consider turning DECISIONS.md into a pure index after teams adopt the directory.
- Decision file: `docs/decisions/2026-05-14-use-per-decision-files.md`

### 2026-05-15 - 默认使用中文项目记忆

- 背景：目标使用者主要是中文团队和没有太多编程经验的实习生，英文模板会增加理解成本，也容易让 AI 生成的交接记录脱离实际工作语言。
- 决策：Project Guardian 默认使用 `zh-CN` 模板，同时保留 `guardian init --language en` 给英文团队使用。文档校验、更新记录、交接生成、决策记录和 AI 工具适配规则都必须兼容中英文。
- 备选方案：继续只维护英文模板；或只维护中文模板并移除英文支持。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/zh-CN/`、`project-guardian.config.json`、README、插件文档和测试。
- 关联变更：新增 `language` 配置、中文模板目录、双语校验规则、中文 query 分词回归测试，并修复 `init --language en` 时适配器规则仍使用中文模板的问题。
- 验证方式：运行 lint、测试、`guardian verify`、语言初始化冒烟测试和 package dry-run。
- 风险：已有英文项目如果把配置改成 `zh-CN`，后续 `update` 生成的记录会中英混杂；文档中已要求同一项目不要反复切换语言。
- 复审时间：2026-06-15。
- 后续动作：根据真实团队反馈继续补充中文文案和更多 AI 工具适配模板。
