#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");
const { execFileSync } = require("child_process");
const { DEFAULT_ADAPTERS, SUPPORTED_ADAPTERS, adapterFiles, resolveAdapters, validateAdapters } = require("./lib/adapters");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const TEMPLATE_DIR = path.join(PLUGIN_ROOT, "assets", "templates");
const CONFIG_FILE = "project-guardian.config.json";
const AGENT_RULE_FILES = ["AGENTS.md", ".cursorrules"];
const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".php",
  ".rb",
  ".cs",
  ".html",
  ".css",
  ".scss",
  ".vue",
  ".svelte",
  ".md",
  ".json",
  ".yaml",
  ".yml",
]);

const DEFAULT_CONFIG = {
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
  },
  hooks: {
    runValidateDocs: true,
  },
  ci: {
    defaultBranch: "master",
    nodeVersion: "18",
  },
  security: {
    scanSecrets: true,
  },
  adapters: DEFAULT_ADAPTERS,
  ignore: [],
};

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const root = process.cwd();

  switch (command) {
    case "init":
      init(root, args);
      break;
    case "update":
      update(root, args.join(" ").trim());
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
    case "query":
      if (args.length > 0) {
        queryOnce(root, args.join(" "));
      } else {
        await queryLoop(root);
      }
      break;
    case "decision-add":
      await decisionAdd(root, args);
      break;
    case "decision":
      if (args[0] === "add") {
        await decisionAdd(root, args.slice(1));
      } else {
        fail("Unknown decision command. Use: guardian decision add --title \"Decision title\"");
      }
      break;
    case "conflicts":
      conflicts(root);
      break;
    case "install-adapters":
      installAdapters(root, args);
      break;
    case "install-hooks":
      installHooks(root);
      break;
    case "install-ci":
      installCi(root);
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

function init(root, args = []) {
  const config = loadConfig(root);
  const flags = parseFlags(args);
  const adapters = resolveAdaptersOrFail(flags, config);
  copyTemplate(root, "PROJECT_CONTEXT.md", config.memoryFiles.context);
  copyTemplate(root, "STATE.md", config.memoryFiles.state);
  copyTemplate(root, "DECISIONS.md", config.memoryFiles.decisions);
  copyTemplate(root, "AI_CHANGELOG.md", config.memoryFiles.changelog);
  copyTemplate(root, "HANDOVER.md", config.memoryFiles.handover);
  installAdapters(root, args, { adapters, fromInit: true });
  writeDefaultConfig(root, { adapters });

  const packagePath = path.join(root, "package.json");
  if (fs.existsSync(packagePath)) {
    addPackageScripts(packagePath);
  }

  console.log("Project Guardian memory initialized.");
  console.log("Next: fill PROJECT_CONTEXT.md and run `guardian verify` before committing.");
}

function update(root, task) {
  const config = loadConfig(root);
  ensureInitialized(root, config);

  const title = task || "AI-assisted change";
  const changedFiles = changedFilesForUpdate(root);
  const diffStat = gitChangeSummary(root) || "No git diff stat available.";
  const changedLines = changedLineRanges(root);
  const entry = [
    "",
    `### ${timestamp()} - ${title}`,
    "",
    `- Human request: ${task || "TODO: describe the request."}`,
    "- AI summary: TODO: summarize what changed and why.",
    "- Files changed:",
    indentList(changedFiles.join("\n") || "No changed files detected."),
    "- Changed lines:",
    indentList(changedLines.join("\n") || "N/A"),
    "- Business reason: TODO: record the business rule, bug, or requirement behind this change.",
    "- Technical notes:",
    "  ```text",
    diffStat
      .split(/\r?\n/)
      .map((line) => `  ${line}`)
      .join("\n"),
    "  ```",
    "- Verification: TODO: record commands or manual checks.",
    "- Risks: TODO: record compatibility, data, UI, or deployment risks.",
    "- Sensitive data checked: TODO: yes/no and notes.",
    "- Next step: TODO: record what the next developer should do.",
    "",
  ].join("\n");

  fs.appendFileSync(path.join(root, config.memoryFiles.changelog), entry, "utf8");
  refreshStateLatestChange(root, config, title, changedFiles);
  console.log(`Updated ${config.memoryFiles.changelog} and ${config.memoryFiles.state}.`);
  console.log("Please replace TODO fields before committing.");
}

function handover(root) {
  const config = loadConfig(root);
  ensureInitialized(root, config);

  const files = collectFiles(root, config, 160);
  const packageInfo = readPackageInfo(root);
  const state = readMaybe(path.join(root, config.memoryFiles.state)).trim();
  const context = readMaybe(path.join(root, config.memoryFiles.context)).trim();
  const decisions = readDecisions(root, config).trim();
  const content = [
    "# Handover Guide",
    "",
    `Last generated: ${timestamp()}`,
    "",
    "## First Read",
    "",
    "Read these files before editing code:",
    "",
    `1. \`${config.memoryFiles.context}\``,
    `2. \`${config.memoryFiles.state}\``,
    `3. \`${config.memoryFiles.decisions}\``,
    `4. \`${config.memoryFiles.changelog}\``,
    "",
    "## How To Run",
    "",
    packageInfo,
    "",
    "## Project Map",
    "",
    "| Area | Files | Purpose |",
    "| --- | --- | --- |",
    ...files.slice(0, 80).map((file) => `| ${areaFor(file)} | \`${file}\` | Review this file when working in ${areaFor(file)}. |`),
    "",
    "## Current State Snapshot",
    "",
    fenced(trimForDoc(state, 3000)),
    "",
    "## Project Context Snapshot",
    "",
    fenced(trimForDoc(context, 3000)),
    "",
    "## Decision Snapshot",
    "",
    fenced(trimForDoc(decisions, 2500)),
    "",
    "## Risk Areas",
    "",
    "- Review `Risk Areas` in the state file before modifying core behavior.",
    "- Run `guardian verify` before committing handover changes.",
    "",
    "## Common Problems",
    "",
    "| Problem | Likely cause | Fix |",
    "| --- | --- | --- |",
    "| Memory validation fails | Required fields still contain placeholders | Fill the latest change, state, and decision details |",
    "",
    "## New Developer First Day",
    "",
    "1. Read all project memory files.",
    "2. Run the project locally.",
    "3. Run available tests or smoke checks.",
    `4. Pick one small next step from \`${config.memoryFiles.state}\`.`,
    `5. Update \`${config.memoryFiles.state}\` and \`${config.memoryFiles.changelog}\` after the change.`,
    "",
  ].join("\n");

  writeFile(path.join(root, config.memoryFiles.handover), content);
  console.log(`Generated ${config.memoryFiles.handover}.`);
  validateDocs(root);
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
    ["validate-docs", runDocValidation(root, config), printDocValidation],
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
    fail("Project Guardian verify failed.");
  }
  console.log("Project Guardian verify passed.");
}

