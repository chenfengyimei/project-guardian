const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawn, spawnSync } = require("node:child_process");
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

function requestJson(server, route, payload) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const body = payload === undefined ? null : JSON.stringify(payload);
    const req = http.request({
      host: "127.0.0.1",
      port: address.port,
      path: route,
      method: body === null ? "GET" : "POST",
      headers: body === null ? {} : {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        text += chunk;
      });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(text) });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    if (body !== null) req.write(body);
    req.end();
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

function runMcpSession(cwd, messages, expectedResponses, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnMcp(cwd, extraEnv);
    const responses = [];
    let stderr = "";
    const timer = setTimeout(() => {
      finish(new Error(`MCP session timed out. stderr=${stderr}`));
    }, 5000);
    let done = false;

    function finish(error) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.stdin.end();
      const settle = () => {
        if (error) reject(error);
        else resolve(responses);
      };
      if (child.exitCode !== null || child.signalCode !== null) {
        settle();
        return;
      }
      child.once("close", settle);
      if (!child.killed) child.kill();
    }

    child.stdout.on("data", (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) {
        responses.push(JSON.parse(line));
      }
      if (responses.length >= expectedResponses) {
        finish();
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      finish(error);
    });
    child.on("close", (code) => {
      if (!done && code !== 0) finish(new Error(`MCP server exited with ${code}. stderr=${stderr}`));
    });

    for (const message of messages) child.stdin.write(`${JSON.stringify(message)}\n`);
  });
}

function spawnMcp(cwd, extraEnv = {}) {
  return spawn(process.execPath, [guardian, "mcp"], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", ...extraEnv },
    stdio: ["pipe", "pipe", "pipe"],
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
      context: "memory/PROJECT_CONTEXT.md",
      state: "memory/STATE.md",
      decisions: "memory/DECISIONS.md",
      changelog: "memory/AI_CHANGELOG.md",
      handover: "memory/HANDOVER.md",
      decisionsDirectory: "memory/decisions",
      ...(overrides.memoryFiles || {}),
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
    mcp: {
      readOnly: false,
      allowedTools: [],
      ...(overrides.mcp || {}),
    },
    language: overrides.language || "zh-CN",
    adapters: overrides.adapters || ["generic", "cursor"],
    ignore: overrides.ignore || [],
  };
}

