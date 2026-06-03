# Token Budget Briefing

- Date: 2026-06-03
- Review after: 2026-07-03

## Decision Record

### 2026-06-03 - Add budget-aware memory briefing before full reads

- Context: If AI agents read every core memory file on every turn, Project Guardian will preserve handover context but may add too much token cost for routine tasks.
- Decision: Add `guardian brief` and MCP `guardian_brief` as a first-step routing mechanism. AI rules now default to reading `memory/PROJECT_CONTEXT.md` and `memory/STATE.md` first, then only reading `memory/DECISIONS.md`, `memory/AI_CHANGELOG.md`, or `memory/HANDOVER.md` when the task makes them relevant. After risk review, add explicit `quick`, `deep`, and `full` modes so agents can intentionally escalate instead of treating budget-aware reading as a hard limit.
- Alternatives considered: Build RAG/vector search now; keep full memory reads every turn; rely on human discipline; build IDE-native plugins before the CLI/MCP layer is mature.
- Affected files/modules: `plugins/project-guardian/scripts/guardian.js`, `plugins/project-guardian/scripts/lib/mcp.js`, `tests/guardian.test.js`, adapter templates, VS Code tasks, README, Project Guardian docs, zero-basic tutorial, file explanation, and `memory/*`.
- Related change: `guardian brief "token 成本控制" --limit 2` recommends core memory plus decisions and estimates about 51% savings versus full core memory; `guardian brief "新人接手" --limit 2` recommends core memory plus handover and estimates about 63% savings. `guardian brief "修复登录回归" --mode deep --limit 2` now forces decisions and changelog, while `--mode full` forces all core memory.
- Verification: Run lint, tests, `guardian brief` smoke checks, `guardian verify`, audit, and diff check.
- Risks: Token estimates are approximate; keyword routing may miss semantic relevance; `deep` and `full` intentionally spend more context when risk rises; if core memory grows too large, a short summary file or MCP resource layer may still be needed.
- Follow-up: Review real AI IDE behavior after teams adopt the new rules, then decide whether to add summaries, pagination, cached excerpts, or vector retrieval.
