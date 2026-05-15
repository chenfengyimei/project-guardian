# Project State

Last updated: 2026-05-15

## Current Status

- Project Guardian is a local Codex plugin plus Node.js CLI that creates and maintains durable project memory for AI-assisted coding projects.
- The current development pass has hardened the tool from a template helper into a reusable workflow guard with config, validation, security scanning, unified verification, conflict guidance, decision files, and tests.
- The CLI now has package `bin` entries so teams can install it as `guardian`, while the old vendored script path remains available for projects that keep the plugin source in-repo.
- The official Git install source has been confirmed as `git+https://gitee.com/chenfengloveyuri/project-guardian.git`.
- The tool now includes an AI adapter layer for generic/Codex rules, Cursor rules, and GitHub Copilot instruction files.
- Adapter resolution has been split out of the main CLI into `plugins/project-guardian/scripts/lib/adapters.js`, reducing coupling in `guardian.js`.
- The CLI now defaults to Chinese project memory templates and can still generate English templates with `guardian init --language en`.
- The repository now self-hosts its own Project Guardian memory files so future changes can be reviewed through the same workflow it recommends to other teams.

## Completed

- Created the plugin structure with `.codex-plugin/plugin.json`, skill metadata, templates, CLI script, root README, workflow documentation, standard documentation, integration documentation, and beginner guide.
- Implemented initial commands for `init`, `update`, `handover`, `check`, `doctor`, `validate-docs`, `query`, `install-hooks`, and `install-ci`.
- Added stricter roadmap requirements for repository completeness, default quality gates, decision quality, config, security scanning, CI behavior, and automated tests.
- Ran self-init for this repository and filled real memory content instead of leaving empty generated templates.
- Added `package.json` and a Node test suite under `tests/` covering init, validation, check failures, hooks, CI generation, decision records, secret scanning, query, and merge conflict reporting.
- Updated user-facing docs so `guardian verify` is the recommended default command before commit and CI.
- Added `guardian` / `project-guardian` package binaries, `guardian --version`, configurable adapter generation, and templates for Cursor and GitHub Copilot.
- Added a focused adapter module and regression coverage for `guardian init --adapter ...` persisting selected adapters into fresh config.

## In Progress

- Final verification loop is being rerun after adding Chinese-first templates, bilingual validation, localized generators, and language regression tests.

## Next Steps

1. Review the final `git diff` and confirm no unrelated files were formatted or rewritten.
2. Review the verification output from `npm.cmd run lint`, `npm.cmd test`, `node plugins/project-guardian/scripts/guardian.js verify`, command smoke tests, and package dry-run.
3. Summarize the Chinese adaptation, fixed bugs, tests run, and remaining risks for Gitee submission.

## Known Issues

| Issue | Impact | Owner | Notes |
| --- | --- | --- | --- |
| Query is keyword-based rather than semantic | It may miss answers that use different wording | Maintainer | RAG and vector retrieval are planned for later iterations |
| Decision records are duplicated into index and per-decision files | Slightly more documentation output is produced | Maintainer | This is intentional for compatibility while reducing future conflicts |
| Gitee Go syntax may vary by account template | Teams may need to adjust generated pipeline details | Repository owner | The CLI keeps the workflow small and configurable |

## Risk Areas

- `plugins/project-guardian/scripts/guardian.js` is the main executable and needs focused tests because it coordinates Git, docs, config, hooks, CI, and scans.
- Document validation must be strict enough to stop empty templates but not so strict that a new team cannot adopt the tool gradually.
- Secret scanning must avoid printing full sensitive values and must not create excessive false positives in normal documentation.
- Hooks and CI should be append-only or generated deliberately so they do not overwrite existing team automation.

## Latest AI-Assisted Change

- Task: Add Chinese-first Project Guardian templates and bilingual CLI behavior.
- Summary: Added `language` config support, default Chinese templates, English fallback with `--language en`, bilingual validation rules, Chinese query tokenization coverage, localized update/handover/decision output, and regression tests for language-specific init behavior.
- Files: `plugins/project-guardian/scripts/guardian.js`, `project-guardian.config.json`, `plugins/project-guardian/assets/templates/zh-CN/`, `tests/guardian.test.js`, README, Project Guardian docs, and root memory files.
- Verification: `npm.cmd run lint`, `npm.cmd test`, `node plugins/project-guardian/scripts/guardian.js verify`, `git diff --check`, command smoke tests, and package dry-run are run for this language pass before handoff.
- Follow-up: After pushing to Gitee, test `guardian init` and `guardian init --language en` in two clean temporary projects from the installed package.
