# Changelog

All notable changes to Project Guardian are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-07-14

### Added

- Added a centralized CLI contract with strict option validation, command-level help, typo suggestions, `--key=value` support, and machine-readable `guardian commands --json` output.
- Added `guardian migrate-memory --dry-run` and controlled runner entries for version, command discovery, and memory migration.
- Added write-time secret checks for structured updates, decisions, and review completion records.
- Added template-aware validation so `append-memory` rejects fields that would otherwise be silently ignored by the selected template.
- Added i18n message registry (`lib/messages.js`) with `t(key)` function and `setLanguage()` support.
- Added `guardian migrate-memory` command to move legacy memory files to `memory/` directory.
- Added `guardian-cmd git-branch` and `guardian-cmd git-stash` controlled command replacements.
- Added `Run/lib/guardian-bridge.js` intermediary layer decoupling Run layer from plugin internals.
- Added `lib/brief.js` extracted from `knowledge.js` for brief reading plans and token estimation.
- Added unified secret detection in `shared.js`: `containsLikelySecret()`, `redactLikelySecret()`, `looksHighEntropy()`, `estimateTokens()`.
- Added reentrancy guard in Run audit log `appendAuditEvent` to prevent hash chain corruption.
- Added 6 new tests: secret detection/redaction, large file chunks, brief large files, audit reentrancy, `containsLikelySecret` lastIndex fix.

### Changed

- Split `guardian.js` (855→341 lines) into `lib/init.js`, `lib/check.js`, `lib/hooks-ci.js`, `lib/update.js`.
- `Run/server.js` and `Run/lib/commands.js` now import from `guardian-bridge.js` instead of directly requiring plugin internals.
- `security.js` `scanSecretLine` now detects Chinese secret keywords (密码/密钥/令牌/私钥).
- `security.js` `looksHighEntropy` unified with `shared.js` implementation.
- `manual-memory.js` `SENSITIVE_TEXT_PATTERN` replaced with `shared.containsLikelySecret`.
- `audit.js` and `guardian-cmd.js` `redactLikelySecret` replaced with `shared.redactLikelySecret`.
- `knowledge.js` no longer contains brief functions; `buildBrief`/`formatBrief` moved to `brief.js`.
- `estimateTokens` moved from `knowledge.js` to `shared.js`.
- `validateMcpConfig` duplicate removed from `validators.js`; `config.js` now imports from `mcp.js`.
- Changed license from Apache-2.0 to MIT.

### Fixed

- Unknown options, missing option values, and unexpected positional arguments now fail with usage exit code `2` instead of being silently ignored.
- Repeated decisions with the same date and title now receive collision-safe filenames instead of overwriting earlier decision sources.
- Memory migration now preflights destination and missing-path conflicts (including dry runs), supports decision directories and legacy config-key upgrades, adopts already-moved targets, rolls completed moves back on failure, and never overwrites an existing destination.
- Controlled-command audit logs now redact values passed separately after sensitive option names.
- Generated change-log code blocks and truncated handover snapshots no longer introduce trailing whitespace; snapshots use an explicit truncation marker instead of placeholder ellipses.
- `containsLikelySecret` lastIndex bug: regex with `g` flag requires `lastIndex` reset before each `test()`.

## [0.4.0] - 2026-07-12

### Added

- Added `guardian repair-memory` with dry-run and explicit `--write` modes to sort changelog history and rebuild the decision index from independent decision files.
- Added structured `guardian update` fields across CLI, Run, and MCP so complete change records can be written in one operation.
- Added MCP `guardian_memory_health` and `guardian_memory_repair` tools.
- Added query source line locations and source-diverse result selection.

### Fixed

- Blocked prototype-polluting configuration keys and normalized malformed configuration sections so doctor/verify report errors instead of crashing.
- Fixed changelog and decision insertion to keep newest records first.
- Added encoding, control-character, damaged-CJK, and history-order validation.
- Fixed MCP task scheduling so queued writes cannot be starved by later reads.
- Recovered corrupted project decision sources and regenerated the decision index.

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