async function queryLoop(root) {
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
    console.log(formatResults(searchIndex(index, question, 6)));
    console.log("Suggested next question: ask `why`, `risk`, `next step`, or a specific file/module name.");
    rl.prompt();
  }
}

function queryOnce(root, question) {
  const config = loadConfig(root);
  ensureInitialized(root, config);
  const index = buildIndex(root, config);
  console.log(formatResults(searchIndex(index, question, 6)));
}

async function decisionAdd(root, args) {
  const config = loadConfig(root);
  ensureInitialized(root, config);
  const flags = parseFlags(args);
  const date = flags.date || today();
  const fields = {
    title: await requiredValue(flags.title || flags._.join(" "), "Title"),
    context: await requiredValue(flags.context, "Context"),
    decision: await requiredValue(flags.decision, "Decision"),
    alternatives: await optionalValue(flags.alternatives, "Alternatives considered"),
    files: await optionalValue(flags.files, "Affected files/modules"),
    relatedChange: await optionalValue(flags.relatedChange || flags["related-change"], "Related change"),
    verification: await optionalValue(flags.verification, "Verification"),
    risks: await optionalValue(flags.risks, "Risks"),
    reviewAfter: await optionalValue(flags.reviewAfter || flags["review-after"], "Review after"),
    followUp: await optionalValue(flags.followUp || flags["follow-up"], "Follow-up"),
  };
  const entry = [
    "",
    `### ${date} - ${fields.title}`,
    "",
    `- Context: ${fields.context}`,
    `- Decision: ${fields.decision}`,
    `- Alternatives considered: ${fields.alternatives || "None recorded."}`,
    `- Affected files/modules: ${fields.files || "Not specified."}`,
    `- Related change: ${fields.relatedChange || "Not specified."}`,
    `- Verification: ${fields.verification || "Not recorded."}`,
    `- Risks: ${fields.risks || "Not recorded."}`,
    `- Review after: ${fields.reviewAfter || "Not scheduled."}`,
    `- Follow-up: ${fields.followUp || "None recorded."}`,
    "",
  ].join("\n");
  const decisionFile = writeDecisionFile(root, config, date, fields, entry);
  fs.appendFileSync(path.join(root, config.memoryFiles.decisions), entry, "utf8");
  if (decisionFile) {
    fs.appendFileSync(path.join(root, config.memoryFiles.decisions), `- Decision file: \`${decisionFile}\`\n`, "utf8");
  }
  console.log(`Added decision to ${config.memoryFiles.decisions}.`);
  if (decisionFile) console.log(`Created ${decisionFile}.`);
}

