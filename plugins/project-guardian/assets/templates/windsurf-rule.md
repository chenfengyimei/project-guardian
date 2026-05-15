---
trigger: always_on
description: Project Guardian project memory rule
---

# Project Guardian

Before editing code or answering project-specific questions, read:

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`
3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`
5. `memory/HANDOVER.md`

After code changes:

- Update `memory/STATE.md`.
- Append a concise entry to `memory/AI_CHANGELOG.md`.
- Update `memory/DECISIONS.md` when a meaningful architecture, business, dependency, data-model, security, workflow, or compatibility decision is introduced.
- Run `guardian verify` before handoff or commit when the CLI is available.

Never write production passwords, real tokens, private keys, customer private data, or other secrets into project memory.
