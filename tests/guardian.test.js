const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const guardian = path.join(repoRoot, "plugins", "project-guardian", "scripts", "guardian.js");

function tempDir(name) {
  const dir = path.join(repoRoot, "tests", `.tmp-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function run(cwd, args) {
  return spawnSync(process.execPath, [guardian, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

function git(cwd, args) {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function gitResult(cwd, args) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function writeJson(file, value) {
  writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function defaultConfig(overrides = {}) {
  return {
    memoryFiles: {
      context: "PROJECT_CONTEXT.md",
      state: "STATE.md",
      decisions: "DECISIONS.md",
      changelog: "docs/AI_CHANGELOG.md",
      handover: "docs/HANDOVER.md",
      decisionsDirectory: "docs/decisions",
    },
    quality: {
      requireChangedLines: false,
      taskIdPattern: null,
      ...(overrides.quality || {}),
    },
    hooks: {
      runValidateDocs: true,
      ...(overrides.hooks || {}),
    },
    ci: {
      defaultBranch: "master",
      nodeVersion: "18",
      ...(overrides.ci || {}),
    },
    security: {
      scanSecrets: true,
      ...(overrides.security || {}),
    },
    adapters: overrides.adapters || ["generic", "cursor"],
    ignore: overrides.ignore || [],
  };
}

function writeValidMemory(root, configOverrides = {}) {
  writeJson(path.join(root, "project-guardian.config.json"), defaultConfig(configOverrides));
  writeFile(
    path.join(root, "PROJECT_CONTEXT.md"),
    `# Project Context

## Project Summary

- Name: Demo guarded project.
- Purpose: Exercise Project Guardian checks in an isolated test repository.
- Target users: Maintainers and AI assistants validating memory workflows.
- Business owner: Test suite.

## Tech Stack

- Runtime: Node.js 18 or newer.
- Framework: Standard library only.
- Database: None.
- Package manager: npm.
- Deployment target: Local test workspace.

## Core Business Flows

1. Guard project memory before code is committed.
   - Entry point: guardian verify.
   - Important files: source files and memory files.
   - Rules: Code changes must include meaningful memory updates.
   - Known edge cases: Empty templates must fail validation.

## External Dependencies

| Dependency | Purpose | Owner | Notes |
| --- | --- | --- | --- |
| Git | Provides staged file state | Tests | Required for check behavior |

## Data Model

| Entity | Important fields | Notes |
| --- | --- | --- |
| Memory entry | Summary, reason, verification, risk | Used by future maintainers |

## How To Run

\`\`\`bash
node plugins/project-guardian/scripts/guardian.js verify
npm test
\`\`\`

## Environment Variables

| Name | Required | Description | Example |
| --- | --- | --- | --- |
| None | No | Tests do not require environment variables | Keep secrets out of memory |

## Important Constraints

- Preserve existing files during initialization.
- Keep test fixtures small and deterministic.

## AI Notes

- AI agents must read memory before editing code.
- Do not store real credentials or private customer data in memory.
`,
  );

  writeFile(
    path.join(root, "STATE.md"),
    `# Project State

Last updated: 2026-05-14

## Current Status

- The test project has enough filled memory to pass Project Guardian validation.
- The repository is used to verify CLI commands in temporary Git workspaces.

## Completed

- Memory files contain concrete project context.
- Validation, check, hook, CI, query, and secret scan commands can be exercised.

## In Progress

- Running isolated command behavior tests.

## Next Steps

1. Keep fixtures aligned with the validation standard.
2. Add new command tests when the CLI grows.

## Known Issues

| Issue | Impact | Owner | Notes |
| --- | --- | --- | --- |
| Keyword query is simple | Some semantic questions may miss | Maintainer | This is acceptable for local tests |

## Risk Areas

- Git staged state must be created carefully in tests.
- Secret scan examples must use fake values and verify redaction.

## Latest AI-Assisted Change

- Task: Prepare test fixture memory.
- Summary: Filled all required memory files with concrete content for command tests.
- Files: Test workspace memory files.
- Verification: guardian validate-docs passes.
- Follow-up: Keep the fixture free of real secrets.
`,
  );

  writeFile(
    path.join(root, "DECISIONS.md"),
    `# Decisions

This file records decisions that future developers and AI agents must understand.

## Active Decisions

### 2026-05-14 - Use local Markdown memory in tests

- Context: Tests must run without network services or external databases.
- Decision: Store context, state, decisions, changelog, and handover data as Markdown files.
- Alternatives considered: External test service or generated database fixture.
- Affected files/modules: Project Guardian memory files and command tests.
- Related change: Automated tests validate the local workflow.
- Verification: Run guardian validate-docs and guardian verify.
- Risks: Markdown fixtures must stay realistic enough to catch regressions.
- Review after: 2026-06-14.
- Follow-up: Add fixture updates when validation rules change.
`,
  );

  writeFile(
    path.join(root, "docs", "AI_CHANGELOG.md"),
    `# AI Changelog

This file records AI-assisted development context that should survive beyond a chat session.

## 2026 Entries

### 2026-05-14 00:00 - Prepare test project memory

- Human request: Create a valid Project Guardian test fixture.
- AI summary: Filled durable memory files with concrete, non-sensitive test content.
- Files changed: Test workspace memory files.
- Business reason: Command tests need a valid baseline before introducing failing changes.
- Technical notes: The fixture uses local Markdown and Git only.
- Verification: guardian validate-docs should pass for this fixture.
- Risks: Fixture content must avoid placeholders and fake secrets that look real.
- Sensitive data checked: Only fake, non-sensitive examples are used.
- Next step: Exercise command behavior against this baseline.
`,
  );

  writeFile(
    path.join(root, "docs", "HANDOVER.md"),
    `# Handover Guide

Last generated: 2026-05-14

## First Read

Read these files before editing code:

1. PROJECT_CONTEXT.md
2. STATE.md
3. DECISIONS.md
4. docs/AI_CHANGELOG.md

## How To Run

\`\`\`bash
node plugins/project-guardian/scripts/guardian.js verify
npm test
\`\`\`

## Project Map

| Area | Files | Purpose |
| --- | --- | --- |
| memory | PROJECT_CONTEXT.md, STATE.md, DECISIONS.md | Durable context for tests |
| docs | docs/AI_CHANGELOG.md, docs/HANDOVER.md | Change history and handover guide |

## Core Flows

- Run validation on filled memory.
- Stage source changes and confirm check behavior.
- Generate hooks and CI snippets from config.

## Common Problems

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Validation fails | A fixture field was emptied | Restore concrete memory content |

## Risk Areas

- Avoid real credentials in tests.
- Keep temporary directories isolated.

## New Developer First Day

1. Read project memory.
2. Run guardian doctor.
3. Run guardian verify.
4. Make one small fixture change.
5. Update memory after the change.
`,
  );

  writeFile(
    path.join(root, "AGENTS.md"),
    `# AI Agent Rules

Read Project Guardian memory before editing. Update memory after code changes. Run guardian verify before committing.
`,
  );
  writeFile(
    path.join(root, ".cursorrules"),
    "Read Project Guardian memory before editing. Update memory after code changes. Run guardian verify before committing.\n",
  );
}