function writeValidMemory(root, configOverrides = {}) {
  writeJson(path.join(root, "project-guardian.config.json"), defaultConfig({ language: "en", ...configOverrides }));
  writeFile(
    path.join(root, "memory/PROJECT_CONTEXT.md"),
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
    path.join(root, "memory/STATE.md"),
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
    path.join(root, "memory/DECISIONS.md"),
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
    path.join(root, "memory", "AI_CHANGELOG.md"),
    `# AI Changelog

This file records AI-assisted development context that should survive beyond a chat session.

## 2026 Entries

### 2026-05-14 10:30 - Prepare test project memory

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
    path.join(root, "memory", "HANDOVER.md"),
    `# Handover Guide

Last generated: 2026-05-14

## First Read

Read these files before editing code:

1. memory/PROJECT_CONTEXT.md
2. memory/STATE.md
3. memory/DECISIONS.md
4. memory/AI_CHANGELOG.md

## How To Run

\`\`\`bash
node plugins/project-guardian/scripts/guardian.js verify
npm test
\`\`\`

## Project Map

| Area | Files | Purpose |
| --- | --- | --- |
| memory | memory/PROJECT_CONTEXT.md, memory/STATE.md, memory/DECISIONS.md | Durable context for tests |
| docs | memory/AI_CHANGELOG.md, memory/HANDOVER.md | Change history and handover guide |

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
    writeFile(path.join(root, "memory/PROJECT_CONTEXT.md"), "custom context\n");
    const result = run(root, ["init"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(root, "memory/PROJECT_CONTEXT.md"), "utf8"), "custom context\n");
    assert.ok(fs.existsSync(path.join(root, "project-guardian.config.json")));
    assert.ok(fs.existsSync(path.join(root, "memory", "AI_CHANGELOG.md")));
    assert.ok(fs.existsSync(path.join(root, "AGENTS.md")));
    assert.ok(fs.existsSync(path.join(root, ".cursor", "rules", "project-guardian.mdc")));
    assert.ok(fs.existsSync(path.join(root, ".cursorrules")));
  } finally {
    cleanup(root);
  }
});

test("init defaults to Chinese memory templates", () => {
  const root = tempDir("init-chinese");
  try {
    const result = run(root, ["init"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const context = fs.readFileSync(path.join(root, "memory/PROJECT_CONTEXT.md"), "utf8");
    const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
    const config = JSON.parse(fs.readFileSync(path.join(root, "project-guardian.config.json"), "utf8"));
    assert.match(context, /# 项目上下文/);
    assert.match(agents, /AI Agent 规则/);
    assert.equal(config.language, "zh-CN");
  } finally {
    cleanup(root);
  }
});

test("init --language en keeps English memory templates", () => {
  const root = tempDir("init-english");
  try {
    const result = run(root, ["init", "--language", "en"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const context = fs.readFileSync(path.join(root, "memory/PROJECT_CONTEXT.md"), "utf8");
    const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
    const config = JSON.parse(fs.readFileSync(path.join(root, "project-guardian.config.json"), "utf8"));
    assert.match(context, /# Project Context/);
    assert.match(agents, /# AI Agent Rules/);
    assert.doesNotMatch(agents, /AI Agent 规则/);
    assert.equal(config.language, "en");
  } finally {
    cleanup(root);
  }
});

test("package exposes guardian CLI bin entries", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(pkg.bin.guardian, "plugins/project-guardian/scripts/guardian.js");
  assert.equal(pkg.bin["project-guardian"], "plugins/project-guardian/scripts/guardian.js");
  assert.equal(pkg.engines.node, ">=18");
  assert.ok(pkg.files.includes("Run"));
  assert.ok(pkg.files.includes("plugins/project-guardian"));
  assert.equal(pkg.scripts.ui, "node Run/server.js");
});

test("Run web server exposes read-only Project Guardian UI API", async () => {
  const root = tempDir("run-ui");
  const runUi = require(path.join(repoRoot, "Run", "server.js"));
  const server = runUi.createServer({ projectRoot: root, guardianScript: guardian });
  try {
    writeValidMemory(root);
    await listen(server);

    const status = await requestJson(server, "/api/status");
    assert.equal(status.status, 200);
    assert.equal(status.body.ok, true);
    assert.equal(status.body.projectRoot, root);
    assert.equal(status.body.guardianAvailable, true);
    assert.ok(status.body.actions.includes("verify"));
    assert.ok(status.body.memoryFiles.some((file) => file.name === "PROJECT_CONTEXT" && file.exists));

    const blocked = await requestJson(server, "/api/command", { action: "update" });
    assert.equal(blocked.status, 400);
    assert.match(blocked.body.error, /Unsupported or write-capable action/);

    const brief = await requestJson(server, "/api/brief", { question: "handover onboarding", mode: "full", limit: 2 });
    assert.equal(brief.status, 200);
    assert.equal(brief.body.ok, true);
    assert.match(brief.body.stdout, /Project Guardian brief/);
    assert.match(brief.body.stdout, /Mode: full/);
  } finally {
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    cleanup(root);
  }
});

test("init adds portable package scripts when CLI is external to the target project", () => {
  const root = tempDir("package-scripts");
  try {
    writeJson(path.join(root, "package.json"), { name: "target-project", scripts: {} });
    const result = run(root, ["init"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    assert.equal(pkg.scripts["guardian:verify"], "guardian verify");
    assert.equal(pkg.scripts["guardian:brief"], "guardian brief");
    assert.equal(pkg.scripts["guardian:adapters-doctor"], "guardian adapters doctor");
    assert.equal(pkg.scripts["guardian:mcp"], "guardian mcp");
    assert.equal(pkg.scripts["guardian:reviews"], "guardian reviews");
    assert.doesNotMatch(pkg.scripts["guardian:verify"], /\.\.\//);
  } finally {
    cleanup(root);
  }
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

test("init --adapter all creates supported AI IDE rule files", () => {
  const root = tempDir("adapter-all");
  try {
    const result = run(root, ["init", "--adapter", "all"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.ok(fs.existsSync(path.join(root, "AGENTS.md")));
    assert.ok(fs.existsSync(path.join(root, ".cursor", "rules", "project-guardian.mdc")));
    assert.ok(fs.existsSync(path.join(root, ".cursorrules")));
    assert.ok(fs.existsSync(path.join(root, ".github", "copilot-instructions.md")));
    assert.ok(fs.existsSync(path.join(root, ".github", "instructions", "project-guardian.instructions.md")));
    assert.ok(fs.existsSync(path.join(root, ".windsurf", "rules", "project-guardian.md")));
    assert.ok(fs.existsSync(path.join(root, ".clinerules", "project-guardian.md")));
    assert.ok(fs.existsSync(path.join(root, ".continue", "rules", "project-guardian.md")));
    assert.ok(fs.existsSync(path.join(root, "CLAUDE.md")));
    assert.ok(fs.existsSync(path.join(root, "GEMINI.md")));
    assert.ok(fs.existsSync(path.join(root, ".vscode", "tasks.json")));
    assert.match(fs.readFileSync(path.join(root, ".windsurf", "rules", "project-guardian.md"), "utf8"), /trigger: always_on/);
    assert.match(fs.readFileSync(path.join(root, ".continue", "rules", "project-guardian.md"), "utf8"), /alwaysApply: true/);
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

test("vscode adapter creates VS Code tasks and Copilot instructions", () => {
  const root = tempDir("adapter-vscode");
  try {
    const result = run(root, ["init", "--adapter", "vscode-copilot"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const tasks = fs.readFileSync(path.join(root, ".vscode", "tasks.json"), "utf8");
    assert.doesNotThrow(() => JSON.parse(tasks));
    assert.match(tasks, /Project Guardian: Verify/);
    assert.match(tasks, /Project Guardian: Brief/);
    assert.match(tasks, /guardian query .*--limit 3/);
    assert.ok(fs.existsSync(path.join(root, ".github", "copilot-instructions.md")));

    const config = JSON.parse(fs.readFileSync(path.join(root, "project-guardian.config.json"), "utf8"));
    assert.deepEqual(config.adapters, ["vscode"]);
  } finally {
    cleanup(root);
  }
});

test("adapter templates render configured memory paths", () => {
  const root = tempDir("adapter-render-paths");
  try {
    writeJson(path.join(root, "project-guardian.config.json"), defaultConfig({
      adapters: ["claude"],
      memoryFiles: {
        context: "project-memory/CONTEXT.md",
        state: "project-memory/STATE.md",
        decisions: "project-memory/DECISIONS.md",
        changelog: "project-memory/CHANGELOG.md",
        handover: "project-memory/HANDOVER.md",
        decisionsDirectory: "project-memory/decisions",
      },
    }));
    const result = run(root, ["init"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const claude = fs.readFileSync(path.join(root, "CLAUDE.md"), "utf8");
    assert.match(claude, /project-memory\/CONTEXT\.md/);
    assert.match(claude, /guardian brief/);
    assert.doesNotMatch(claude, /memory\/PROJECT_CONTEXT\.md/);
    assert.ok(fs.existsSync(path.join(root, "project-memory", "CONTEXT.md")));
  } finally {
    cleanup(root);
  }
});

test("adapters doctor reports installed and missing adapters", () => {
  const root = tempDir("adapter-doctor");
  try {
    const initResult = run(root, ["init", "--adapter", "cursor"]);
    assert.equal(initResult.status, 0, `${initResult.stdout}\n${initResult.stderr}`);
    const result = run(root, ["adapters", "doctor"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /cursor \(Cursor\): installed/);
    assert.match(result.stdout, /claude \(Claude Code\): missing/);
    assert.match(result.stdout, /guardian install-adapters --adapter claude/);
  } finally {
    cleanup(root);
  }
});

test("mcp server exposes Project Guardian tools", async () => {
  const root = tempDir("mcp-tools");
  try {
    const responses = await runMcpSession(root, [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } } },
      { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    ], 2);
    assert.equal(responses[0].result.serverInfo.name, "project-guardian");
    const toolNames = responses[1].result.tools.map((tool) => tool.name);
    assert.ok(toolNames.includes("guardian_brief"));
    assert.ok(toolNames.includes("guardian_query"));
    assert.ok(toolNames.includes("guardian_verify"));
    assert.ok(toolNames.includes("guardian_adapters_doctor"));
  } finally {
    cleanup(root);
  }
});

test("mcp query tool returns CLI output", async () => {
  const root = tempDir("mcp-query");
  try {
    writeValidMemory(root);
    const responses = await runMcpSession(root, [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } } },
      { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "guardian_query", arguments: { question: "memory workflow", limit: 2 } } },
    ], 2);
    assert.equal(responses[1].result.isError, false);
    assert.match(responses[1].result.content[0].text, /Source:/);
    assert.match(responses[1].result.content[0].text, /memory\/PROJECT_CONTEXT\.md/);
    assert.ok((responses[1].result.content[0].text.match(/Source:/g) || []).length <= 2);
  } finally {
    cleanup(root);
  }
});

test("mcp brief tool returns budget-aware reading plan", async () => {
  const root = tempDir("mcp-brief");
  try {
    writeValidMemory(root);
    const responses = await runMcpSession(root, [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } } },
      { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "guardian_brief", arguments: { question: "handover onboarding", limit: 2, mode: "full" } } },
    ], 2);
    assert.equal(responses[1].result.isError, false);
    const text = responses[1].result.content[0].text;
    assert.match(text, /Project Guardian brief/);
    assert.match(text, /memory\/PROJECT_CONTEXT\.md/);
    assert.match(text, /memory\/STATE\.md/);
    assert.match(text, /memory\/HANDOVER\.md/);
    assert.match(text, /Mode: full/);
    assert.match(text, /--limit 2/);
  } finally {
    cleanup(root);
  }
});

test("mcp read-only config hides and blocks write tools", async () => {
  const root = tempDir("mcp-read-only");
  try {
    writeJson(path.join(root, "project-guardian.config.json"), defaultConfig({ mcp: { readOnly: true } }));
    const responses = await runMcpSession(root, [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } } },
      { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "guardian_update", arguments: { task: "blocked write" } } },
    ], 3);
    const toolNames = responses[1].result.tools.map((tool) => tool.name);
    assert.ok(toolNames.includes("guardian_query"));
    assert.ok(toolNames.includes("guardian_verify"));
    assert.ok(!toolNames.includes("guardian_update"));
    assert.ok(!toolNames.includes("guardian_decision_add"));
    assert.ok(!toolNames.includes("guardian_review_complete"));
    assert.ok(!toolNames.includes("guardian_handover"));
    assert.match(responses[2].error.message, /Tool disabled by MCP configuration/);
  } finally {
    cleanup(root);
  }
});

test("mcp allowedTools config limits exposed tools", async () => {
  const root = tempDir("mcp-allowed-tools");
  try {
    writeJson(path.join(root, "project-guardian.config.json"), defaultConfig({ mcp: { allowedTools: ["guardian_query"] } }));
    const responses = await runMcpSession(root, [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } } },
      { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "guardian_verify", arguments: {} } },
    ], 3);
    const toolNames = responses[1].result.tools.map((tool) => tool.name);
    assert.deepEqual(toolNames, ["guardian_query"]);
    assert.match(responses[2].error.message, /Tool disabled by MCP configuration/);
  } finally {
    cleanup(root);
  }
});

test("mcp environment read-only mode hides write tools", async () => {
  const root = tempDir("mcp-env-read-only");
  try {
    writeJson(path.join(root, "project-guardian.config.json"), defaultConfig());
    const responses = await runMcpSession(root, [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } } },
      { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "guardian_review_complete", arguments: { file: "x.md", summary: "ok", verification: "checked" } } },
    ], 3, { PROJECT_GUARDIAN_MCP_READ_ONLY: "1" });
    const toolNames = responses[1].result.tools.map((tool) => tool.name);
    assert.ok(toolNames.includes("guardian_query"));
    assert.ok(!toolNames.includes("guardian_update"));
    assert.ok(!toolNames.includes("guardian_review_complete"));
    assert.match(responses[2].error.message, /Tool disabled by MCP configuration/);
  } finally {
    cleanup(root);
  }
});

test("mcp validates tool arguments before running commands", async () => {
  const root = tempDir("mcp-argument-validation");
  try {
    writeValidMemory(root);
    const responses = await runMcpSession(root, [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } } },
      { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "guardian_query", arguments: { question: "memory workflow", extra: "ignored?" } } },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "guardian_query", arguments: { question: 42 } } },
      { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "guardian_query", arguments: { question: "memory workflow", limit: 11 } } },
      { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "guardian_verify", arguments: { extra: "nope" } } },
      { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "guardian_brief", arguments: { question: "memory workflow", mode: "unsafe" } } },
    ], 6);
    assert.match(responses[1].error.message, /Unsupported argument for guardian_query: extra/);
    assert.match(responses[2].error.message, /Invalid argument type for guardian_query\.question/);
    assert.match(responses[3].error.message, /guardian_query\.limit must be at most 10/);
    assert.match(responses[4].error.message, /Unsupported argument for guardian_verify: extra/);
    assert.match(responses[5].error.message, /guardian_brief\.mode must be one of: auto, quick, deep, full/);
  } finally {
    cleanup(root);
  }
});

test("mcp refuses to start with invalid mcp config", () => {
  const root = tempDir("mcp-start-invalid-config");
  try {
    writeJson(path.join(root, "project-guardian.config.json"), defaultConfig({
      mcp: { readOnly: false, allowedTools: ["guardian_query", "unknown_tool"] },
    }));
    const result = run(root, ["mcp"]);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /Invalid MCP configuration/);
    assert.match(`${result.stdout}\n${result.stderr}`, /unsupported tool: unknown_tool/);
  } finally {
    cleanup(root);
  }
});

test("doctor validates mcp config", () => {
  const root = tempDir("mcp-config-invalid");
  try {
    writeJson(path.join(root, "project-guardian.config.json"), defaultConfig({
      mcp: { readOnly: "yes", allowedTools: ["guardian_query", "unknown_tool"] },
    }));
    const result = run(root, ["doctor"]);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /mcp\.readOnly must be a boolean/);
    assert.match(`${result.stdout}\n${result.stderr}`, /mcp\.allowedTools contains unsupported tool: unknown_tool/);
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

test("doctor rejects unsupported language config values", () => {
  const root = tempDir("language-config-invalid");
  try {
    writeJson(path.join(root, "project-guardian.config.json"), defaultConfig({ language: "fr" }));
    const result = run(root, ["doctor"]);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /language must be one of: zh-CN, en/);
  } finally {
    cleanup(root);
  }
});

test("validate-docs accepts filled memory, including CRLF files", () => {
  const root = tempDir("valid-docs");
  try {
    writeValidMemory(root);
    for (const file of ["memory/PROJECT_CONTEXT.md", "memory/STATE.md", "memory/DECISIONS.md", "memory/AI_CHANGELOG.md", "memory/HANDOVER.md"]) {
      const full = path.join(root, file);
      fs.writeFileSync(full, fs.readFileSync(full, "utf8").replace(/\n/g, os.EOL), "utf8");
    }
    const result = run(root, ["validate-docs"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    cleanup(root);
  }
});

test("validate-docs rejects latest changelog entry with placeholder midnight time", () => {
  const root = tempDir("midnight-changelog");
  try {
    writeValidMemory(root);
    const changelogPath = path.join(root, "memory", "AI_CHANGELOG.md");
    const current = fs.readFileSync(changelogPath, "utf8");
    fs.writeFileSync(changelogPath, current.replace("### 2026-05-14 10:30 - Prepare test project memory", "### 2026-05-14 00:00 - Prepare test project memory"), "utf8");
    const result = run(root, ["validate-docs"]);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /current local HH:mm time, not 00:00/);
  } finally {
    cleanup(root);
  }
});

test("validate-docs checks the first changelog entry as the latest entry", () => {
  const root = tempDir("latest-changelog-first");
  try {
    writeValidMemory(root);
    const changelogPath = path.join(root, "memory", "AI_CHANGELOG.md");
    const current = fs.readFileSync(changelogPath, "utf8");
    fs.writeFileSync(changelogPath, current.replace("### 2026-05-14 10:30 - Prepare test project memory", "### 2026-05-15 11:45 - Newest test entry\n\n- Human request: TODO fill latest entry.\n\n### 2026-05-14 10:30 - Prepare test project memory"), "utf8");
    const result = run(root, ["validate-docs"]);
    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /latest changelog entry must not contain TODO/);
  } finally {
    cleanup(root);
  }
});

test("validate-docs accepts filled Chinese memory", () => {
  const root = tempDir("valid-docs-zh");
  try {
    writeJson(path.join(root, "project-guardian.config.json"), defaultConfig({ language: "zh-CN" }));
    writeFile(
      path.join(root, "memory/PROJECT_CONTEXT.md"),
      `# 项目上下文

## 项目概览

- 项目名称：中文示例项目。
- 项目目的：验证 Project Guardian 能正确识别中文项目记忆。
- 目标用户：维护人员和 AI 助手。
- 业务负责人：测试套件。

## 技术栈

- 运行环境：Node.js 18 或更新版本。
- 框架：标准库。
- 数据库：无。
- 包管理器：npm。
- 部署位置：本地测试目录。

## 核心业务流程

1. 校验中文记忆。
   - 入口：guardian verify。
   - 重要文件：中文记忆文件。
   - 业务规则：中文标题和字段必须被校验器识别。
   - 已知边界情况：空字段和待填写内容必须失败。

## 外部依赖

| 依赖 | 用途 | 负责人 | 备注 |
| --- | --- | --- | --- |
| Git | 读取变更状态 | 测试 | 用于 check 行为 |

## 数据模型

| 对象 | 重要字段 | 备注 |
| --- | --- | --- |
| 记忆记录 | 总结、原因、验证、风险 | 供后续维护者阅读 |

## 如何运行

\`\`\`bash
guardian verify
npm test
\`\`\`

## 环境变量

| 名称 | 是否必填 | 说明 | 示例 |
| --- | --- | --- | --- |
| 无 | 否 | 测试不需要环境变量 | 不写入敏感信息 |

## 重要约束

- 初始化不能覆盖已有记忆。
- 中文模板必须保持可读。
- 文档校验要能区分真实中文内容和仍然空着的模板字段。
- 同一项目初始化后应保持固定语言，避免后续自动生成内容在中英文之间来回切换。

## AI 注意事项

- 修改前阅读记忆文件。
- 不写入真实密钥。
- 回答中文问题时优先引用中文记忆文件，并说明信息来自哪个文件。
`,
    );
    writeFile(
      path.join(root, "memory/STATE.md"),
      `# 项目状态

最后更新：2026-05-15

## 当前状态

- 中文记忆文件已经填入真实测试内容。
- 当前测试重点是确认中文标题、中文字段、中文日期和中文最新变更都能被识别。
- 该状态文件模拟真实团队接入后的第一版说明，而不是初始化后未填写的空模板。

## 已完成

- 中文上下文、状态、决策、变更日志和交接指南已经准备好。

## 进行中

- 运行中文文档校验。

## 下一步

1. 保持中文模板和校验规则一致。

## 已知问题

| 问题 | 影响 | 负责人 | 备注 |
| --- | --- | --- | --- |
| 查询仍是关键词 | 语义问题可能漏掉 | 维护者 | 后续可增强 |

## 风险区域

- 中文字段不要被英文校验规则误判为空。
- 如果未来调整校验阈值，需要继续保证中文内容不会因为标点差异被错误扣减。
- 如果团队切换到英文模板，应先确认配置和已有记忆语言一致。

## 最新 AI 协助变更

- 任务：准备中文测试记忆。
- 总结：填充中文内容用于验证。
- 文件：中文项目记忆文件。
- 验证：guardian validate-docs。
- 后续：继续保持测试覆盖。
`,
    );
    writeFile(
      path.join(root, "memory/DECISIONS.md"),
      `# 决策记录

## 有效决策

### 2026-05-15 - 支持中文项目记忆

- 背景：目标团队主要使用中文交接和中文 AI 对话。
- 决策：校验器必须接受中文标题和中文字段。
- 备选方案：只保留英文模板。
- 影响文件/模块：中文模板和文档校验。
- 关联变更：新增中文初始化能力。
- 验证方式：运行 guardian validate-docs。
- 风险：中英文混用时需要兼容。
- 复审时间：2026-06-15。
- 后续动作：继续补充中文用例。
`,
    );
    writeFile(
      path.join(root, "memory", "AI_CHANGELOG.md"),
      `# AI 变更日志

## 2026 记录

### 2026-05-15 10:00 - 准备中文测试记忆

- 用户需求：验证中文文档可以通过校验。
- AI 总结：创建中文项目记忆内容。
- 变更文件：中文记忆文件。
- 业务原因：中文团队需要中文交接。
- 技术说明：使用中文标题和中文字段。
- 验证方式：guardian validate-docs。
- 风险：需要避免空字段。
- 敏感信息检查：没有加入真实密钥。
- 下一步：保持测试覆盖。
`,
    );
    writeFile(
      path.join(root, "memory", "HANDOVER.md"),
      `# 交接指南

最后生成：2026-05-15

## 优先阅读

1. memory/PROJECT_CONTEXT.md
2. memory/STATE.md
3. memory/DECISIONS.md
4. memory/AI_CHANGELOG.md

## 如何运行

\`\`\`bash
guardian verify
\`\`\`

## 项目地图

| 区域 | 文件 | 用途 |
| --- | --- | --- |
| 记忆 | memory/PROJECT_CONTEXT.md, memory/STATE.md | 中文上下文 |

## 核心流程

- 读取中文记忆。
- 运行校验。
- 根据校验结果补齐项目背景、当前状态、决策原因和交接步骤。
- 完成修改后再次运行 guardian verify，确认中文内容没有停留在模板状态。

## 常见问题

| 问题 | 可能原因 | 处理方式 |
| --- | --- | --- |
| 校验失败 | 字段为空 | 补齐内容 |

## 风险区域

- 注意中英文混用。
- 如果新人看到英文和中文混在同一个项目里，应先检查 project-guardian.config.json 的 language 配置。
- 如果交接指南由命令生成，也需要人工确认运行命令和风险提示是否符合真实项目。

## 新人第一天

1. 阅读项目记忆。
2. 运行 guardian doctor。
3. 运行 guardian verify。
4. 选择小任务。
5. 更新记忆。
`,
    );
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
    fs.appendFileSync(path.join(root, "memory", "AI_CHANGELOG.md"), "\n- Next step: TODO fill this before commit.\n", "utf8");
    git(root, ["add", "src/app.js", "memory/AI_CHANGELOG.md"]);
    const result = run(root, ["check"]);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /latest changelog entry must not contain TODO|memory document quality issues/i);
  } finally {
    cleanup(root);
  }
});

