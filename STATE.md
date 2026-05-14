# Project State

Last updated: 2026-05-14

## Current Status

- Project Guardian is a local Codex plugin plus Node.js CLI that creates and maintains durable project memory for AI-assisted coding projects.
- The current development pass has hardened the tool from a template helper into a reusable workflow guard with config, validation, security scanning, unified verification, conflict guidance, decision files, and tests.
- The repository now self-hosts its own Project Guardian memory files so future changes can be reviewed through the same workflow it recommends to other teams.

## Completed

- Created the plugin structure with `.codex-plugin/plugin.json`, skill metadata, templates, CLI script, root README, workflow documentation, standard documentation, integration documentation, and beginner guide.
- Implemented initial commands for `init`, `update`, `handover`, `check`, `doctor`, `validate-docs`, `query`, `install-hooks`, and `install-ci`.
- Added stricter roadmap requirements for repository completeness, default quality gates, decision quality, config, security scanning, CI behavior, and automated tests.
- Ran self-init for this repository and filled real memory content instead of leaving empty generated templates.
- Added `package.json` and a Node test suite under `tests/` covering init, validation, check failures, hooks, CI generation, decision records, secret scanning, query, and merge conflict reporting.
- Updated user-facing docs so `guardian verify` is the recommended default command before commit and CI.

## In Progress

- Reviewing final diffs and repeating the verification loop before summarizing the Gitee-ready change set.

## Next Steps

1. Review the final `git diff` and confirm no unrelated files were formatted or rewritten.
2. Run `npm.cmd run lint`, `npm.cmd test`, and `node plugins/project-guardian/scripts/guardian.js verify` one more time.
3. Summarize files changed, tests run, and remaining risks for Gitee submission.

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

- Task: Harden Project Guardian according to the staged P0-P6 improvement roadmap.
- Summary: Added self-memory, strengthened CLI quality gates, restored plugin marketplace files to Git visibility, added tests, documented verify-first usage, added conflict/decision-file support, and fixed final documentation consistency issues found during multi-round testing.
- Files: `plugins/project-guardian/scripts/guardian.js`, templates under `plugins/project-guardian/assets/templates/`, root memory files, root docs, and test files.
- Verification: `npm.cmd run verify`, direct command smoke tests, `git diff --check`, JSON parsing checks, and documentation consistency scans passed during this development pass.
- Follow-up: Consider future RAG/vector retrieval, issue tracker integration, and package publishing after the local quality gate remains stable.