function installHooks(root) {
  const config = loadConfig(root);
  const gitDir = path.join(root, ".git");
  if (!fs.existsSync(gitDir)) {
    fail("No .git directory found. Initialize git before installing hooks.");
  }
  const hookPath = path.join(gitDir, "hooks", "pre-commit");
  const scriptPath = normalizeForHook(path.relative(root, __filename));
  const markerStart = "# >>> Project Guardian";
  const markerEnd = "# <<< Project Guardian";
  const commands = [`node "${scriptPath}" check`];
  if (config.hooks.runValidateDocs) {
    commands.push(`node "${scriptPath}" validate-docs`);
  }
  if (config.security.scanSecrets) {
    commands.push(`node "${scriptPath}" scan-secrets`);
  }
  const block = [markerStart, "# Installed by Project Guardian.", ...commands, markerEnd, ""].join("\n");
  const body = `#!/bin/sh\n${block}`;

  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, "utf8");
    if (existing.includes(markerStart)) {
      console.log("Project Guardian hook is already installed.");
      return;
    }
    writeFile(hookPath, `${existing.replace(/\s*$/, "")}\n\n${block}`);
  } else {
    writeFile(hookPath, body);
  }
  try {
    fs.chmodSync(hookPath, 0o755);
  } catch (_) {
    // Windows may ignore POSIX modes.
  }
  console.log("Installed .git/hooks/pre-commit.");
}

function installCi(root) {
  const config = loadConfig(root);
  const commands = [
    "node plugins/project-guardian/scripts/guardian.js check",
    "node plugins/project-guardian/scripts/guardian.js validate-docs",
  ];
  if (config.security.scanSecrets) {
    commands.push("node plugins/project-guardian/scripts/guardian.js scan-secrets");
  }
  const content = [
    "name: project-guardian",
    "displayName: Project Guardian Memory Check",
    "triggers:",
    "  push:",
    "    - matchType: PRECISE",
    `      branch: ${config.ci.defaultBranch}`,
    'commitMessage: ""',
    "stages:",
    "  - stage:",
    "      name: project_guardian",
    "      displayName: Project Guardian",
    "      failFast: false",
    "      steps:",
    "        - step: npmbuild@1",
    "          name: guardian_check",
    "          displayName: Check project memory",
    "          inputs:",
    `            nodeVersion: ${config.ci.nodeVersion}`,
    "            goals: |",
    ...commands.map((command) => `              ${command}`),
    "",
  ].join("\n");
  writeFile(path.join(root, ".workflow", "project-guardian.yml"), content);
  console.log("Installed .workflow/project-guardian.yml.");
  console.log("Review branch triggers before enabling it in Gitee Go.");
}

function installAdapters(root, args = [], options = {}) {
  const config = loadConfig(root);
  const flags = parseFlags(args);
  const adapters = options.adapters || resolveAdaptersOrFail(flags, config);
  const files = adapterFiles(adapters);

  for (const file of files) {
    copyTemplate(root, file.template, file.target);
  }

  if (!options.fromInit) {
    console.log(`Installed Project Guardian adapters: ${adapters.join(", ")}`);
  }
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

  const memoryConflicts = files.filter((file) => isMemoryFile(file, config) || isDecisionDirectoryFile(file, config));
  if (memoryConflicts.length > 0) {
    console.log("");
    console.log("Project memory conflicts:");
    for (const file of memoryConflicts) console.log(`- ${file}`);
    console.log("");
    console.log("Recommended resolution:");
    console.log("1. Preserve useful historical entries from both sides instead of deleting one side blindly.");
    console.log("2. Keep `Last updated` accurate in STATE.md.");
    console.log("3. For DECISIONS.md or docs/decisions conflicts, keep the decision reason, affected files, verification, risks, and follow-up.");
    console.log("4. After resolving, run `guardian validate-docs` and `guardian verify`.");
  } else {
    console.log("");
    console.log("No project memory files are conflicted. Resolve code conflicts, then update memory if behavior changes.");
  }
  process.exit(1);
}

function runDoctor(root, config) {
  const configIssues = validateConfig(config);
  const missingCore = getCoreMemoryFiles(config).filter((file) => !fs.existsSync(path.join(root, file)));
  const expectedRules = configIssues.length === 0 ? adapterFiles(resolveAdapters({}, config)).map((file) => file.target) : AGENT_RULE_FILES;
  const missingRules = expectedRules.filter((file) => !fs.existsSync(path.join(root, file)));
  const changes = getChangeSets(root);
  const configuredMissing = getCoreMemoryFiles(config).filter((file) => !fs.existsSync(path.join(root, file)));
  const issues = [...configIssues];
  if (missingCore.length > 0) issues.push(`missing core memory files: ${missingCore.join(", ")}`);
  return {
    ok: issues.length === 0,
    issues,
    root,
    git: fs.existsSync(path.join(root, ".git")),
    missingCore,
    missingRules,
    configuredMissing,
    changes,
  };
}

