#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { addDecision } = require("./lib/decisions");
const { latestChangelog } = require("./lib/doc-validation");
const { changedFilesForUpdate, collectFiles, git, gitChangeSummary, changedLineRanges } = require("./lib/git-utils");
const { generateHandover } = require("./lib/handover");
const { buildBrief, formatBrief } = require("./lib/brief");
const { chunks, formatResults, searchIndex } = require("./lib/knowledge");
const { runMcpServer } = require("./lib/mcp");
const { printReviewValidation, reviews, runReviewValidation } = require("./lib/reviews");
const { runSecretScan } = require("./lib/security");
const { ensureInitialized, fail, getCoreMemoryFiles, lines, parseFlags, readMaybe, relative, timestamp, unique } = require("./lib/shared");
const { CONFIG_FILE, DEFAULT_CONFIG, isChinese, loadConfig } = require("./lib/config");
const { setLanguage, t } = require("./lib/messages");
const { SUPPORTED_ADAPTERS } = require("./lib/adapters");
const { init, installAdapters, adaptersDoctor, resolveAdaptersOrFail } = require("./lib/init");
const { runDoctor, runCheck, printDoctor, printCheck, printDocValidation, printSecretScan, finish, isMemoryFile, isMemoryRelatedFile, isDecisionDirectoryFile, getKnowledgeFiles, memoryContainsPattern } = require("./lib/check");
const { installHooks, installCi } = require("./lib/hooks-ci");
const { migrateMemory } = require("./lib/migrate");
const { repairMemory } = require("./lib/memory-repair");
const { update, appendMemory } = require("./lib/update");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const DEFAULT_QUERY_LIMIT = 6;
const MAX_QUERY_LIMIT = 10;
const BRIEF_MODES = ["auto", "quick", "deep", "full"];

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const root = process.cwd();
  setLanguage(loadConfig(root).language);

  switch (command) {
    case "init":
      init(root, args, __filename);
      break;
    case "update":
      update(root, args);
      break;
    case "append-memory":
      appendMemory(root, args);
      break;
    case "handover":
      handover(root);
      break;
    case "check":
      check(root);
      break;
    case "doctor":
      doctor(root);
      break;
    case "validate-docs":
      validateDocs(root);
      break;
    case "verify":
      verify(root);
      break;
    case "scan-secrets":
      scanSecrets(root);
      break;
    case "brief":
      brief(root, args);
      break;
    case "query":
      {
        const flags = parseFlags(args);
        const limit = parseQueryLimit(flags.limit);
        const question = flags._.join(" ").trim();
        if (question) {
          queryOnce(root, question, limit);
        } else {
          await queryLoop(root, limit);
        }
      }
      break;
    case "decision-add":
      await addDecision(root, args);
      break;
    case "decision":
      if (args[0] === "add") {
        await addDecision(root, args.slice(1));
      } else {
        fail("Unknown decision command. Use: guardian decision add --title \"Decision title\"");
      }
      break;
    case "reviews":
    case "review":
      reviews(root, args);
      break;
    case "conflicts":
      conflicts(root);
      break;
    case "install-adapters":
      installAdapters(root, args);
      break;
    case "adapters":
      if (args[0] === "doctor") {
        adaptersDoctor(root);
      } else {
        fail("Unknown adapters command. Use: guardian adapters doctor");
      }
      break;
    case "mcp":
      runMcpServer({ root, guardianScript: __filename, mcpConfig: loadConfig(root).mcp });
      break;
    case "install-hooks":
      installHooks(root, __filename);
      break;
    case "install-ci":
      installCi(root);
      break;
    case "migrate-memory":
      migrateMemory(root);
      break;
    case "repair-memory":
      repairMemory(root, args);
      break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      help();
      break;
    case "version":
    case "--version":
    case "-v":
      console.log(readPluginVersion());
      break;
    default:
      fail(`Unknown command: ${command}\nRun: node ${relative(root, __filename)} help`);
  }
}

function handover(root) {
  const result = generateHandover(root);
  console.log(`Generated ${result.path}.`);
  const { runDocValidation } = require("./lib/doc-validation");
  const config = loadConfig(root);
  ensureInitialized(root, config);
  const result2 = runDocValidation(root, config);
  printDocValidation(result2, false);
  finish(result2.ok);
}

function check(root, options = {}) {
  const config = loadConfig(root);
  ensureInitialized(root, config);
  const result = runCheck(root, config);
  printCheck(result, options.silent);
  return finish(result.ok, options.exitOnFailure);
}

