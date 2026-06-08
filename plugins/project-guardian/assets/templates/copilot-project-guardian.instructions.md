---
applyTo: "**"
---

# Project Guardian

Use repository memory as the primary source of project truth, but read it in a budget-aware order:

- Run `guardian brief "task or question"` or call `guardian_brief` first when the CLI or MCP tool is available.
- Always read `memory/PROJECT_CONTEXT.md` and `memory/STATE.md`.
- Read `memory/DECISIONS.md` only for meaningful business, architecture, dependency, data-model, workflow, security, compatibility, or review decisions.
- Read `memory/AI_CHANGELOG.md` only when recent history, regression context, risk, or "why changed" matters.
- Read `memory/HANDOVER.md` only for handoff, onboarding, release, or first-day guidance.
- Use `guardian query "question" --limit 3` for targeted lookup before opening large history files.
- Use `guardian brief "task or question" --mode deep` for bugs, regressions, unclear history, or high-risk modules.
- Use `guardian brief "task or question" --mode full` for onboarding, handoff, release, audits, large refactors, or explicit full-context requests.
- Budget-aware reading is a starting point, not a hard restriction. If evidence is weak, conflicting, or risky, escalate before editing.

Before running common system commands, prefer `guardian-cmd list` and use `guardian-cmd <command-id> [args]` when a controlled replacement exists. This records the invocation in `.project-guardian/cmd-audit.jsonl`.

When helping with implementation, explain historical context, affected files, verification, risks, and memory updates. Prefer small, safe changes and run or recommend `guardian-cmd guardian-verify` before commit when available; otherwise run or recommend `guardian verify`.