function runCheck(root, config) {
  const changes = getChangeSets(root);
  const staged = unique(changes.staged);
  const working = unique([...changes.working, ...changes.untracked]);
  const target = staged.length > 0 ? staged : working;
  const mode = staged.length > 0 ? "staged" : "working";
  const hasChanges = target.length > 0;
  const hasCode = target.some((file) => !isMemoryRelatedFile(file, config));
  const hasMemory = target.some((file) => isMemoryRelatedFile(file, config));
  const issues = [];

  if (!hasChanges) {
    return { ok: true, issues, mode, files: target };
  }
  if (hasCode && !hasMemory) {
    issues.push(`${mode} code changes do not include ${mode} project memory updates`);
  }
  if (hasMemory) {
    const docResult = runDocValidation(root, config);
    issues.push(...docResult.issues.map((issue) => `${issue.file}: ${issue.message}`));
  }
  if (hasCode && config.quality.taskIdPattern && !memoryContainsPattern(root, config, config.quality.taskIdPattern)) {
    issues.push(`task id pattern not found in memory files: ${config.quality.taskIdPattern}`);
  }
  if (hasCode && config.quality.requireChangedLines && latestChangelog(root, config).includes("- Changed lines:\n  - `N/A`")) {
    issues.push("latest changelog entry does not record changed line ranges");
  }

  return { ok: issues.length === 0, issues, mode, files: target };
}

function runDocValidation(root, config) {
  const reports = getDocRules(config).map((rule) => inspectDoc(root, rule));
  const issues = reports.flatMap((report) => report.issues.map((message) => ({ file: report.file, message })));
  return { ok: issues.length === 0, reports, issues };
}

function runSecretScan(root, config) {
  const ignore = loadIgnorePatterns(root, config);
  const files = unique([...getKnowledgeFiles(config), ...getDecisionFiles(root, config), CONFIG_FILE]).filter((file) => {
    const full = path.join(root, file);
    return fs.existsSync(full) && !isIgnored(file, ignore);
  });
  const findings = [];
  for (const file of files) {
    const text = readMaybe(path.join(root, file));
    text.split(/\r?\n/).forEach((line, index) => {
      for (const finding of scanSecretLine(line)) {
        findings.push({ file, line: index + 1, ...finding });
      }
    });
  }
  return { ok: findings.length === 0, findings };
}

function printDoctor(result, silent) {
  if (silent) return;
  console.log("Project Guardian doctor report");
  console.log("");
  console.log(`Project root: ${result.root}`);
  console.log(`Git repository: ${result.git ? "yes" : "no"}`);
  console.log(`Core memory files: ${result.missingCore.length === 0 ? "ok" : `missing ${result.missingCore.join(", ")}`}`);
  console.log(`AI rule files: ${result.missingRules.length === 0 ? "ok" : `missing ${result.missingRules.join(", ")}`}`);
  console.log(`Staged files: ${result.changes.staged.length}`);
  console.log(`Working files: ${result.changes.working.length}`);
  console.log(`Untracked files: ${result.changes.untracked.length}`);
  for (const issue of result.issues) {
    console.log(`- ${issue}`);
  }
  console.log("");
}

function printCheck(result, silent) {
  if (silent) return;
  if (result.ok) {
    console.log(`Project Guardian check passed for ${result.mode} changes.`);
  } else {
    console.error("Project Guardian check failed.");
    for (const issue of result.issues) console.error(`- ${issue}`);
  }
}

function printDocValidation(result, silent) {
  if (silent) return;
  console.log("Project Guardian document validation");
  console.log("");
  for (const report of result.reports) {
    const status = report.issues.length === 0 ? "ok" : "needs work";
    console.log(`${report.file}: ${status} (${report.placeholders} placeholders)`);
    for (const issue of report.issues) {
      console.log(`  - ${issue}`);
    }
  }
  console.log(result.ok ? "\nDocument validation passed." : "\nDocument validation failed.");
}

function printSecretScan(result, silent) {
  if (silent) return;
  console.log("Project Guardian secret scan");
  console.log("");
  if (result.findings.length === 0) {
    console.log("No likely secrets found.");
    return;
  }
  for (const finding of result.findings) {
    console.log(`${finding.file}:${finding.line} ${finding.type} ${finding.preview}`);
  }
}

function finish(ok, exitOnFailure = true) {
  if (!ok && exitOnFailure !== false) process.exit(1);
  return ok;
}

function ensureInitialized(root, config) {
  const missing = getCoreMemoryFiles(config).filter((file) => !fs.existsSync(path.join(root, file)));
  if (missing.length > 0) {
    fail(`Project Guardian memory is missing: ${missing.join(", ")}\nRun: guardian init`);
  }
}

function copyTemplate(root, templateName, target) {
  const targetPath = path.join(root, target);
  if (fs.existsSync(targetPath)) {
    console.log(`Kept existing ${target}`);
    return;
  }
  const source = path.join(TEMPLATE_DIR, templateName);
  writeFile(targetPath, fs.readFileSync(source, "utf8"));
  console.log(`Created ${target}`);
}

