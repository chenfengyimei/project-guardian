#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const LOG_DIR = ".project-guardian";
const LOG_FILE = "cmd-audit.jsonl";
const MAX_ARG_LENGTH = 240;
const MAX_OUTPUT_BUFFER = 10 * 1024 * 1024;
const GUARDIAN_SCRIPT = path.resolve(__dirname, "..", "scripts", "guardian.js");
const NPM_SPEC = resolveNpmSpec();

class CmdError extends Error {
  constructor(message, exitCode = 2) {
    super(message);
    this.exitCode = exitCode;
  }
}

const COMMANDS = new Map();

registerBuiltin("help", "Show guardian-cmd usage.", helpText);
registerBuiltin("list", "List available controlled command replacements.", listText);
registerBuiltin("log-path", "Print the command audit log path.", (_, cwd) => `${logPath(cwd)}\n`);
registerBuiltin("pwd", "Print the current working directory.", (_, cwd) => `${path.resolve(cwd)}\n`);
registerBuiltin("ls", "List files in a relative project directory.", (args, cwd) => listDirectory(cwd, args));

registerExec("git-status", "Run git status --short --branch.", "git", () => ["status", "--short", "--branch"], { noArgs: true });
registerExec("git-diff-stat", "Run git diff --stat, optionally with --cached.", "git", (args) => ["diff", ...cachedFlag(args), "--stat"]);
registerExec("git-diff-name-only", "Run git diff --name-only, optionally with --cached.", "git", (args) => ["diff", ...cachedFlag(args), "--name-only"]);
registerExec("git-diff-check", "Run git diff --check.", "git", () => ["diff", "--check"], { noArgs: true });
registerExec("git-log", "Run git log --oneline with --limit N.", "git", (args) => ["log", "--oneline", "-n", String(limitFlag(args, 10, 1, 100))]);

registerExec("npm-lint", "Run npm run lint.", NPM_SPEC.executable, () => [...NPM_SPEC.prefixArgs, "run", "lint"], { noArgs: true });
registerExec("npm-test", "Run npm test.", NPM_SPEC.executable, () => [...NPM_SPEC.prefixArgs, "test"], { noArgs: true });
registerExec("npm-verify", "Run npm run verify.", NPM_SPEC.executable, () => [...NPM_SPEC.prefixArgs, "run", "verify"], { noArgs: true });
registerExec("npm-audit", "Run npm audit --audit-level=moderate.", NPM_SPEC.executable, () => [...NPM_SPEC.prefixArgs, "audit", "--audit-level=moderate"], { noArgs: true });

registerExec("node-check", "Run node --check for a relative project file.", process.execPath, (args, cwd) => ["--check", relativeFileArg(cwd, args, "node-check")]);

registerGuardian("guardian-help", "Run Project Guardian help.", ["help"]);
registerGuardianPassthrough("guardian-init", "Run Project Guardian init with optional flags.", ["init"], { allowEmpty: true });
registerGuardianPassthrough("guardian-update", "Run Project Guardian update with a task summary.", ["update"]);
registerGuardianPassthrough("guardian-append-memory", "Run Project Guardian append-memory with provided flags.", ["append-memory"]);
registerGuardianPassthrough("guardian-decision-add", "Run Project Guardian decision add with provided fields.", ["decision", "add"]);
registerGuardian("guardian-doctor", "Run Project Guardian doctor.", ["doctor"]);
registerGuardian("guardian-check", "Run Project Guardian check.", ["check"]);
registerGuardian("guardian-validate-docs", "Run Project Guardian validate-docs.", ["validate-docs"]);
registerGuardian("guardian-verify", "Run Project Guardian verify.", ["verify"]);
registerGuardian("guardian-scan-secrets", "Run Project Guardian scan-secrets.", ["scan-secrets"]);
registerGuardian("guardian-reviews", "Run Project Guardian reviews.", ["reviews"]);
registerGuardian("guardian-reviews-due", "Run Project Guardian reviews due.", ["reviews", "due"]);
registerGuardianPassthrough("guardian-reviews-complete", "Run Project Guardian reviews complete for a decision file.", ["reviews", "complete"]);
registerGuardian("guardian-handover", "Run Project Guardian handover.", ["handover"]);
registerGuardian("guardian-conflicts", "Run Project Guardian conflicts.", ["conflicts"]);
registerGuardianPassthrough("guardian-install-adapters", "Run Project Guardian install-adapters with provided flags.", ["install-adapters"]);
registerGuardian("guardian-adapters-doctor", "Run Project Guardian adapters doctor.", ["adapters", "doctor"]);
registerGuardian("guardian-install-hooks", "Run Project Guardian install-hooks.", ["install-hooks"]);
registerGuardian("guardian-install-ci", "Run Project Guardian install-ci.", ["install-ci"]);
registerGuardianPassthrough("guardian-query", "Run Project Guardian query with provided question and flags.", ["query"]);
registerGuardianPassthrough("guardian-brief", "Run Project Guardian brief with provided task/question and flags.", ["brief"]);

