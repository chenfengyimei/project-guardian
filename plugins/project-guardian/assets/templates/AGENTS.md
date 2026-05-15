# AI Agent Rules

This project uses Project Guardian memory.

Before editing or answering project-specific questions, read:

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`
3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`
5. `memory/HANDOVER.md`

After code changes:

- Update `memory/STATE.md`.
- Append an entry to `memory/AI_CHANGELOG.md`.
- Update `memory/DECISIONS.md` for meaningful business, architecture, dependency, or data-model decisions.
- Refresh `memory/HANDOVER.md` when preparing handoff or onboarding.
- Run `guardian verify` before committing when the CLI is available.

Every AI-assisted change must record what changed, why it changed, what was verified, and what the next developer should know.
Never write production passwords, real tokens, customer private data, or other secrets into project memory.
