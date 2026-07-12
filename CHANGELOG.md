# Changelog

All notable changes to Project Guardian are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- CSRF protection for Run Web UI POST API requests (Origin header validation).
- Security response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`) for all Run server responses.
- MCP stdin line length limit (1MB) to prevent memory exhaustion DoS.
- Audit log physical deletion detection in Run audit hash chain.
- Shell metacharacter validation for `guardian-cmd` passthrough commands.
- Path traversal protection for `decisions.js` `--date` parameter and decision file generation.
- Path traversal protection for `security.js` decision file scanning.
- Config path safety validation in `config.js` (`memoryFiles.*` paths reject `..` and absolute paths).
- `--review-after` date format validation in `decisions.js`.
- `--` terminator support in `parseFlags`.
- Windows npm executable path resolution improvement in `guardian-cmd.js`.

### Changed

- Audit log write failures are no longer silently swallowed; write/security operation audit failures now log to stderr.
- `readMaybe` in shared module logs non-ENOENT errors to stderr instead of silently returning empty string.
- `unique()` in shared module now type-checks values to prevent crashes on non-string inputs.
- UTF-8 safe truncation in MCP output and Run server output limiting (no longer splits multi-byte characters).
- Token estimation in `knowledge.js` now accounts for CJK characters separately for more accurate budget estimates.
- `shellQuoteText` in `knowledge.js` strips shell metacharacters instead of naive escaping.
- `chunks()` in `knowledge.js` validates `size`/`overlap` parameters to prevent infinite loops.
- `buildBrief()` in `knowledge.js` now handles legacy `config.memory` shape without crashing.
- `scanSecretLine()` in `security.js` limits line scan length to 10000 chars and caps match results.
- Renamed `explaiw/` directory to `explain/` (spelling fix).
- `.gitignore` updated with additional patterns (`*.log`, `*.tmp`, `*.swp`, `*.bak`, `.idea/`, `.vscode/settings.json`).

### Fixed

- Run Web UI CSRF vulnerability: cross-origin POST requests are now rejected.
- Run Web UI static file path traversal: `..` and backslash in decoded paths are now blocked before filesystem access.
- MCP UTF-8 truncation corruption: output truncation no longer splits multi-byte codepoints.
- `decisions.js` path traversal via `--date` parameter.
- `security.js` path traversal via `decisionsDirectory` config path.
- `knowledge.js` crash when `config.memoryFiles` is undefined.
- `knowledge.js` infinite loop in `chunks()` when `overlap >= size`.
- `shared.js` `unique()` crash on non-string values.
- Run server `?token=` query parameter auth now works as documented.

## [0.3.0] - 2026-06-08

### Added

- Zero-dependency hybrid search with synonym expansion and n-gram similarity for `guardian query`.
- `CONTRIBUTING.md` with development workflow and query contribution standards.
- `guardian-cmd` controlled command layer with automatic JSONL audit logging.
- `guardian brief --mode quick|deep|full` for budget-aware memory reading.
- `guardian query --limit` and MCP `guardian_query.limit` for result count control.
- `guardian reviews`, `guardian reviews due`, `guardian reviews complete` for decision review workflow.
- `guardian verify` now includes `reviews` step.
- Run Web UI with sidebar navigation, Markdown rendering, MCP system page, and command operations.
- MCP tool permission control (`mcp.readOnly`, `mcp.allowedTools`, `PROJECT_GUARDIAN_MCP_READ_ONLY=1`).
- MCP strict schema validation for tool arguments.
- `guardian append-memory` CLI command with shared templates.
- Run server audit log with hash chain integrity and optional `GUARDIAN_RUN_TOKEN` API protection.
- AI IDE adapter support for Windsurf, Cline, Continue, Claude Code, Gemini CLI, VS Code.
- `guardian adapters doctor` command.
- Chinese (`zh-CN`) as default language with English (`--language en`) support.
- Centralized `memory/` directory for project memory files.
- Gitee Go CI template generation via `guardian install-ci`.
- Pre-commit hook installation via `guardian install-hooks`.

### Changed

- CLI modules split from `guardian.js` into 11 dedicated modules under `scripts/lib/`.
- Run server split into `Run/lib/commands.js` and `Run/lib/audit.js`.
- Query upgraded from pure keyword counting to hybrid retrieval with synonym expansion and n-gram similarity.
