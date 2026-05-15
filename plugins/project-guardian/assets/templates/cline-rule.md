# Project Guardian

This project uses Project Guardian memory.

Before editing code or answering project-specific questions, read:

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`
3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`
5. `memory/HANDOVER.md`

After code changes:

- Update `memory/STATE.md`.
- Append a concise entry to `memory/AI_CHANGELOG.md`.
- Update `memory/DECISIONS.md` for meaningful decisions.
- Run `guardian verify` before finishing when available.

Every durable memory entry should capture what changed, why it changed, affected files, verification, sensitive-data check, risks, and the next step.
Never store secrets in project memory.
