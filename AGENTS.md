# AI Agent Rules

This repository uses Project Guardian memory.

Before editing or answering project-specific questions, read:

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`
3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`
5. `memory/HANDOVER.md`

After code changes:

- Update `memory/STATE.md` with current status, known issues, next steps, and latest change.
- Append a concise entry to `memory/AI_CHANGELOG.md`.
- Update `memory/DECISIONS.md` for meaningful business, architecture, dependency, data-model, workflow, security, or compatibility decisions.
- Refresh `memory/HANDOVER.md` when preparing handoff, onboarding, or release work.
- Run `node plugins/project-guardian/scripts/guardian.js verify` before finishing when the CLI is available.

Every AI-assisted change must record what changed, why it changed, what was verified, and what the next developer should know.
Never write production passwords, real tokens, customer private data, or other secrets into project memory.
