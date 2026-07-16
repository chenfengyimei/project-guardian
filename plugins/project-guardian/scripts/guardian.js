#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { addDecision } = require("./lib/decisions");
const { collectFiles, git } = require("./lib/git-utils");
const { generateHandover } = require("./lib/handover");
const { buildBrief, formatBrief } = require("./lib/brief");
const { chunks, formatResults, searchIndex } = require("./lib/knowledge");
const { runMcpServer } = require("./lib/mcp");
const { printReviewValidation, reviews, runReviewValidation } = require("./lib/reviews");
const { runSecretScan } = require("./lib/security");
const { ensureInitialized, fail, lines, parseFlags, readMaybe } = require("./lib/shared");
const { loadConfig } = require("./lib/config");
const { setLanguage, t } = require("./lib/messages");
const { init, installAdapters, adaptersDoctor } = require("./lib/init");
const { runDoctor, runCheck, printDoctor, printCheck, printDocValidation, printSecretScan, finish, isMemoryFile, isMemoryRelatedFile, isDecisionDirectoryFile, getKnowledgeFiles, memoryContainsPattern } = require("./lib/check");
const { installHooks, installCi } = require("./lib/hooks-ci");
const { migrateMemory } = require("./lib/migrate");
const { repairMemory } = require("./lib/memory-repair");
const { update, appendMemory } = require("./lib/update");
const {
  formatCommandList,
  formatHelp,
  publicCommandCatalog,
  resolveHelpRequest,
  resolveInvocation,
  unknownCommandError,
  validateInvocation,
} = require("./lib/cli-catalog");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const DEFAULT_QUERY_LIMIT = 6;
const MAX_QUERY_LIMIT = 10;
const BRIEF_MODES = ["auto", "quick", "deep", "full"];

async function main() {
  const root = process.cwd();
  const argv = process.argv.slice(2);
  const config = loadConfig(root);
  setLanguage(config.language);

  const helpRequest = resolveHelpRequest(argv);
  if (helpRequest.requested) {
    if (helpRequest.invalid) throw unknownCommandError(helpRequest.key.split(/\s+/));
    console.log(formatHelp(helpRequest.key, config.language));
    return;
  }

  const invocation = resolveInvocation(argv);
  if (!invocation) throw unknownCommandError(argv);
  validateInvocation(invocation);
  const command = invocation.spec.key;
  const args = invocation.args;

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
    case "decision add":
      await addDecision(root, args);
      break;
    case "reviews":
      reviews(root, args);
      break;
    case "reviews list":
    case "reviews status":
      reviews(root, [command.split(" ")[1], ...args]);
      break;
    case "reviews due":
      reviews(root, ["due", ...args]);
      break;
    case "reviews complete":
      reviews(root, ["complete", ...args]);
      break;
    case "conflicts":
      conflicts(root);
      break;
    case "install-adapters":
      installAdapters(root, args);
      break;
    case "adapters doctor":
      adaptersDoctor(root);
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
      migrateMemory(root, args);
      break;
    case "repair-memory":
      repairMemory(root, args);
      break;
    case "commands": {
      const flags = parseFlags(args);
      if (flags.json) console.log(JSON.stringify(publicCommandCatalog(config.language), null, 2));
      else process.stdout.write(formatCommandList(config.language));
      break;
    }
    case "version":
      console.log(readPluginVersion());
      break;
    default:
      throw unknownCommandError(argv);
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

main().catch((error) => {
  const message = process.env.PROJECT_GUARDIAN_DEBUG === "1" ? (error.stack || error.message) : (error.message || String(error));
  fail(message, error.exitCode || 1);
});
