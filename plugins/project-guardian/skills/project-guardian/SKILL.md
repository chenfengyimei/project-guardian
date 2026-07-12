---
name: project-guardian
description: Maintain durable project memory for AI-assisted coding projects, including context files, state tracking, decisions, handover guides, MCP tools, and multi-turn self-service project knowledge lookup.
---

# Project Guardian

Use this skill when a user wants to initialize project memory, understand a project, preserve AI coding context, update handover notes, or ask project-history questions.

## Budget-Aware Reading Order

Before answering project-specific questions or editing code:

1. If the CLI or MCP tool is available, run `guardian brief "task or question"` or call `guardian_brief` first.
2. Always inspect `memory/PROJECT_CONTEXT.md` and `memory/STATE.md` when they exist.
3. Inspect `memory/DECISIONS.md` only for meaningful business, architecture, dependency, data-model, workflow, security, compatibility, or review decisions.
4. Inspect `memory/AI_CHANGELOG.md` only when recent history, regression context, risk, or "why changed" matters.
5. Inspect `memory/HANDOVER.md` only for handoff, onboarding, release, or first-day guidance.
6. Use `guardian query "question" --limit 3` or `guardian_query` with `limit: 3` for targeted lookup before opening large history files.
7. Use `guardian brief "task or question" --mode deep` for bugs, regressions, unclear history, high-risk modules, failing tests, or planned rewrites.
8. Use `guardian brief "task or question" --mode full` for onboarding, handoff, release, audits, large refactors, or explicit full-context requests.

Budget-aware reading is a starting point, not a hard restriction. If evidence is weak, conflicting, or risky, escalate before editing. If any required file is missing, mention it briefly and continue from available context. If a higher-priority repository rule explicitly requires full memory reading, follow that stricter rule.

## Memory Update Rule

After code changes, update project memory unless the user explicitly asks not to:

- Update `memory/STATE.md` with current status, next step, known issues, and latest AI-assisted change.
- Append a concise entry to `memory/AI_CHANGELOG.md`.
- Update `memory/DECISIONS.md` when the change introduces a meaningful architecture, business logic, dependency, data model, or compatibility decision.
- Refresh `memory/HANDOVER.md` when the user asks for handover, onboarding, project explanation, or release preparation.
- Preserve existing human-written memory. Append, summarize, or amend the relevant section instead of deleting historical context.
- Run or recommend `guardian verify` when memory quality matters before handover, PR, or release.
- If validation reports encoding damage, out-of-order history, or decision-index drift, run `guardian repair-memory` first as a dry run; apply only with `guardian repair-memory --write`, review the diff, then rerun validation.
- Prefer a structured `guardian update` call with `--summary`, `--reason`, `--verification`, `--risks`, `--sensitive-data`, and `--next-step` when those facts are known, so the latest record is complete in one operation.
- Never write production passwords, real tokens, private keys, customer private data, or other secrets into project memory.

## Self-Service Knowledge Loop

For multi-turn project knowledge queries:

1. Treat the memory files as the primary source of truth.
2. Start with `guardian brief` or `guardian_brief`, then read only the memory files relevant to the question.
3. Escalate to `--mode deep` or `--mode full` when the first-pass evidence is incomplete, risky, or inconsistent.
4. Search the repository only after the targeted memory pass.
5. Answer with current facts, historical reasons, affected files, and suggested next steps.
6. Ask at most one clarifying question only when the user's query cannot be safely scoped.
7. When the answer reveals missing memory, update or recommend updating the relevant memory file.

Recommended user prompts:

- `请先做 Project Guardian 读取计划，然后告诉我这个项目现在做到哪了。`
- `查询登录模块的历史上下文、风险点和相关决策。`
- `根据当前状态生成新人第一天接手计划。`
- `完成这次修改后更新项目记忆。`

## Plugin Documentation

When users ask how to adopt or standardize the plugin, reference:

- `plugins/project-guardian/docs/INTEGRATION.md`
- `plugins/project-guardian/docs/STANDARD.md`
- `plugins/project-guardian/docs/CLI_AND_CI.md`

If the user asks about MCP or direct AI IDE tool calls, mention `guardian mcp`, the MCP setup examples in `CLI_AND_CI.md` and `INTEGRATION.md`, `guardian_brief`, the `mcp.readOnly` / `mcp.allowedTools` safety controls, strict MCP argument validation, `guardian_query.limit` for smaller responses, and the split between read-only `guardian_memory_health` and write-capable `guardian_memory_repair`.

If the user asks about decision follow-up or review, mention `guardian reviews`, `guardian reviews due`, and `guardian reviews complete`; due reviews are part of `guardian verify`, and completed reviews should record the reviewer, conclusion, verification, and that no further review is needed.

## Recording Standard

Every durable memory entry should capture:

- What changed.
- Why it changed.
- Which files or modules are affected.
- What was verified.
- Whether sensitive data was checked.
- What the next developer should avoid or do next.

Prefer clear, short Markdown over long essays. Preserve practical details such as commands, environment variables, edge cases, and error messages.
