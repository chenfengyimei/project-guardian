# Project Guardian

This project uses Project Guardian memory.

Before making project-specific changes or recommendations, read:

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`
3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`
5. `memory/HANDOVER.md`

After code changes:

- Update `memory/STATE.md`.
- Append a concise entry to `memory/AI_CHANGELOG.md`.
- Update `memory/DECISIONS.md` for important decisions.
- Run `guardian verify` before handoff or commit when available.

Do not store production passwords, real tokens, private keys, customer private data, or other secrets in project memory.
