# Project Guardian

This repository uses Project Guardian memory for AI-assisted development.

Before editing or answering project-specific questions, use budget-aware memory reading:

1. If the CLI or MCP tool is available, run `guardian brief "task or question"` or call `guardian_brief` first.
2. Always read `memory/PROJECT_CONTEXT.md` and `memory/STATE.md`.
3. Read `memory/DECISIONS.md` only for meaningful business, architecture, dependency, data-model, workflow, security, compatibility, or review decisions.
4. Read `memory/AI_CHANGELOG.md` only when recent history, regression context, risk, or "why changed" matters.
5. Read `memory/HANDOVER.md` only for handoff, onboarding, release, or first-day guidance.
6. Use `guardian query "question" --limit 3` for targeted lookup before opening large history files.
7. Use `guardian brief "task or question" --mode deep` for bugs, regressions, unclear history, or high-risk modules; use `--mode full` for onboarding, handoff, release, audits, large refactors, or explicit full-context requests.
8. Budget-aware reading is a starting point, not a hard restriction. If evidence is weak, conflicting, or risky, escalate before editing.

Before running common system commands, prefer `guardian-cmd list` and use `guardian-cmd <command-id> [args]` when a controlled replacement exists. This records the invocation in `.project-guardian/cmd-audit.jsonl`. Fall back to direct shell commands only when no controlled replacement exists.

After code changes:

- Update `memory/STATE.md` with current status, known issues, next steps, and latest change.
- Append a concise entry to `memory/AI_CHANGELOG.md`.
- Update `memory/DECISIONS.md` when a meaningful architecture, business, dependency, data-model, workflow, security, or compatibility decision is introduced.
- Run `guardian-cmd guardian-verify` before finishing when available; otherwise run `guardian verify`.

Never write production passwords, real tokens, private keys, customer private data, or other secrets into project memory.