function doctor(root, options = {}) {
  const config = loadConfig(root);
  const result = runDoctor(root, config);
  printDoctor(result, options.silent);
  return finish(result.ok, options.exitOnFailure);
}

function validateDocs(root, options = {}) {
  const { runDocValidation } = require("./lib/doc-validation");
  const config = loadConfig(root);
  ensureInitialized(root, config);
  const result = runDocValidation(root, config);
  printDocValidation(result, options.silent);
  return finish(result.ok, options.exitOnFailure);
}

function scanSecrets(root, options = {}) {
  const config = loadConfig(root);
  const result = runSecretScan(root, config);
  printSecretScan(result, options.silent);
  return finish(result.ok, options.exitOnFailure);
}

function verify(root) {
  const config = loadConfig(root);
  const steps = [
    ["doctor", runDoctor(root, config), printDoctor],
    ["check", runCheck(root, config), printCheck],
    ["validate-docs", (() => { const { runDocValidation } = require("./lib/doc-validation"); return runDocValidation(root, config); })(), printDocValidation],
    ["reviews", runReviewValidation(root, config), printReviewValidation],
  ];
  if (config.security.scanSecrets) {
    steps.push(["scan-secrets", runSecretScan(root, config), printSecretScan]);
  }

  let ok = true;
  for (const [, result, printer] of steps) {
    printer(result, false);
    ok = ok && result.ok;
  }
  if (!ok) {
    fail(t("verify.failed"));
  }
  console.log(t("verify.passed"));
}

async function queryLoop(root, limit = DEFAULT_QUERY_LIMIT) {
  const config = loadConfig(root);
  ensureInitialized(root, config);
  const index = buildIndex(root, config);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "guardian> ",
  });

  console.log("Project Guardian query loop. Ask project questions, or type `exit`.");
  rl.prompt();

  for await (const input of rl) {
    const question = input.trim();
    if (!question) {
      rl.prompt();
      continue;
    }
    if (["exit", "quit", "q"].includes(question.toLowerCase())) {
      rl.close();
      break;
    }
    console.log(formatResults(searchIndex(index, question, limit)));
    console.log("Suggested next question: ask `why`, `risk`, `next step`, or a specific file/module name.");
    rl.prompt();
  }
}

function queryOnce(root, question, limit = DEFAULT_QUERY_LIMIT) {
  const config = loadConfig(root);
  ensureInitialized(root, config);
  const index = buildIndex(root, config);
  console.log(formatResults(searchIndex(index, question, limit)));
}

function brief(root, args = []) {
  const config = loadConfig(root);
  ensureInitialized(root, config);
  const flags = parseFlags(args);
  const limit = parseQueryLimit(flags.limit === undefined ? 3 : flags.limit);
  const mode = parseBriefMode(flags.mode);
  const question = flags._.join(" ").trim();
  console.log(formatBrief(buildBrief(root, config, question, limit, mode)));
}

function conflicts(root) {
  const config = loadConfig(root);
  const files = lines(git(root, ["diff", "--name-only", "--diff-filter=U"]));
  console.log("Project Guardian conflict report");
  console.log("");
  if (files.length === 0) {
    console.log("No merge conflicts detected.");
    return;
  }

  console.log("Conflicted files:");
  for (const file of files) console.log(`- ${file}`);

  const memoryConflicts = files.filter((file) => isMemoryRelatedFile(file, config) || isDecisionDirectoryFile(file, config));
  if (memoryConflicts.length > 0) {
    console.log("");
    console.log("Project memory conflicts:");
    for (const file of memoryConflicts) console.log(`- ${file}`);
    console.log("");
    console.log("Recommended resolution:");
    console.log("1. Preserve useful historical entries from both sides instead of deleting one side blindly.");
    console.log(`2. Keep \`Last updated\` accurate in ${config.memoryFiles.state}.`);
    console.log(`3. For ${config.memoryFiles.decisions} or ${config.memoryFiles.decisionsDirectory} conflicts, keep the decision reason, affected files, verification, risks, and follow-up.`);
    console.log("4. After resolving, run `guardian validate-docs` and `guardian verify`.");
  } else {
    console.log("");
    console.log("No project memory files are conflicted. Resolve code conflicts, then update memory if behavior changes.");
  }
  process.exit(1);
}

