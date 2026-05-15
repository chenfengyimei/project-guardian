# Project Guardian

This repository uses Project Guardian memory for AI-assisted development.

Before editing or answering project-specific questions, inspect:

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`
3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`
5. `memory/HANDOVER.md`

After code changes:

- Update `memory/STATE.md` with current status, known issues, next steps, and latest change.
- Append a concise entry to `memory/AI_CHANGELOG.md`.
- Update `memory/DECISIONS.md` when a meaningful architecture, business, dependency, data-model, workflow, security, or compatibility decision is introduced.
- Run `guardian verify` before finishing when the CLI is available.

Never write production passwords, real tokens, private keys, customer private data, or other secrets into project memory.
