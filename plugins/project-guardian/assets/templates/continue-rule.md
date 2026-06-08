---
name: Project Guardian
alwaysApply: true
---

# Project Guardian

Use Project Guardian memory as the source of truth for this repository.

Use budget-aware memory reading before project-specific answers or edits:

1. If the CLI or MCP tool is available, run `guardian brief "task or question"` or call `guardian_brief` first.
2. Always read `memory/PROJECT_CONTEXT.md` and `memory/STATE.md`.
3. Read `memory/DECISIONS.md` only for meaningful business, architecture, dependency, data-model, workflow, security, compatibility, or review decisions.
4. Read `memory/AI_CHANGELOG.md` only when recent history, regression context, risk, or "why changed" matters.
5. Read `memory/HANDOVER.md` only for handoff, onboarding, release, or first-day guidance.
6. Use `guardian query "question" --limit 3` for targeted lookup before opening large history files.
7. Use `guardian brief "task or question" --mode deep` for bugs, regressions, unclear history, or high-risk modules; use `--mode full` for onboarding, handoff, release, audits, large refactors, or explicit full-context requests.
8. Budget-aware reading is a starting point, not a hard restriction. If evidence is weak, conflicting, or risky, escalate before editing.

Before running common system commands, prefer `guardian-cmd list` and use `guardian-cmd <command-id> [args]` when a controlled replacement exists. This records the invocation in `.project-guardian/cmd-audit.jsonl`. Fall back to direct shell commands only when no controlled replacement exists.

After code changes, update `memory/STATE.md` and `memory/AI_CHANGELOG.md`. Add or update `memory/DECISIONS.md` when the change introduces an important architecture, workflow, dependency, security, or compatibility decision.

Prefer running `guardian-cmd guardian-verify` before handoff, review, or commit when available; otherwise run `guardian verify`. Do not write secrets or customer private data into memory.