function initGit(root) {
  git(root, ["init"]);
  git(root, ["branch", "-M", "master"]);
  git(root, ["config", "user.email", "tests@example.com"]);
  git(root, ["config", "user.name", "Project Guardian Tests"]);
}

test("init creates standard files and preserves existing memory", () => {
  const root = tempDir("init");
  try {
    writeFile(path.join(root, "PROJECT_CONTEXT.md"), "custom context\n");
    const result = run(root, ["init"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(root, "PROJECT_CONTEXT.md"), "utf8"), "custom context\n");
    assert.ok(fs.existsSync(path.join(root, "project-guardian.config.json")));
    assert.ok(fs.existsSync(path.join(root, "docs", "AI_CHANGELOG.md")));
    assert.ok(fs.existsSync(path.join(root, "AGENTS.md")));
    assert.ok(fs.existsSync(path.join(root, ".cursor", "rules", "project-guardian.mdc")));
    assert.ok(fs.existsSync(path.join(root, ".cursorrules")));
  } finally {
    cleanup(root);
  }
});

test("package exposes guardian CLI bin entries", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(pkg.bin.guardian, "plugins/project-guardian/scripts/guardian.js");
  assert.equal(pkg.bin["project-guardian"], "plugins/project-guardian/scripts/guardian.js");
  assert.equal(pkg.engines.node, ">=18");
  assert.ok(pkg.files.includes("plugins/project-guardian"));
});