function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  const startedAt = Date.now();
  const parsed = parseInvocation(argv);
  const event = {
    timestamp: new Date().toISOString(),
    method: parsed.method,
    args: sanitizeArgs(parsed.args),
    cwd: path.resolve(cwd),
  };

  try {
    const result = execute(parsed.method, parsed.args, cwd);
    event.kind = result.kind;
    event.ok = result.exitCode === 0;
    event.exitCode = result.exitCode;
    event.durationMs = Date.now() - startedAt;
    if (result.error) event.error = sanitizeText(result.error, MAX_ARG_LENGTH);
    const logError = recordCommandLog(cwd, event);
    if (logError) {
      console.error(logError);
      return result.exitCode === 0 ? 1 : result.exitCode;
    }
    return result.exitCode;
  } catch (error) {
    const exitCode = Number.isInteger(error.exitCode) ? error.exitCode : 1;
    event.kind = "error";
    event.ok = false;
    event.exitCode = exitCode;
    event.durationMs = Date.now() - startedAt;
    event.error = sanitizeText(error.message, MAX_ARG_LENGTH);
    console.error(error.message);
    const logError = recordCommandLog(cwd, event);
    if (logError) console.error(logError);
    return exitCode;
  }
}

function parseInvocation(argv) {
  if (argv[0] === "run") {
    if (!argv[1]) throw new CmdError("Missing command id. Use: guardian-cmd list");
    return { method: argv[1], args: argv.slice(2) };
  }
  return { method: argv[0] || "help", args: argv.slice(1) };
}

function execute(method, args, cwd) {
  const command = COMMANDS.get(method);
  if (!command) throw new CmdError(`Unknown controlled command: ${method}\nRun: guardian-cmd list`);

  if (command.noArgs && args.length > 0) {
    throw new CmdError(`${method} does not accept extra arguments.`);
  }

  if (command.type === "builtin") {
    const output = command.run(args, cwd);
    if (output) process.stdout.write(output);
    return { kind: "builtin", exitCode: 0 };
  }

  const spec = command.build(args, cwd);
  const child = spawnSync(spec.executable, spec.args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: MAX_OUTPUT_BUFFER,
    shell: false,
  });
  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);
  if (child.error) {
    return { kind: command.kind, exitCode: 1, error: child.error.message };
  }
  return { kind: command.kind, exitCode: Number.isInteger(child.status) ? child.status : 1 };
}

function registerBuiltin(id, description, run) {
  COMMANDS.set(id, { id, description, kind: "builtin", type: "builtin", run });
}

function registerExec(id, description, executable, buildArgs, options = {}) {
  COMMANDS.set(id, {
    id,
    description,
    executable,
    kind: options.kind || "exec",
    noArgs: Boolean(options.noArgs),
    type: "exec",
    build: (args, cwd) => ({ executable, args: buildArgs(args, cwd) }),
  });
}

function registerGuardian(id, description, guardianArgs) {
  registerExec(id, description, process.execPath, () => [GUARDIAN_SCRIPT, ...guardianArgs], { noArgs: true, kind: "guardian" });
}

function registerGuardianPassthrough(id, description, guardianArgs, options = {}) {
  registerExec(id, description, process.execPath, (args) => {
    if (!options.allowEmpty && args.length === 0) throw new CmdError(`${id} requires arguments.`);
    return [GUARDIAN_SCRIPT, ...guardianArgs, ...args];
  }, { kind: "guardian" });
}

