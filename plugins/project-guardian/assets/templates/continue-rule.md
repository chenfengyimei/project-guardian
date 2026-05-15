---
name: Project Guardian
alwaysApply: true
---

# Project Guardian

Use Project Guardian memory as the source of truth for this repository.

Read before project-specific answers or edits:

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`
3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`
5. `memory/HANDOVER.md`

After code changes, update `memory/STATE.md` and `memory/AI_CHANGELOG.md`. Add or update `memory/DECISIONS.md` when the change introduces an important architecture, workflow, dependency, security, or compatibility decision.

Prefer running `guardian verify` before handoff, review, or commit. Do not write secrets or customer private data into memory.