function writeDefaultConfig(root, overrides = {}) {
  const configPath = path.join(root, CONFIG_FILE);
  if (fs.existsSync(configPath)) {
    console.log(`Kept existing ${CONFIG_FILE}`);
    return;
  }
  const config = mergeConfig(clone(DEFAULT_CONFIG), overrides);
  writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Created ${CONFIG_FILE}`);
}

function addPackageScripts(packagePath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    pkg.scripts = pkg.scripts || {};
    const relScript = normalizeForHook(path.relative(path.dirname(packagePath), __filename));
    const scripts = {
      "guardian:init": `node "${relScript}" init`,
      "guardian:update": `node "${relScript}" update`,
      "guardian:handover": `node "${relScript}" handover`,
      "guardian:check": `node "${relScript}" check`,
      "guardian:doctor": `node "${relScript}" doctor`,
      "guardian:validate-docs": `node "${relScript}" validate-docs`,
      "guardian:scan-secrets": `node "${relScript}" scan-secrets`,
      "guardian:verify": `node "${relScript}" verify`,
      "guardian:query": `node "${relScript}" query`,
      "guardian:conflicts": `node "${relScript}" conflicts`,
      "guardian:install-ci": `node "${relScript}" install-ci`,
    };
    for (const [name, command] of Object.entries(scripts)) {
      pkg.scripts[name] = pkg.scripts[name] || command;
    }
    fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
    console.log("Added package.json guardian scripts.");
  } catch (error) {
    console.warn(`Could not update package.json: ${error.message}`);
  }
}

function refreshStateLatestChange(root, config, title, changedFiles) {
  const statePath = path.join(root, config.memoryFiles.state);
  const marker = "## Latest AI-Assisted Change";
  const replacement = [
    marker,
    "",
    `- Task: ${title}`,
    "- Summary: TODO: summarize the behavior change.",
    "- Files:",
    indentList(changedFiles.join("\n") || "No changed files detected."),
    "- Verification: TODO: record checks.",
    "- Follow-up: TODO: record next step.",
    "",
  ].join("\n");
  const current = readMaybe(statePath);
  const withDate = current.replace(/^Last updated:.*$/m, `Last updated: ${timestamp()}`);
  if (current.includes(marker)) {
    fs.writeFileSync(statePath, withDate.replace(new RegExp(`${escapeRegExp(marker)}[\\s\\S]*$`), replacement), "utf8");
  } else {
    fs.writeFileSync(statePath, `${withDate}\n${replacement}`, "utf8");
  }
}

function buildIndex(root, config) {
  const docs = [];
  for (const file of getKnowledgeFiles(config)) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) docs.push(...chunks(file, fs.readFileSync(full, "utf8"), 900, 160));
  }
  docs.push(...buildGitHistoryDocs(root));
  for (const file of collectFiles(root, config, 300)) {
    if (isMemoryFile(file, config) || file.includes("node_modules")) continue;
    const text = readMaybe(path.join(root, file));
    if (text) docs.push(...chunks(file, text, 700, 120));
  }
  return docs;
}

function buildGitHistoryDocs(root) {
  const history = git(root, ["log", "-n", "80", "--date=short", "--pretty=format:%h %ad %an %s", "--name-only"]);
  return history ? chunks("git-history", history, 1200, 200) : [];
}

function inspectDoc(root, rule) {
  const filePath = path.join(root, rule.file);
  const text = readMaybe(filePath);
  const placeholders = countPlaceholders(text);
  const issues = [];

  if (!text.trim()) issues.push("file is empty");
  if (meaningfulLength(text) < rule.minLength) issues.push(`content is too short: ${meaningfulLength(text)}/${rule.minLength}`);
  for (const section of rule.sections) {
    if (!text.includes(section)) issues.push(`missing section: ${section}`);
  }
  if (placeholders > rule.maxPlaceholders) issues.push(`too many placeholders: ${placeholders}/${rule.maxPlaceholders}`);
  for (const issue of fieldIssues(text)) issues.push(issue);
  if (hasEmptyTableRow(text)) issues.push("contains an empty table row");
  if (rule.type === "state" && !/^Last updated:\s*\S+/m.test(text)) issues.push("Last updated must have a value");
  if (rule.type === "decisions" && !hasRealDecision(text)) issues.push("must contain a real decision or explicitly say 暂无关键决策");
  if (rule.type === "changelog" && latestChangelogText(text).includes("TODO")) issues.push("latest changelog entry must not contain TODO");

  return { file: rule.file, placeholders, issues };
}

function countPlaceholders(text) {
  let count = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/\bTODO\b/i.test(line)) count += 1;
    if (/^-\s*$/.test(line)) count += 1;
    if (/^-\s*[^:]+:\s*$/.test(line)) count += 1;
    if (/^Last (updated|generated):\s*$/.test(line)) count += 1;
    if (/^\|\s*(\|\s*)+$/.test(line)) count += 1;
  }
  return count;
}

function meaningfulLength(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*\-_|:`\s]/g, "")
    .replace(/\bTODO\b/gi, "")
    .length;
}

