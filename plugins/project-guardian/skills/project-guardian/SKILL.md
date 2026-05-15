---
name: project-guardian
description: Maintain durable project memory for AI-assisted coding projects, including context files, state tracking, decisions, handover guides, and multi-turn self-service project knowledge lookup.
---

# Project Guardian

Use this skill when a user wants to initialize project memory, understand a project, preserve AI coding context, update handover notes, or ask project-history questions.

## Required Reading Order

Before answering project-specific questions or editing code, inspect these files if they exist:

1. `memory/PROJECT_CONTEXT.md`
2. `memory/STATE.md`
3. `memory/DECISIONS.md`
4. `memory/AI_CHANGELOG.md`
5. `memory/HANDOVER.md`

If any file is missing, mention it briefly and continue from available context.

## Memory Update Rule

After code changes, update project memory unless the user explicitly asks not to:

- Update `memory/STATE.md` with current status, next step, known issues, and latest AI-assisted change.
- Append a concise entry to `memory/AI_CHANGELOG.md`.
- Update `memory/DECISIONS.md` when the change introduces a meaningful architecture, business logic, dependency, data model, or compatibility decision.
- Refresh `memory/HANDOVER.md` when the user asks for handover, onboarding, project explanation, or release preparation.
- Preserve existing human-written memory. Append, summarize, or amend the relevant section instead of deleting historical context.
- Run or recommend `guardian verify` when memory quality matters before handover, PR, or release.
- Never write production passwords, real tokens, private keys, customer private data, or other secrets into project memory.

## Self-Service Knowledge Loop

For multi-turn project knowledge queries:

1. Treat the memory files as the primary source of truth.
2. Search the repository only after reading memory files.
3. Answer with current facts, historical reasons, affected files, and suggested next steps.
4. Ask at most one clarifying question only when the user's query cannot be safely scoped.
5. When the answer reveals missing memory, update or recommend updating the relevant memory file.

Recommended user prompts:

- `请先读取项目记忆，然后告诉我这个项目现在做到哪了。`
- `查询登录模块的历史上下文和风险点。`
- `根据当前状态生成新人第一天接手计划。`
- `完成这次修改后更新项目记忆。`

## Plugin Documentation

When users ask how to adopt or standardize the plugin, reference:

- `plugins/project-guardian/docs/INTEGRATION.md`
- `plugins/project-guardian/docs/STANDARD.md`
- `plugins/project-guardian/docs/CLI_AND_CI.md`

## Recording Standard

Every durable memory entry should capture:

- What changed.
- Why it changed.
- Which files or modules are affected.
- What was verified.
- Whether sensitive data was checked.
- What the next developer should avoid or do next.

Prefer clear, short Markdown over long essays. Preserve practical details such as commands, environment variables, edge cases, and error messages.
