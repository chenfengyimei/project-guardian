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
