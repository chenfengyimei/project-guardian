# AI Changelog

This file records AI-assisted development context that should survive beyond a chat session.

## 2026 Entries

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