function fieldIssues(text) {
  return text
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), index: index + 1 }))
    .filter(({ line }) => /^-\s*[^:]+:\s*$/.test(line))
    .map(({ line, index }) => `line ${index} has an empty field: ${line}`);
}

function hasEmptyTableRow(text) {
  return text.split(/\r?\n/).some((line) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    return cells.length > 0 && cells.every((cell) => cell === "");
  });
}

function hasRealDecision(text) {
  if (text.includes("暂无关键决策")) return true;
  return /###\s+\d{4}-\d{2}-\d{2}\s+-\s+(?!Decision title)[^\n]+/.test(text) && /-\s*Decision:\s*\S+/i.test(text);
}

function latestChangelog(root, config) {
  return latestChangelogText(readMaybe(path.join(root, config.memoryFiles.changelog)));
}

function latestChangelogText(text) {
  const matches = [...text.matchAll(/^###\s+.+$/gm)];
  if (matches.length === 0) return "";
  const last = matches[matches.length - 1];
  return text.slice(last.index);
}

function searchIndex(index, question, limit) {
  const terms = tokenize(question);
  return index
    .map((doc) => ({ doc, score: score(doc, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function score(doc, terms) {
  const haystack = `${doc.file}\n${doc.text}`.toLowerCase();
  let total = 0;
  for (const term of terms) {
    const matches = haystack.match(new RegExp(escapeRegExp(term.toLowerCase()), "g"));
    if (matches) total += matches.length * Math.min(term.length, 8);
  }
  if (isMemoryFile(doc.file, DEFAULT_CONFIG)) total += 3;
  return total;
}

function formatResults(results) {
  if (results.length === 0) return "No strong local match. Try a module name, file name, error message, or business keyword.";
  return results
    .map(({ doc, score: resultScore }, index) => {
      const preview = doc.text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8)
        .join("\n");
      return [`\n[${index + 1}] Source: ${doc.file} (score ${resultScore})`, "```text", preview, "```"].join("\n");
    })
    .join("\n");
}

function collectFiles(root, config, limit) {
  const tracked = lines(git(root, ["ls-files"]));
  const untracked = lines(git(root, ["ls-files", "--others", "--exclude-standard"]));
  const files = tracked.length > 0 ? unique([...tracked, ...untracked]) : walk(root);
  const ignore = loadIgnorePatterns(root, config);
  return files
    .filter((file) => !file.startsWith("plugins/project-guardian/"))
    .filter((file) => !file.startsWith(".git/"))
    .filter((file) => !file.includes("node_modules/"))
    .filter((file) => !isIgnored(file, ignore))
    .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .slice(0, limit);
}

function gitChangeSummary(root) {
  const parts = [];
  const staged = git(root, ["diff", "--cached", "--stat"]);
  const working = git(root, ["diff", "--stat"]);
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard"]);
  if (staged) parts.push(`Staged changes:\n${staged}`);
  if (working) parts.push(`Working tree changes:\n${working}`);
  if (untracked) parts.push(`Untracked files:\n${untracked}`);
  return parts.join("\n\n");
}

function changedFilesForUpdate(root) {
  return unique([
    ...lines(git(root, ["diff", "--cached", "--name-only"])),
    ...lines(git(root, ["diff", "--name-only"])),
    ...lines(git(root, ["ls-files", "--others", "--exclude-standard"])),
  ]);
}

function changedLineRanges(root) {
  const diff = git(root, ["diff", "--cached", "--unified=0"]) || git(root, ["diff", "--unified=0"]);
  const ranges = [];
  let currentFile = "";
  for (const line of diff.split(/\r?\n/)) {
    const fileMatch = line.match(/^\+\+\+\s+b\/(.+)$/);
    if (fileMatch) currentFile = fileMatch[1];
    const hunkMatch = line.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,(\d+))?/);
    if (currentFile && hunkMatch) {
      const start = Number(hunkMatch[1]);
      const length = Number(hunkMatch[2] || "1");
      const end = Math.max(start, start + length - 1);
      ranges.push(`${currentFile}:${start}${end === start ? "" : `-${end}`}`);
    }
  }
  return unique(ranges);
}

function getChangeSets(root) {
  return {
    staged: lines(git(root, ["diff", "--cached", "--name-only"])),
    working: lines(git(root, ["diff", "--name-only"])),
    untracked: lines(git(root, ["ls-files", "--others", "--exclude-standard"])),
  };
}

function memoryContainsPattern(root, config, pattern) {
  const regex = new RegExp(pattern);
  return getCoreMemoryFiles(config).some((file) => regex.test(readMaybe(path.join(root, file))));
}

function scanSecretLine(line) {
  const findings = [];
  const keyword = line.match(/\b(password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key)\b\s*[:=]\s*["']?([^"'\s]{8,})/i);
  if (keyword) findings.push({ type: "keyword-secret", preview: redact(keyword[2]) });
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line)) findings.push({ type: "private-key", preview: "[redacted private key]" });
  for (const match of line.matchAll(/[A-Za-z0-9+/=_-]{40,}/g)) {
    const token = match[0];
    if (looksHighEntropy(token)) findings.push({ type: "high-entropy", preview: redact(token) });
  }
  return findings;
}

function looksHighEntropy(value) {
  return /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[+/_=-]/.test(value);
}

function redact(value) {
  if (!value || value.length <= 8) return "[redacted]";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function loadIgnorePatterns(root, config) {
  const file = path.join(root, ".guardianignore");
  const fromFile = fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"))
    : [];
  return [...fromFile, ...(config.ignore || [])];
}

function isIgnored(file, patterns) {
  return patterns.some((pattern) => file.replace(/\\/g, "/").includes(pattern.replace(/\\/g, "/")));
}

function walk(root, current = root, collected = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    const rel = relative(root, full);
    if (entry.isDirectory()) {
      if ([".git", "node_modules", "dist", "build", ".next", "coverage"].includes(entry.name)) continue;
      walk(root, full, collected);
    } else {
      collected.push(rel);
    }
  }
  return collected;
}

function readPackageInfo(root) {
  const packagePath = path.join(root, "package.json");
  if (!fs.existsSync(packagePath)) return "```bash\n# No package.json found. Document project-specific commands here.\n```";
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const scripts = Object.keys(pkg.scripts || {});
    const candidates = scripts.filter((name) => /^(dev|start|serve|test|build|verify)$/.test(name));
    return ["```bash", "# install", "npm install", "", ...candidates.map((name) => `npm run ${name}`), "```"].join("\n");
  } catch (_) {
    return "```bash\n# package.json exists but could not be parsed.\n```";
  }
}

function readDecisions(root, config) {
  const main = readMaybe(path.join(root, config.memoryFiles.decisions));
  const dir = path.join(root, config.memoryFiles.decisionsDirectory);
  if (!fs.existsSync(dir)) return main;
  const extra = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => readMaybe(path.join(dir, file)))
    .join("\n\n");
  return `${main}\n\n${extra}`;
}

function getDecisionFiles(root, config) {
  if (!config.memoryFiles.decisionsDirectory) return [];
  const dir = path.join(root, config.memoryFiles.decisionsDirectory);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => path.join(config.memoryFiles.decisionsDirectory, file).replace(/\\/g, "/"));
}

function writeDecisionFile(root, config, date, fields, entry) {
  const dir = config.memoryFiles.decisionsDirectory;
  if (!dir) return "";
  const slug = slugify(fields.title) || `decision-${Date.now()}`;
  const relative = path.join(dir, `${date}-${slug}.md`).replace(/\\/g, "/");
  const content = [
    `# ${fields.title}`,
    "",
    `Date: ${date}`,
    "",
    "## Decision Record",
    entry.trim(),
    "",
  ].join("\n");
  writeFile(path.join(root, relative), content);
  return relative;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getCoreMemoryFiles(config) {
  return [
    config.memoryFiles.context,
    config.memoryFiles.state,
    config.memoryFiles.decisions,
    config.memoryFiles.changelog,
    config.memoryFiles.handover,
  ];
}

function getKnowledgeFiles(config) {
  return [...getCoreMemoryFiles(config), ...AGENT_RULE_FILES];
}

function getDocRules(config) {
  return [
    {
      file: config.memoryFiles.context,
      type: "context",
      sections: ["## Project Summary", "## Tech Stack", "## Core Business Flows", "## How To Run"],
      maxPlaceholders: 8,
      minLength: 400,
    },
    {
      file: config.memoryFiles.state,
      type: "state",
      sections: ["## Current Status", "## Next Steps", "## Known Issues", "## Latest AI-Assisted Change"],
      maxPlaceholders: 6,
      minLength: 300,
    },
    {
      file: config.memoryFiles.decisions,
      type: "decisions",
      sections: ["# Decisions"],
      maxPlaceholders: 4,
      minLength: 150,
    },
    {
      file: config.memoryFiles.changelog,
      type: "changelog",
      sections: ["# AI Changelog"],
      maxPlaceholders: 8,
      minLength: 150,
    },
    {
      file: config.memoryFiles.handover,
      type: "handover",
      sections: ["## First Read", "## How To Run", "## Project Map", "## New Developer First Day"],
      maxPlaceholders: 8,
      minLength: 300,
    },
  ];
}

function isMemoryFile(file, config = DEFAULT_CONFIG) {
  const normalized = file.replace(/\\/g, "/");
  return [...getKnowledgeFiles(config), CONFIG_FILE].map((item) => item.replace(/\\/g, "/")).includes(normalized);
}

function isMemoryRelatedFile(file, config = DEFAULT_CONFIG) {
  return isMemoryFile(file, config) || isDecisionDirectoryFile(file, config);
}

function isDecisionDirectoryFile(file, config = DEFAULT_CONFIG) {
  const dir = (config.memoryFiles.decisionsDirectory || "").replace(/\\/g, "/").replace(/\/?$/, "/");
  return dir !== "/" && file.replace(/\\/g, "/").startsWith(dir);
}

function loadConfig(root) {
  const configPath = path.join(root, CONFIG_FILE);
  if (!fs.existsSync(configPath)) return clone(DEFAULT_CONFIG);
  try {
    return mergeConfig(clone(DEFAULT_CONFIG), JSON.parse(fs.readFileSync(configPath, "utf8")));
  } catch (error) {
    return { ...clone(DEFAULT_CONFIG), __configError: error.message };
  }
}

function validateConfig(config) {
  const issues = [];
  if (config.__configError) issues.push(`invalid ${CONFIG_FILE}: ${config.__configError}`);
  for (const [name, value] of Object.entries(config.memoryFiles || {})) {
    if (typeof value !== "string" || value.trim() === "") issues.push(`memoryFiles.${name} must be a non-empty string`);
  }
  if (config.quality.taskIdPattern) {
    try {
      new RegExp(config.quality.taskIdPattern);
    } catch (error) {
      issues.push(`quality.taskIdPattern is not a valid regex: ${error.message}`);
    }
  }
  issues.push(...validateAdapters(config.adapters));
  return issues;
}

function mergeConfig(base, override) {
  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object") {
      base[key] = mergeConfig(base[key], value);
    } else {
      base[key] = value;
    }
  }
  return base;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseFlags(args) {
  const result = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      result._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
    } else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
}