test("check treats memory/decisions entries as memory updates", () => {
  const root = tempDir("check-decision-file-memory");
  try {
    writeValidMemory(root);
    initGit(root);
    writeFile(path.join(root, "src", "app.js"), "console.log('hello');\n");
    writeFile(path.join(root, "memory", "decisions", "2026-05-14-test-decision.md"), "# Test decision\n\nThe source change is covered by a decision note.\n");
    git(root, ["add", "src/app.js", "memory/decisions/2026-05-14-test-decision.md"]);
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
    assert.match(fs.readFileSync(path.join(root, "memory/DECISIONS.md"), "utf8"), /Use JSON config/);
    assert.ok(fs.readdirSync(path.join(root, "memory", "decisions")).some((file) => file.includes("use-json-config")));
    assert.equal(run(root, ["validate-docs"]).status, 0);
  } finally {
    cleanup(root);
  }
});

test("decision add uses Chinese fields for Chinese projects", () => {
  const root = tempDir("decision-add-zh");
  try {
    const initResult = run(root, ["init"]);
    assert.equal(initResult.status, 0, `${initResult.stdout}\n${initResult.stderr}`);
    const result = run(root, [
      "decision",
      "add",
      "--title",
      "支持中文模板",
      "--context",
      "团队主要使用中文交接。",
      "--decision",
      "默认生成中文项目记忆。",
      "--verification",
      "运行中文初始化测试。",
    ]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const decisions = fs.readFileSync(path.join(root, "memory/DECISIONS.md"), "utf8");
    assert.match(decisions, /- 背景：团队主要使用中文交接。/);
    assert.match(decisions, /- 决策：默认生成中文项目记忆。/);
    assert.match(decisions, /- 决策文件：`memory\/decisions\//);
  } finally {
    cleanup(root);
  }
});

test("reviews due blocks verify until review is completed", () => {
  const root = tempDir("reviews-due");
  try {
    initGit(root);
    writeValidMemory(root);
    const reviewFile = path.join(root, "memory", "decisions", "2026-05-01-risk-review.md");
    writeFile(
      reviewFile,
      `# Risk review

Date: 2026-05-01

## Decision Record

### 2026-05-01 - Risk review

- Context: A risky workflow changed and needs follow-up.
- Decision: Schedule a review to verify the workflow remains valid.
- Alternatives considered: No review.
- Affected files/modules: src/risk.js
- Related change: test change
- Verification: Run guardian verify.
- Risks: The workflow may no longer be valid.
- Review after: 2026-05-01.
- Follow-up: Complete the review when due.
`,
    );

    const due = run(root, ["reviews", "due"]);
    assert.notEqual(due.status, 0, `${due.stdout}\n${due.stderr}`);
    assert.match(`${due.stdout}\n${due.stderr}`, /review due since 2026-05-01|Decision review check failed/);

    const failedVerify = run(root, ["verify"]);
    assert.notEqual(failedVerify.status, 0, `${failedVerify.stdout}\n${failedVerify.stderr}`);
    assert.match(`${failedVerify.stdout}\n${failedVerify.stderr}`, /review due since 2026-05-01/);

    const complete = run(root, [
      "reviews",
      "complete",
      "2026-05-01-risk-review.md",
      "--summary",
      "Still valid after review.",
      "--verification",
      "Ran guardian verify.",
      "--reviewer",
      "AI reviewer",
    ]);
    assert.equal(complete.status, 0, `${complete.stdout}\n${complete.stderr}`);
    const updated = fs.readFileSync(reviewFile, "utf8");
    assert.match(updated, /Review status: completed/);
    assert.match(updated, /Further review: no further review needed/);

    const passedDue = run(root, ["reviews", "due"]);
    assert.equal(passedDue.status, 0, `${passedDue.stdout}\n${passedDue.stderr}`);
    const passedVerify = run(root, ["verify"]);
    assert.equal(passedVerify.status, 0, `${passedVerify.stdout}\n${passedVerify.stderr}`);
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
    fs.appendFileSync(path.join(root, "memory", "AI_CHANGELOG.md"), `\n- Debug note: api_key=${fakeValue}\n`, "utf8");
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
    writeFile(path.join(root, "memory", "decisions", "2026-05-14-risk.md"), "# Risk\n\napi_key=ZZZZyyyy1234_SECRET\n");
    const result = run(root, ["scan-secrets"]);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /memory\/decisions\/2026-05-14-risk\.md/);
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

test("brief recommends relevant memory files and token budget", () => {
  const root = tempDir("brief");
  try {
    writeValidMemory(root);
    const result = run(root, ["brief", "MCP security history", "--limit", "2"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Project Guardian brief/);
    assert.match(result.stdout, /memory\/PROJECT_CONTEXT\.md/);
    assert.match(result.stdout, /memory\/STATE\.md/);
    assert.match(result.stdout, /memory\/DECISIONS\.md/);
    assert.match(result.stdout, /memory\/AI_CHANGELOG\.md/);
    assert.match(result.stdout, /Estimated savings/);
    assert.match(result.stdout, /guardian query "MCP security history" --limit 2/);
  } finally {
    cleanup(root);
  }
});

test("brief supports quick deep and full reading modes", () => {
  const root = tempDir("brief-modes");
  try {
    writeValidMemory(root);
    const quick = run(root, ["brief", "routine status", "--mode", "quick"]);
    assert.equal(quick.status, 0, `${quick.stdout}\n${quick.stderr}`);
    assert.match(quick.stdout, /Mode: quick/);
    assert.doesNotMatch(quick.stdout.split("Recommended for this task:")[1], /memory\/AI_CHANGELOG\.md/);

    const deep = run(root, ["brief", "routine status", "--mode", "deep"]);
    assert.equal(deep.status, 0, `${deep.stdout}\n${deep.stderr}`);
    assert.match(deep.stdout, /Mode: deep/);
    assert.match(deep.stdout.split("Recommended for this task:")[1], /memory\/DECISIONS\.md/);
    assert.match(deep.stdout.split("Recommended for this task:")[1], /memory\/AI_CHANGELOG\.md/);

    const full = run(root, ["brief", "routine status", "--mode", "full"]);
    assert.equal(full.status, 0, `${full.stdout}\n${full.stderr}`);
    assert.match(full.stdout, /Mode: full/);
    assert.match(full.stdout.split("Recommended for this task:")[1], /memory\/HANDOVER\.md/);
    assert.match(full.stdout, /Escalate to deep\/full when/);
  } finally {
    cleanup(root);
  }
});

test("brief rejects unsupported or missing reading mode values", () => {
  const root = tempDir("brief-mode-invalid");
  try {
    writeValidMemory(root);
    const unsupported = run(root, ["brief", "memory", "--mode", "unsafe"]);
    assert.notEqual(unsupported.status, 0, `${unsupported.stdout}\n${unsupported.stderr}`);
    assert.match(`${unsupported.stdout}\n${unsupported.stderr}`, /brief --mode must be one of: auto, quick, deep, full/);

    const missing = run(root, ["brief", "memory", "--mode"]);
    assert.notEqual(missing.status, 0, `${missing.stdout}\n${missing.stderr}`);
    assert.match(`${missing.stdout}\n${missing.stderr}`, /brief --mode must be one of: auto, quick, deep, full/);
  } finally {
    cleanup(root);
  }
});

test("query limit controls source output count", () => {
  const root = tempDir("query-limit");
  try {
    writeValidMemory(root);
    const result = run(root, ["query", "memory", "--limit", "2"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const sourceCount = (result.stdout.match(/Source:/g) || []).length;
    assert.ok(sourceCount > 0, result.stdout);
    assert.ok(sourceCount <= 2, result.stdout);
  } finally {
    cleanup(root);
  }
});

test("query supports Chinese keywords", () => {
  const root = tempDir("query-zh");
  try {
    const initResult = run(root, ["init"]);
    assert.equal(initResult.status, 0, `${initResult.stdout}\n${initResult.stderr}`);
    writeFile(
      path.join(root, "memory/PROJECT_CONTEXT.md"),
      "# 项目上下文\n\n## 项目概览\n\n验证码登录模块负责短信验证码校验和登录风控。\n",
    );
    const result = run(root, ["query", "验证码登录"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Source:/);
    assert.match(result.stdout, /验证码登录模块/);
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
    fs.writeFileSync(path.join(root, "memory/STATE.md"), fs.readFileSync(path.join(root, "memory/STATE.md"), "utf8").replace("The test project has enough filled memory", "The other branch has enough filled memory"), "utf8");
    git(root, ["add", "memory/STATE.md"]);
    git(root, ["commit", "-m", "other state"]);
    git(root, ["checkout", "master"]);
    fs.writeFileSync(path.join(root, "memory/STATE.md"), fs.readFileSync(path.join(root, "memory/STATE.md"), "utf8").replace("The test project has enough filled memory", "The master branch has enough filled memory"), "utf8");
    git(root, ["add", "memory/STATE.md"]);
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