function buildIndex(root, config) {
  const docs = [];
  for (const file of getKnowledgeFiles(config)) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) docs.push(...chunks(file, fs.readFileSync(full, "utf8"), 900, 160, "knowledge"));
  }
  docs.push(...buildGitHistoryDocs(root));
  for (const file of collectFiles(root, config, 300)) {
    if (isMemoryFile(file, config) || file.includes("node_modules")) continue;
    const text = readMaybe(path.join(root, file));
    if (text) docs.push(...chunks(file, text, 700, 120, "source"));
  }
  return docs;
}

function buildGitHistoryDocs(root) {
  const history = git(root, ["log", "-n", "80", "--date=short", "--pretty=format:%h %ad %an %s", "--name-only"]);
  return history ? chunks("git-history", history, 1200, 200, "history") : [];
}

function parseQueryLimit(value) {
  if (value === undefined) return DEFAULT_QUERY_LIMIT;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_QUERY_LIMIT) fail(`query --limit must be an integer from 1 to ${MAX_QUERY_LIMIT}`);
  return limit;
}

function parseBriefMode(value) {
  if (value === undefined) return "auto";
  if (value === true) fail(`brief --mode must be one of: ${BRIEF_MODES.join(", ")}`);
  const mode = String(value).trim().toLowerCase();
  if (!BRIEF_MODES.includes(mode)) fail(`brief --mode must be one of: ${BRIEF_MODES.join(", ")}`);
  return mode;
}

function readPluginVersion() {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, ".codex-plugin", "plugin.json"), "utf8"));
    return manifest.version || "0.0.0";
  } catch (_) {
    return "0.0.0";
  }
}

function help() {
  console.log(`Project Guardian

Usage:
  guardian init
  guardian init --language zh-CN
  guardian init --language en
  guardian init --adapter all
  guardian update "task summary"
  guardian update "task summary" --summary "what changed" --reason "why" --verification "checks" --risks "risks" --sensitive-data "checked" --next-step "follow-up"
  guardian append-memory --file STATE --template state-progress --task "Task" --current-status "Status" --next-step "Next" --verification "Checks"
  guardian append-memory --templates
  guardian decision add --title "Decision title" --context "Why" --decision "What"
  guardian reviews
  guardian reviews due
  guardian reviews complete memory/decisions/example.md --summary "Still valid" --verification "Checked tests"
  guardian handover
  guardian check
  guardian doctor
  guardian validate-docs
  guardian scan-secrets
  guardian verify
  guardian brief "task or question" --mode auto
  guardian query "question" --limit 3
  guardian conflicts
  guardian install-adapters --adapter cursor,copilot
  guardian adapters doctor
  guardian mcp
  guardian install-hooks
  guardian install-ci
  guardian migrate-memory
  guardian repair-memory
  guardian repair-memory --write

Controlled command runner for AI IDEs:
  guardian-cmd list
  guardian-cmd guardian-verify
  node plugins/project-guardian/cmd/guardian-cmd.js list

Commands:
  init           Create standard project memory files, AI rules, and config. Default language is zh-CN; use --language en for English templates.
  update         Append an AI-assisted change record and refresh the state memory file.
  append-memory  Append a guarded manual memory note using templates shared with the Run UI.
  decision add   Append a structured decision entry.
  reviews       List scheduled decision reviews, fail on due reviews, or mark a review completed.
  handover      Generate the configured handover memory file from current memory and project files.
  check         Fail when code changed but memory was not updated or is low quality.
  doctor        Audit memory files, AI rules, config, and git change state.
  validate-docs Fail when memory docs are missing required substance.
  scan-secrets  Scan memory files for likely secrets without printing full values.
  verify        Run doctor, check, validate-docs, and configured security scans.
  brief         Print a budget-aware reading plan and token estimate. Use --mode quick, deep, full, or auto.
  query         Search project memory, source files, and git history.
  conflicts     Show Git merge conflicts and memory conflict resolution advice.
  install-adapters Install AI-tool rule adapters: ${SUPPORTED_ADAPTERS.join(", ")}, or all.
  adapters doctor Show which AI IDE adapters are installed or missing.
  mcp           Start a stdio MCP server exposing Project Guardian tools.
  install-hooks Install a pre-commit hook that runs configured checks.
  install-ci    Install a Gitee Go workflow template.
  migrate-memory Move memory files to memory/ directory and update config.
  repair-memory Check changelog ordering and decision-index drift; use --write to apply deterministic repairs.
`);
}

main().catch((error) => fail(error.stack || error.message));
