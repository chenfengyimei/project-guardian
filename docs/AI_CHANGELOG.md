# AI Changelog

This file records AI-assisted development context that should survive beyond a chat session.

## 2026 Entries

### 2026-05-15 00:00 - Add Chinese-first language support

- Human request: Explain why the plugin still felt English-heavy, add a Chinese adaptation, analyze possible bugs, and improve the project accordingly.
- AI summary: Added `language` config support with `zh-CN` as the default, added Chinese templates for memory files and AI tool adapters, kept English initialization through `guardian init --language en`, made validation rules accept Chinese or English headings and fields, localized generated update/handover/decision content, and added regression tests for Chinese init, English init, Chinese docs, Chinese query, and Chinese decision records.
- Files changed: `plugins/project-guardian/scripts/guardian.js`, `project-guardian.config.json`, `plugins/project-guardian/assets/templates/zh-CN/`, `tests/guardian.test.js`, README, Project Guardian docs, `PROJECT_CONTEXT.md`, `STATE.md`, `DECISIONS.md`, and `docs/HANDOVER.md`.
- Business reason: The target teams mainly work in Chinese, and beginner users should not have to understand English templates before they can preserve project memory.
- Technical notes: `guardian init --language en` now passes the selected config into adapter generation so English projects do not receive Chinese `AGENTS.md` or Cursor/Copilot rules. Query tokenization includes Chinese keyword pairs so local lookup can match Chinese questions.
- Verification: `npm.cmd run lint`, `npm.cmd test`, `node plugins/project-guardian/scripts/guardian.js verify`, `git diff --check`, language command smoke tests, and package dry-run are run for this pass before handoff.
- Risks: Existing projects should avoid changing `language` back and forth after adoption, otherwise newly generated memory entries can become mixed-language.
- Sensitive data checked: No production passwords, real tokens, private keys, or customer private data were added.
- Next step: After pushing to Gitee, install from the Gitee URL on a clean machine and test both `guardian init` and `guardian init --language en`.

### 2026-05-14 15:20 - Add portable CLI and AI tool adapters

- Human request: First solve the CLI usability problem, then build an adapter layer for other AI tools, and keep documentation synchronized.
- AI summary: Added package `bin` entries so the tool can be used as `guardian` or `project-guardian`, added `--version`, added configurable adapter generation for generic/Codex, Cursor, and GitHub Copilot, and added tests that verify adapter creation, preservation, package metadata, and config validation.
- Files changed: `package.json`, `project-guardian.config.json`, `plugins/project-guardian/scripts/guardian.js`, adapter templates under `plugins/project-guardian/assets/templates/`, `tests/guardian.test.js`, README, Project Guardian docs, and project memory files.
- Business reason: Teams should not need to remember a long relative Node path, and the project-memory workflow should work for Cursor, Copilot, Codex, and generic AI agents instead of being locked to one ecosystem.
- Technical notes: `guardian init` still creates core memory files without overwriting existing content. `guardian install-adapters --adapter cursor,copilot` only adds AI rule files and preserves existing same-name files. The Git install source is `git+https://gitee.com/chenfengloveyuri/project-guardian.git`.
- Verification: `npm.cmd run lint`, `npm.cmd test`, `node plugins/project-guardian/scripts/guardian.js verify`, help/version smoke tests, and package dry-run are run for this pass before handoff.
- Risks: Global CLI usage depends on the team publishing or installing from a real npm/Git source; adapter formats should be reviewed when Cursor or Copilot changes their rule conventions.
- Sensitive data checked: No production passwords, real tokens, private keys, or customer private data were added.
- Next step: Commit the CLI, adapter-layer, and Gitee install-source changes to Gitee after reviewing the final diff.

### 2026-05-14 15:50 - Decouple adapter resolution from the main CLI

- Human request: Analyze the directory structure, check for missing or weak areas, and decouple or refactor code where coupling is too high.
- AI summary: Moved adapter parsing, validation, and template mapping out of `guardian.js` into `plugins/project-guardian/scripts/lib/adapters.js`. Fixed a config consistency gap where fresh `guardian init --adapter copilot` created Copilot rules but still wrote the default generic/Cursor adapter config.
- Files changed: `plugins/project-guardian/scripts/guardian.js`, `plugins/project-guardian/scripts/lib/adapters.js`, `tests/guardian.test.js`, `package.json`, `README.md`, `PROJECT_CONTEXT.md`, `STATE.md`, `DECISIONS.md`, `docs/HANDOVER.md`, and Project Guardian docs.
- Business reason: Adding future AI tool adapters should not require editing unrelated CLI workflow code, and new projects should not receive misleading adapter health checks after custom initialization.
- Technical notes: `package.json` lint now checks the new adapter module. A new regression test verifies that `init --adapter copilot` persists `["copilot"]` into fresh `project-guardian.config.json` and passes `doctor`.
- Verification: `npm.cmd run lint` and `npm.cmd test` passed before the final full verify loop.
- Risks: `guardian.js` remains the largest file and still combines docs, Git, validation, query, and security logic; further extraction should be done in small slices after this adapter split is stable.
- Sensitive data checked: No production passwords, real tokens, private keys, or customer private data were added.
- Next step: Consider extracting config loading/validation or document validation into focused modules in a later pass.

### 2026-05-14 00:00 - Harden Project Guardian quality workflow

- Human request: Complete the staged improvement roadmap step by step, run multi-round tests, and fix errors immediately.
- AI summary: Expanded the CLI toward a verify-first workflow with configurable memory paths, stricter document validation, secret scanning, structured decisions, per-decision files, merge conflict guidance, non-interactive query, stronger hook and CI generation, automated tests, and repository self-memory.
- Files changed: `plugins/project-guardian/scripts/guardian.js`, `.gitignore`, `package.json`, `tests/guardian.test.js`, templates under `plugins/project-guardian/assets/templates/`, root memory files, root docs, plugin docs, and plugin metadata entries now visible to Git.
- Business reason: The plugin must move beyond document templates and actively enforce handover quality for AI-assisted development teams.
- Technical notes: The CLI remains a single Node.js script with standard library dependencies. The new commands and checks are designed to work locally, in hooks, and in Gitee CI without an external service.
  ```text
  guardian verify = doctor + check + validate-docs + configured security scan
  ```
- Verification: `npm.cmd run verify`, direct command smoke tests, `git diff --check`, JSON parsing checks, and documentation consistency scans passed after code and docs were updated.
- Risks: The stricter validation rules may need tuning after real teams try them on partially documented projects. Windows users should prefer `npm.cmd` in PowerShell when script execution policy blocks `npm.ps1`.
- Sensitive data checked: No production passwords, real tokens, private keys, or customer private data were added to memory files.
- Next step: Review the final diff, rerun the verification loop, and summarize the Gitee-ready change set.
