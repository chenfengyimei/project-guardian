# AI Agent Rules

This repository uses Project Guardian memory.

Before editing or answering project-specific questions, use budget-aware memory reading:

1. If the CLI or MCP tool is available, run `node plugins/project-guardian/scripts/guardian.js brief "task or question"` or call `guardian_brief` first.
2. Always read `memory/PROJECT_CONTEXT.md` and `memory/STATE.md`.
3. Read `memory/DECISIONS.md` only for meaningful business, architecture, dependency, data-model, workflow, security, compatibility, or review decisions.
4. Read `memory/AI_CHANGELOG.md` only when recent history, regression context, risk, or "why changed" matters.
5. Read `memory/HANDOVER.md` only for handoff, onboarding, release, or first-day guidance.
6. Use `node plugins/project-guardian/scripts/guardian.js query "question" --limit 3` for targeted lookup before opening large history files.
7. Use `node plugins/project-guardian/scripts/guardian.js brief "task or question" --mode deep` for bugs, regressions, unclear history, or high-risk modules; use `--mode full` for onboarding, handoff, release, audits, large refactors, or explicit full-context requests.
8. Budget-aware reading is a starting point, not a hard restriction. If evidence is weak, conflicting, or risky, escalate before editing.
9. If a higher-priority instruction explicitly requires full memory reading, follow that stricter rule.

Before running common system commands, prefer the controlled command runner when it has a replacement:

- Run `node plugins/project-guardian/cmd/guardian-cmd.js list` to inspect available command IDs.
- Use `node plugins/project-guardian/cmd/guardian-cmd.js <command-id> [args]` for supported Git, npm, Node, and Guardian commands so `.project-guardian/cmd-audit.jsonl` records the invocation automatically.
- Fall back to direct shell commands only when no controlled replacement exists, then consider whether a new command ID should be added.

After code changes:

- Update `memory/STATE.md` with current status, known issues, next steps, and latest change.
- Append a concise entry to `memory/AI_CHANGELOG.md`.
- Update `memory/DECISIONS.md` for meaningful business, architecture, dependency, data-model, workflow, security, or compatibility decisions.
- Refresh `memory/HANDOVER.md` when preparing handoff, onboarding, or release work.
- Run `node plugins/project-guardian/cmd/guardian-cmd.js guardian-verify` before finishing when the controlled command runner is available; otherwise run `node plugins/project-guardian/scripts/guardian.js verify`.

Every AI-assisted change must record what changed, why it changed, what was verified, and what the next developer should know.
Never write production passwords, real tokens, customer private data, or other secrets into project memory.