function resolveNpmSpec() {
  const candidate = process.env.npm_execpath || path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  if (candidate && fs.existsSync(candidate)) {
    return { executable: process.execPath, prefixArgs: [candidate] };
  }
  return { executable: process.platform === "win32" ? "npm.cmd" : "npm", prefixArgs: [] };
}

function cachedFlag(args) {
  if (args.length === 0) return [];
  if (args.length === 1 && args[0] === "--cached") return ["--cached"];
  throw new CmdError("Only --cached is allowed for this git diff command.");
}

function limitFlag(args, defaultValue, min, max) {
  if (args.length === 0) return defaultValue;
  let value = "";
  if (args.length === 1) value = args[0];
  else if (args.length === 2 && args[0] === "--limit") value = args[1];
  else throw new CmdError("Use: guardian-cmd git-log --limit 10");
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new CmdError(`Limit must be an integer from ${min} to ${max}.`);
  }
  return parsed;
}

function relativeFileArg(cwd, args, commandId) {
  if (args.length !== 1) throw new CmdError(`Use: guardian-cmd ${commandId} path/to/file.js`);
  const relative = normalizeRelativePath(args[0]);
  const full = path.join(cwd, relative);
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    throw new CmdError(`File not found: ${relative}`);
  }
  return relative;
}

function normalizeRelativePath(value) {
  const relative = String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!relative || path.isAbsolute(relative) || relative.split("/").includes("..")) {
    throw new CmdError("Path must be relative and stay inside the project.");
  }
  return relative;
}

function listDirectory(cwd, args) {
  if (args.length > 1) throw new CmdError("Use: guardian-cmd ls [relative/path]");
  const relative = args.length ? normalizeRelativePath(args[0]) : ".";
  const full = path.join(cwd, relative);
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) {
    throw new CmdError(`Directory not found: ${relative}`);
  }
  return fs.readdirSync(full)
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      const item = path.join(full, name);
      return fs.statSync(item).isDirectory() ? `${name}/` : name;
    })
    .join("\n") + "\n";
}

function helpText() {
  return [
    "Project Guardian controlled command runner",
    "",
    "Usage:",
    "  guardian-cmd list",
    "  guardian-cmd <command-id> [args]",
    "  node plugins/project-guardian/cmd/guardian-cmd.js <command-id> [args]",
    "",
    "Every invocation appends one JSONL line to .project-guardian/cmd-audit.jsonl.",
    "Commands are fixed and do not use shell string execution.",
    "",
    "Examples:",
    "  guardian-cmd git-status",
    "  guardian-cmd npm-test",
    "  guardian-cmd node-check plugins/project-guardian/scripts/guardian.js",
    "  guardian-cmd guardian-query \"MCP risk\" --limit 3",
    "",
  ].join("\n");
}

function listText() {
  return Array.from(COMMANDS.values())
    .map((command) => `${command.id}\t${command.description}`)
    .join("\n") + "\n";
}

function appendCommandLog(cwd, event) {
  fs.mkdirSync(path.join(cwd, LOG_DIR), { recursive: true });
  fs.appendFileSync(logPath(cwd), `${JSON.stringify(event)}\n`, "utf8");
}

function recordCommandLog(cwd, event) {
  try {
    appendCommandLog(cwd, event);
    return "";
  } catch (error) {
    return `Failed to write command audit log: ${sanitizeText(error.message, MAX_ARG_LENGTH)}`;
  }
}

function logPath(cwd) {
  return path.join(cwd, LOG_DIR, LOG_FILE);
}

function sanitizeArgs(args) {
  return args.map((arg) => sanitizeText(arg, MAX_ARG_LENGTH)).slice(0, 40);
}

function sanitizeText(value, limit) {
  return redactLikelySecret(String(value || "").replace(/\s+/g, " ").trim()).slice(0, limit);
}

function redactLikelySecret(value) {
  return value
    .replace(/\b(password|passwd|secret|token|api[_-]?key|private[_-]?key)\b\s*[:=]\s*["']?[^"'\s]+/gi, "$1=[redacted]")
    .replace(/[A-Za-z0-9+/=_-]{40,}/g, "[redacted-token]");
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  COMMANDS,
  LOG_DIR,
  LOG_FILE,
  appendCommandLog,
  logPath,
  main,
  recordCommandLog,
  sanitizeArgs,
};