function resolveAdaptersOrFail(flags, config) {
  try {
    return resolveAdapters(flags, config);
  } catch (error) {
    fail(error.message);
  }
}

async function requiredValue(value, label) {
  const next = value || (process.stdin.isTTY ? await prompt(`${label}: `) : "");
  if (!next) fail(`Missing required field: ${label}`);
  return next;
}

async function optionalValue(value, label) {
  return value || (process.stdin.isTTY ? await prompt(`${label}: `) : "");
}

function prompt(label) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(label, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

function areaFor(file) {
  const first = file.split(/[\\/]/)[0];
  return first === file ? "root" : first;
}

function chunks(file, text, size, overlap) {
  const clean = text.replace(/\0/g, "");
  const result = [];
  for (let start = 0; start < clean.length; start += size - overlap) {
    result.push({ file, text: clean.slice(start, start + size) });
    if (result.length > 20) break;
  }
  return result;
}

function tokenize(input) {
  const ascii = input.toLowerCase().match(/[a-z0-9_.:/-]{2,}/g) || [];
  const cjk = input.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const cjkPairs = cjk.flatMap((word) => {
    const pairs = [];
    for (let i = 0; i < word.length - 1; i += 1) pairs.push(word.slice(i, i + 2));
    return pairs;
  });
  return [...new Set([...ascii, ...cjk, ...cjkPairs])];
}

function git(root, args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch (_) {
    return "";
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => value.replace(/\\/g, "/")))];
}

