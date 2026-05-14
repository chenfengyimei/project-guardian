# Project Guardian Instructions

This repository uses Project Guardian memory for AI-assisted development.

Before suggesting or editing project-specific code, inspect these files when they exist:

1. `PROJECT_CONTEXT.md`
2. `STATE.md`
3. `DECISIONS.md`
4. `docs/AI_CHANGELOG.md`
5. `docs/HANDOVER.md`

After code changes:

- Update `STATE.md`.
- Append a concise entry to `docs/AI_CHANGELOG.md`.
- Update `DECISIONS.md` when a meaningful architecture, business, dependency, data-model, security, workflow, or compatibility decision is introduced.
- Recommend `guardian verify` before committing.

Every durable memory entry should capture what changed, why it changed, affected files, verification, sensitive-data check, risks, and the next step.
Never write production passwords, real tokens, private keys, customer private data, or other secrets into project memory.
