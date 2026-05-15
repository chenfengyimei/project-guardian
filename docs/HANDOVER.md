# Handover Guide

Last generated: 2026-05-14

## First Read

Read these files before editing code:

1. `PROJECT_CONTEXT.md`
2. `STATE.md`
3. `DECISIONS.md`
4. `docs/AI_CHANGELOG.md`
5. `README.md`
6. `plugins/project-guardian/docs/CLI_AND_CI.md`
7. `plugins/project-guardian/docs/STANDARD.md`

## How To Run

Preferred CLI after global install is `guardian`. If the package is not installed globally, use the vendored path `node plugins/project-guardian/scripts/guardian.js <command>`.

```bash
# check CLI syntax
node --check plugins/project-guardian/scripts/guardian.js

# show available commands
guardian help

# install AI tool adapters
guardian install-adapters --adapter cursor,copilot

# run the full local quality gate
guardian verify

# run tests
npm.cmd test
```

## Project Map

| Area | Files | Purpose |
| --- | --- | --- |
| Plugin metadata | `plugins/project-guardian/.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json` | Allows Codex to discover and install the local plugin |
| Skill | `plugins/project-guardian/skills/project-guardian/SKILL.md` | Tells Codex how to use project memory before answering or editing |
| CLI | `plugins/project-guardian/scripts/guardian.js`, `plugins/project-guardian/scripts/lib/adapters.js` | Implements init, update, handover, check, validation, query, hooks, CI, decisions, conflicts, verify, security scanning, and AI tool adapter resolution |
| Templates | `plugins/project-guardian/assets/templates/*`, `plugins/project-guardian/assets/templates/zh-CN/*` | Seed English and Chinese memory files plus AI tool adapter rules copied into target projects during `guardian init` or `guardian install-adapters` |
| Documentation | `README.md`, `plugins/project-guardian/docs/*`, `零基础超简单入门.md` | Explains adoption, workflow, standards, CLI, CI, and beginner usage |
| Tests | `package.json`, `tests/guardian.test.js` | Runs syntax checks and command behavior tests with temporary repositories |
| Memory | `PROJECT_CONTEXT.md`, `STATE.md`, `DECISIONS.md`, `docs/AI_CHANGELOG.md`, `docs/HANDOVER.md` | Durable context for this repository |

## Core Flows

- New project adoption: install the CLI globally or copy the plugin source, run `guardian init`, optionally run `guardian install-adapters --adapter cursor,copilot`, fill memory, run `guardian verify`, then commit.
- Language choice: Chinese is the default. English projects should run `guardian init --language en` on the first initialization and keep that config stable afterward.
- Daily work: read memory, make the smallest safe change, run project tests, run `guardian update`, fill changelog fields, run `guardian verify`.
- Conflict work: run `guardian conflicts`, resolve code and memory conflicts, preserve useful history from both sides, then rerun `guardian verify`.
- Handover: run `guardian update`, run `guardian handover`, review the generated guide, run `guardian verify`, then push.
- CI adoption: run `guardian install-ci`, review generated `.workflow/project-guardian.yml`, and adjust branch or Node version through config when needed.

## Common Problems

| Problem | Likely cause | Fix |
| --- | --- | --- |
| `validate-docs` fails after `init` | Generated memory is still a template | Fill real project context, state, decisions, changelog, and handover details |
| `check` fails before commit | Code changed without a corresponding memory update | Run `guardian update "task summary"`, fill the new entry, and stage memory files |
| Hook does not run in CI | Git hooks only run locally | Use `guardian install-ci` for Gitee Go or add equivalent CI commands manually |
| Query answer is incomplete | Current query is keyword retrieval | Ask with file names or business keywords, then inspect the listed source paths |
| English init creates Chinese AI rules | Older language handling did not pass init flags into adapter generation | Use the current CLI and run the regression test covering `guardian init --language en` |

## Risk Areas

- Changes to `guardian.js` can affect every command, so test command behavior in temporary repositories before release.
- Validation should block empty memory without forcing teams into excessive documentation.
- Security scanning must redact values and remain easy to override for harmless examples through `.guardianignore`.
- Gitee workflow generation should stay configurable because branch names and pipeline syntax vary by organization.

## New Developer First Day

1. Read project memory and the root README.
2. Run `guardian doctor`.
3. Run `node --check plugins/project-guardian/scripts/guardian.js`.
4. Run `npm.cmd test`.
5. Pick one small issue from `STATE.md`.
6. After the change, update memory and run `guardian verify`.