function indentList(value) {
  const items = lines(value);
  if (items.length === 0) return "  - N/A";
  return items.map((item) => `  - \`${item}\``).join("\n");
}

function lines(value) {
  return String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function readMaybe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (_) {
    return "";
  }
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function relative(root, file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function normalizeForHook(file) {
  return file.replace(/\\/g, "/");
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function today() {
  return timestamp().slice(0, 10);
}

function fenced(text) {
  return ["```text", text || "No content recorded.", "```"].join("\n");
}

function trimForDoc(text, max) {
  if (!text) return "No content recorded.";
  return text.length <= max ? text : `${text.slice(0, max)}\n...`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  guardian init --adapter all
  guardian update "task summary"
  guardian decision add --title "Decision title" --context "Why" --decision "What"
  guardian handover
  guardian check
  guardian doctor
  guardian validate-docs
  guardian scan-secrets
  guardian verify
  guardian query "question"
  guardian conflicts
  guardian install-adapters --adapter cursor,copilot
  guardian install-hooks
  guardian install-ci

Commands:
  init           Create standard project memory files, AI rules, and config.
  update         Append an AI-assisted change record and refresh STATE.md.
  decision-add   Append a structured decision entry.
  handover      Generate docs/HANDOVER.md from current memory and project files.
  check         Fail when code changed but memory was not updated or is low quality.
  doctor        Audit memory files, AI rules, config, and git change state.
  validate-docs Fail when memory docs are missing required substance.
  scan-secrets  Scan memory files for likely secrets without printing full values.
  verify        Run doctor, check, validate-docs, and configured security scans.
  query         Search project memory, source files, and git history.
  conflicts     Show Git merge conflicts and memory conflict resolution advice.
  install-adapters Install AI-tool rule adapters: ${SUPPORTED_ADAPTERS.join(", ")}, or all.
  install-hooks Install a pre-commit hook that runs configured checks.
  install-ci    Install a Gitee Go workflow template.
`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main().catch((error) => fail(error.stack || error.message));