test("version command reads plugin manifest version", () => {
  const root = tempDir("version");
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "plugins", "project-guardian", ".codex-plugin", "plugin.json"), "utf8"));
    const result = run(root, ["--version"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(result.stdout.trim(), manifest.version);
  } finally {
    cleanup(root);
  }
});

test("init --adapter all creates Codex, Cursor, Copilot, and generic rule files", () => {
  const root = tempDir("adapter-all");
  try {
    const result = run(root, ["init", "--adapter", "all"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.ok(fs.existsSync(path.join(root, "AGENTS.md")));
    assert.ok(fs.existsSync(path.join(root, ".cursor", "rules", "project-guardian.mdc")));
    assert.ok(fs.existsSync(path.join(root, ".cursorrules")));
    assert.ok(fs.existsSync(path.join(root, ".github", "copilot-instructions.md")));
    assert.ok(fs.existsSync(path.join(root, ".github", "instructions", "project-guardian.instructions.md")));
  } finally {
    cleanup(root);
  }
});

test("init persists adapter flags into fresh config", () => {
  const root = tempDir("adapter-flag-config");
  try {
    const result = run(root, ["init", "--adapter", "copilot"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.ok(fs.existsSync(path.join(root, ".github", "copilot-instructions.md")));
    assert.equal(fs.existsSync(path.join(root, ".cursor", "rules", "project-guardian.mdc")), false);

    const config = JSON.parse(fs.readFileSync(path.join(root, "project-guardian.config.json"), "utf8"));
    assert.deepEqual(config.adapters, ["copilot"]);

    const doctor = run(root, ["doctor"]);
    assert.equal(doctor.status, 0, `${doctor.stdout}\n${doctor.stderr}`);
    assert.match(doctor.stdout, /AI rule files: ok/);
  } finally {
    cleanup(root);
  }
});

test("install-adapters preserves existing adapter files", () => {
  const root = tempDir("adapter-preserve");
  try {
    writeFile(path.join(root, ".github", "copilot-instructions.md"), "custom copilot rules\n");
    const result = run(root, ["install-adapters", "--adapter", "copilot"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(fs.readFileSync(path.join(root, ".github", "copilot-instructions.md"), "utf8"), "custom copilot rules\n");
    assert.ok(fs.existsSync(path.join(root, ".github", "instructions", "project-guardian.instructions.md")));
  } finally {
    cleanup(root);
  }
});

test("config adapters control init adapter output", () => {
  const root = tempDir("adapter-config");
  try {
    writeJson(path.join(root, "project-guardian.config.json"), defaultConfig({ adapters: ["copilot"] }));
    const result = run(root, ["init"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.ok(fs.existsSync(path.join(root, ".github", "copilot-instructions.md")));
    assert.equal(fs.existsSync(path.join(root, ".cursor", "rules", "project-guardian.mdc")), false);
    assert.equal(fs.existsSync(path.join(root, "AGENTS.md")), false);
  } finally {
    cleanup(root);
  }
});

test("doctor validates string adapter config values", () => {
  const root = tempDir("adapter-config-string");
  try {
    writeJson(path.join(root, "project-guardian.config.json"), defaultConfig({ adapters: "cursor,copilot" }));
    const initResult = run(root, ["init"]);
    assert.equal(initResult.status, 0, `${initResult.stdout}\n${initResult.stderr}`);
    const result = run(root, ["doctor"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

    writeJson(path.join(root, "project-guardian.config.json"), defaultConfig({ adapters: "cursor,unknown-ai" }));
    const failed = run(root, ["doctor"]);
    assert.notEqual(failed.status, 0, `${failed.stdout}\n${failed.stderr}`);
    assert.match(`${failed.stdout}\n${failed.stderr}`, /unknown adapter: unknown-ai/);
  } finally {
    cleanup(root);
  }
});

test("validate-docs rejects fresh templates", () => {
  const root = tempDir("template-validation");
  try {
    assert.equal(run(root, ["init"]).status, 0);
    const result = run(root, ["validate-docs"]);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /Document validation failed/);
  } finally {
    cleanup(root);
  }
});

test("validate-docs accepts filled memory, including CRLF files", () => {
  const root = tempDir("valid-docs");
  try {
    writeValidMemory(root);
    for (const file of ["PROJECT_CONTEXT.md", "STATE.md", "DECISIONS.md", "docs/AI_CHANGELOG.md", "docs/HANDOVER.md"]) {
      const full = path.join(root, file);
      fs.writeFileSync(full, fs.readFileSync(full, "utf8").replace(/\n/g, os.EOL), "utf8");
    }
    const result = run(root, ["validate-docs"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    cleanup(root);
  }
});

test("check blocks staged code when staged memory is missing", () => {
  const root = tempDir("check-code-without-memory");
  try {
    writeValidMemory(root);
    initGit(root);
    writeFile(path.join(root, "src", "app.js"), "console.log('hello');\n");
    git(root, ["add", "src/app.js"]);
    const result = run(root, ["check"]);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /staged code changes do not include staged project memory updates/i);
  } finally {
    cleanup(root);
  }
});

test("check blocks staged memory that still contains new TODO content", () => {
  const root = tempDir("check-low-quality-memory");
  try {
    writeValidMemory(root);
    initGit(root);
    writeFile(path.join(root, "src", "app.js"), "console.log('hello');\n");
    fs.appendFileSync(path.join(root, "docs", "AI_CHANGELOG.md"), "\n- Next step: TODO fill this before commit.\n", "utf8");
    git(root, ["add", "src/app.js", "docs/AI_CHANGELOG.md"]);
    const result = run(root, ["check"]);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /latest changelog entry must not contain TODO|memory document quality issues/i);
  } finally {
    cleanup(root);
  }
});

test("check treats docs/decisions entries as memory updates", () => {
  const root = tempDir("check-decision-file-memory");
  try {
    writeValidMemory(root);
    initGit(root);
    writeFile(path.join(root, "src", "app.js"), "console.log('hello');\n");
    writeFile(path.join(root, "docs", "decisions", "2026-05-14-test-decision.md"), "# Test decision\n\nThe source change is covered by a decision note.\n");
    git(root, ["add", "src/app.js", "docs/decisions/2026-05-14-test-decision.md"]);
    const result = run(root, ["check"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    cleanup(root);
  }
});

test("decision add appends a structured decision", () => {
  const root = tempDir("decision-add");
  try {
    writeValidMemory(root);
    const result = run(root, [
      "decision",
      "add",
      "--title",
      "Use JSON config",
      "--context",
      "Teams need configurable memory paths.",
      "--decision",
      "Use project-guardian.config.json with defaults.",
      "--verification",
      "Run guardian doctor.",
    ]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(fs.readFileSync(path.join(root, "DECISIONS.md"), "utf8"), /Use JSON config/);
    assert.ok(fs.readdirSync(path.join(root, "docs", "decisions")).some((file) => file.includes("use-json-config")));
    assert.equal(run(root, ["validate-docs"]).status, 0);
  } finally {
    cleanup(root);
  }
});

test("install-hooks appends checks without removing an existing hook", () => {
  const root = tempDir("hooks");
  try {
    writeValidMemory(root);
    initGit(root);
    const hook = path.join(root, ".git", "hooks", "pre-commit");
    writeFile(hook, "#!/bin/sh\ncustom-check\n");
    const result = run(root, ["install-hooks"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const content = fs.readFileSync(hook, "utf8");
    assert.match(content, /custom-check/);
    assert.match(content, /guardian\.js" check/);
    assert.match(content, /guardian\.js" validate-docs/);
    assert.match(content, /guardian\.js" scan-secrets/);
  } finally {
    cleanup(root);
  }
});

test("install-ci uses configured branch, Node version, and security scan", () => {
  const root = tempDir("ci");
  try {
    writeValidMemory(root, { ci: { defaultBranch: "main", nodeVersion: "20" } });
    const result = run(root, ["install-ci"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const content = fs.readFileSync(path.join(root, ".workflow", "project-guardian.yml"), "utf8");
    assert.match(content, /branch: main/);
    assert.match(content, /nodeVersion: 20/);
    assert.match(content, /scan-secrets/);
  } finally {
    cleanup(root);
  }
});

test("scan-secrets detects suspicious values and redacts output", () => {
  const root = tempDir("secret-scan");
  try {
    writeValidMemory(root);
    const fakeValue = "abcdEFGH1234_SECRET";
    fs.appendFileSync(path.join(root, "docs", "AI_CHANGELOG.md"), `\n- Debug note: api_key=${fakeValue}\n`, "utf8");
    const result = run(root, ["scan-secrets"]);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /keyword-secret/);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(fakeValue));
  } finally {
    cleanup(root);
  }
});

test("scan-secrets includes per-decision files", () => {
  const root = tempDir("secret-scan-decisions");
  try {
    writeValidMemory(root);
    writeFile(path.join(root, "docs", "decisions", "2026-05-14-risk.md"), "# Risk\n\napi_key=ZZZZyyyy1234_SECRET\n");
    const result = run(root, ["scan-secrets"]);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /docs\/decisions\/2026-05-14-risk\.md/);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /ZZZZyyyy1234_SECRET/);
  } finally {
    cleanup(root);
  }
});

test("query supports non-interactive questions and source output", () => {
  const root = tempDir("query");
  try {
    writeValidMemory(root);
    const result = run(root, ["query", "Node.js memory"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Source:/);
  } finally {
    cleanup(root);
  }
});

test("conflicts reports memory merge conflicts", () => {
  const root = tempDir("conflicts");
  try {
    writeValidMemory(root);
    initGit(root);
    git(root, ["add", "."]);
    git(root, ["commit", "-m", "initial memory"]);
    git(root, ["checkout", "-b", "other"]);
    fs.writeFileSync(path.join(root, "STATE.md"), fs.readFileSync(path.join(root, "STATE.md"), "utf8").replace("The test project has enough filled memory", "The other branch has enough filled memory"), "utf8");
    git(root, ["add", "STATE.md"]);
    git(root, ["commit", "-m", "other state"]);
    git(root, ["checkout", "master"]);
    fs.writeFileSync(path.join(root, "STATE.md"), fs.readFileSync(path.join(root, "STATE.md"), "utf8").replace("The test project has enough filled memory", "The master branch has enough filled memory"), "utf8");
    git(root, ["add", "STATE.md"]);
    git(root, ["commit", "-m", "master state"]);
    assert.notEqual(gitResult(root, ["merge", "other"]).status, 0);

    const result = run(root, ["conflicts"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /Project memory conflicts/);
    assert.match(result.stdout, /STATE\.md/);
  } finally {
    cleanup(root);
  }
});

test("install-hooks reports a clear error outside Git repositories", () => {
  const root = tempDir("hooks-no-git");
  try {
    writeValidMemory(root);
    const result = run(root, ["install-hooks"]);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /No \.git directory found/);
  } finally {
    cleanup(root);
  }
});
