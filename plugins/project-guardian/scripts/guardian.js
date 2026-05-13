#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execFileSync } = require("child_process");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const TEMPLATE_DIR = path.join(PLUGIN_ROOT, "assets", "templates");
const CORE_MEMORY_FILES = [
  "PROJECT_CONTEXT.md",
  "STATE.md",
  "DECISIONS.md",
  path.join("docs", "AI_CHANGELOG.md"),
  path.join("docs", "HANDOVER.md"),
];
const AGENT_RULE_FILES = ["AGENTS.md", ".cursorrules"];
const KNOWLEDGE_FILES = [...CORE_MEMORY_FILES, ...AGENT_RULE_FILES];
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
const DOC_RULES = [
  {
    file: "PROJECT_CONTEXT.md",
    sections: ["## Project Summary", "## Tech Stack", "## Core Business Flows", "## How To Run"],
    maxPlaceholders: 8,
  },
  {
    file: "STATE.md",
    sections: ["## Current Status", "## Next Steps", "## Known Issues", "## Latest AI-Assisted Change"],
    maxPlaceholders: 6,
  },
  {
    file: "DECISIONS.md",
    sections: ["# Decisions"],
    maxPlaceholders: 4,
  },
  {
    file: path.join("docs", "AI_CHANGELOG.md"),
    sections: ["# AI Changelog"],
    maxPlaceholders: 8,
  },
  {
    file: path.join("docs", "HANDOVER.md"),
    sections: ["## First Read", "## How To Run", "## Project Map", "## New Developer First Day"],
    maxPlaceholders: 8,
  },
];

function main() {
  const [command, ...args] = process.argv.slice(2);
  const root = process.cwd();

  switch (command) {
    case "init":
      init(root);
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
    case "query":
      query(root).catch((error) => fail(error.message));
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
    default:
      fail(`Unknown command: ${command}\nRun: node ${relative(root, __filename)} help`);
  }
}

function init(root) {
  copyTemplate(root, "PROJECT_CONTEXT.md", "PROJECT_CONTEXT.md");
  copyTemplate(root, "STATE.md", "STATE.md");
  copyTemplate(root, "DECISIONS.md", "DECISIONS.md");
  copyTemplate(root, "AI_CHANGELOG.md", path.join("docs", "AI_CHANGELOG.md"));
  copyTemplate(root, "HANDOVER.md", path.join("docs", "HANDOVER.md"));
  copyTemplate(root, "AGENTS.md", "AGENTS.md");
  copyTemplate(root, "cursorrules", ".cursorrules");

  const packagePath = path.join(root, "package.json");
  if (fs.existsSync(packagePath)) {
    addPackageScripts(packagePath);
  }

  console.log("Project Guardian memory initialized.");
  console.log("Next: fill PROJECT_CONTEXT.md and run `guardian update` after AI-assisted changes.");
}

function update(root, task) {
  ensureInitialized(root);
  const now = timestamp();
  const diffStat = gitChangeSummary(root) || "No git diff stat available.";
  const changedFiles = changedFilesForUpdate(root).join("\n") || "No changed files detected.";
  const title = task || "AI-assisted change";
  const entry = [
    "",
    `### ${now} - ${title}`,
    "",
    `- Human request: ${task || "TODO: describe the request."}`,
    "- AI summary: TODO: summarize what changed and why.",
    "- Files changed:",
    indentList(changedFiles),
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
    "- Next step: TODO: record what the next developer should do.",
    "",
  ].join("\n");

  fs.appendFileSync(path.join(root, "docs", "AI_CHANGELOG.md"), entry, "utf8");
  refreshStateLatestChange(root, title, changedFiles);
  console.log("Updated docs/AI_CHANGELOG.md and STATE.md.");
  console.log("Please replace TODO fields before committing.");
}

function handover(root) {
  ensureInitialized(root);
  const files = collectFiles(root, 160);
  const packageInfo = readPackageInfo(root);
  const state = readMaybe(path.join(root, "STATE.md")).trim();
  const context = readMaybe(path.join(root, "PROJECT_CONTEXT.md")).trim();
  const decisions = readMaybe(path.join(root, "DECISIONS.md")).trim();
  const content = [
    "# Handover Guide",
    "",
    `Last generated: ${timestamp()}`,
    "",
    "## First Read",
    "",
    "Read these files before editing code:",
    "",
    "1. `PROJECT_CONTEXT.md`",
    "2. `STATE.md`",
    "3. `DECISIONS.md`",
    "4. `docs/AI_CHANGELOG.md`",
    "",
    "## How To Run",
    "",
    packageInfo,
    "",
    "## Project Map",
    "",
    "| Area | Files | Purpose |",
    "| --- | --- | --- |",
    ...files.slice(0, 80).map((file) => `| ${areaFor(file)} | \`${file}\` | TODO: explain purpose. |`),
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
    "- TODO: list fragile modules, integrations, migrations, auth, payment, deployment, or data risks.",
    "",
    "## Common Problems",
    "",
    "| Problem | Likely cause | Fix |",
    "| --- | --- | --- |",
    "| TODO | TODO | TODO |",
    "",
    "## New Developer First Day",
    "",
    "1. Read all project memory files.",
    "2. Run the project locally.",
    "3. Run available tests or smoke checks.",
    "4. Pick one small next step from `STATE.md`.",
    "5. Update `STATE.md` and `docs/AI_CHANGELOG.md` after the change.",
    "",
  ].join("\n");

  writeFile(path.join(root, "docs", "HANDOVER.md"), content);
  console.log("Generated docs/HANDOVER.md.");
}

function check(root) {
  ensureInitialized(root);
  const changes = getChangeSets(root);
  if (changes.staged.length > 0) {
    const hasStagedCode = changes.staged.some((file) => !isMemoryFile(file));
    const hasStagedMemory = changes.staged.some((file) => isMemoryFile(file));
    if (hasStagedCode && !hasStagedMemory) {
      console.error("Project Guardian check failed.");
      console.error("Staged code changes do not include staged project memory updates.");
      console.error("Run `guardian update \"task summary\"`, review the TODO fields, then stage the memory files.");
      process.exit(1);
    }
    console.log("Project Guardian check passed for staged changes.");
    return;
  }

  const changed = unique([...changes.working, ...changes.untracked]);
  if (changed.length === 0) {
    console.log("No uncommitted changes detected.");
    return;
  }

  const hasNonMemoryChange = changed.some((file) => !isMemoryFile(file));
  const hasMemoryChange = changed.some((file) => isMemoryFile(file));

  if (hasNonMemoryChange && !hasMemoryChange) {
    console.error("Project Guardian check failed.");
    console.error("Code changed, but project memory was not updated.");
    console.error("Run `guardian update \"task summary\"` or update STATE.md/docs/AI_CHANGELOG.md manually.");
    process.exit(1);
  }

  console.log("Project Guardian check passed.");
}

function doctor(root) {
  const missingCore = CORE_MEMORY_FILES.filter((file) => !fs.existsSync(path.join(root, file)));
  const missingRules = AGENT_RULE_FILES.filter((file) => !fs.existsSync(path.join(root, file)));
  const changes = getChangeSets(root);

  console.log("Project Guardian doctor report");
  console.log("");
  console.log(`Project root: ${root}`);
  console.log(`Git repository: ${fs.existsSync(path.join(root, ".git")) ? "yes" : "no"}`);
  console.log(`Core memory files: ${missingCore.length === 0 ? "ok" : `missing ${missingCore.join(", ")}`}`);
  console.log(`AI rule files: ${missingRules.length === 0 ? "ok" : `missing ${missingRules.join(", ")}`}`);
  console.log(`Staged files: ${changes.staged.length}`);
  console.log(`Working files: ${changes.working.length}`);
  console.log(`Untracked files: ${changes.untracked.length}`);

  if (missingCore.length > 0) {
    console.log("");
    console.log("Run `guardian init` before using update, handover, check, or query.");
    process.exit(1);
  }

  if (missingRules.length > 0) {
    console.log("");
    console.log("Recommendation: run `guardian init` again to add missing AI rule files without overwriting existing memory.");
  }

  console.log("");
  console.log("Doctor completed.");
}

function validateDocs(root) {
  ensureInitialized(root);
  const reports = DOC_RULES.map((rule) => inspectDoc(root, rule));
  const failed = reports.filter((report) => report.issues.length > 0);

  console.log("Project Guardian document validation");
  console.log("");
  for (const report of reports) {
    const status = report.issues.length === 0 ? "ok" : "needs work";
    console.log(`${report.file}: ${status} (${report.placeholders} placeholders)`);
    for (const issue of report.issues) {
      console.log(`  - ${issue}`);
    }
  }

  if (failed.length > 0) {
    console.log("");
    console.log("Document validation failed. Fill placeholders, remove TODO entries, and add missing sections.");
    process.exit(1);
  }

  console.log("");
  console.log("Document validation passed.");
}

async function query(root) {
  ensureInitialized(root);
  const index = buildIndex(root);
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

    const results = searchIndex(index, question, 6);
    if (results.length === 0) {
      console.log("No strong local match. Try a module name, file name, error message, or business keyword.");
    } else {
      console.log(formatResults(results));
    }
    console.log("Suggested next question: ask `why`, `risk`, `next step`, or a specific file/module name.");
    rl.prompt();
  }
}

function installHooks(root) {
  const gitDir = path.join(root, ".git");
  if (!fs.existsSync(gitDir)) {
    fail("No .git directory found. Initialize git before installing hooks.");
  }
  const hookPath = path.join(gitDir, "hooks", "pre-commit");
  const scriptPath = normalizeForHook(path.relative(root, __filename));
  const markerStart = "# >>> Project Guardian";
  const markerEnd = "# <<< Project Guardian";
  const block = [
    markerStart,
    "# Installed by Project Guardian.",
    `node "${scriptPath}" check`,
    markerEnd,
    "",
  ].join("\n");
  const body = `#!/bin/sh\n${block}`;
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, "utf8");
    if (existing.includes(markerStart)) {
      console.log("Project Guardian hook is already installed.");
      return;
    }
    const next = `${existing.replace(/\s*$/, "")}\n\n${block}`;
    writeFile(hookPath, next);
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
  copyTemplate(root, "gitee-go-project-guardian.yml", path.join(".workflow", "project-guardian.yml"));
  console.log("Installed .workflow/project-guardian.yml.");
  console.log("Review branch triggers before enabling it in Gitee Go.");
}

function ensureInitialized(root) {
  const missing = CORE_MEMORY_FILES.filter((file) => !fs.existsSync(path.join(root, file)));
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

function addPackageScripts(packagePath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    pkg.scripts = pkg.scripts || {};
    const relScript = normalizeForHook(path.relative(path.dirname(packagePath), __filename));
    pkg.scripts["guardian:init"] = pkg.scripts["guardian:init"] || `node "${relScript}" init`;
    pkg.scripts["guardian:update"] = pkg.scripts["guardian:update"] || `node "${relScript}" update`;
    pkg.scripts["guardian:handover"] = pkg.scripts["guardian:handover"] || `node "${relScript}" handover`;
    pkg.scripts["guardian:check"] = pkg.scripts["guardian:check"] || `node "${relScript}" check`;
    pkg.scripts["guardian:doctor"] = pkg.scripts["guardian:doctor"] || `node "${relScript}" doctor`;
    pkg.scripts["guardian:validate-docs"] = pkg.scripts["guardian:validate-docs"] || `node "${relScript}" validate-docs`;
    pkg.scripts["guardian:query"] = pkg.scripts["guardian:query"] || `node "${relScript}" query`;
    pkg.scripts["guardian:install-ci"] = pkg.scripts["guardian:install-ci"] || `node "${relScript}" install-ci`;
    fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
    console.log("Added package.json guardian scripts.");
  } catch (error) {
    console.warn(`Could not update package.json: ${error.message}`);
  }
}

function refreshStateLatestChange(root, title, changedFiles) {
  const statePath = path.join(root, "STATE.md");
  const marker = "## Latest AI-Assisted Change";
  const replacement = [
    marker,
    "",
    `- Task: ${title}`,
    `- Summary: TODO: summarize the behavior change.`,
    "- Files:",
    indentList(changedFiles),
    "- Verification: TODO: record checks.",
    "- Follow-up: TODO: record next step.",
    "",
  ].join("\n");
  const current = readMaybe(statePath);
  const withDate = current.replace(/^Last updated:.*$/m, `Last updated: ${timestamp()}`);
  if (current.includes(marker)) {
    const next = withDate.replace(new RegExp(`${escapeRegExp(marker)}[\\s\\S]*$`), replacement);
    fs.writeFileSync(statePath, next, "utf8");
  } else {
    fs.writeFileSync(statePath, `${withDate}\n${replacement}`, "utf8");
  }
}

function buildIndex(root) {
  const docs = [];
  for (const file of KNOWLEDGE_FILES) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) {
      docs.push(...chunks(file, fs.readFileSync(full, "utf8"), 900, 160));
    }
  }
  docs.push(...buildGitHistoryDocs(root));
  for (const file of collectFiles(root, 300)) {
    if (isMemoryFile(file) || file.includes("node_modules")) continue;
    const full = path.join(root, file);
    const text = readMaybe(full);
    if (text) docs.push(...chunks(file, text, 700, 120));
  }
  return docs;
}

function buildGitHistoryDocs(root) {
  const history = git(root, [
    "log",
    "-n",
    "80",
    "--date=short",
    "--pretty=format:%h %ad %an %s",
    "--name-only",
  ]);
  if (!history) return [];
  return chunks("git-history", history, 1200, 200);
}

function inspectDoc(root, rule) {
  const filePath = path.join(root, rule.file);
  const text = readMaybe(filePath);
  const placeholders = countPlaceholders(text);
  const issues = [];

  if (!text.trim()) {
    issues.push("file is empty");
  }
  for (const section of rule.sections) {
    if (!text.includes(section)) {
      issues.push(`missing section: ${section}`);
    }
  }
  if (placeholders > rule.maxPlaceholders) {
    issues.push(`too many placeholders: ${placeholders}/${rule.maxPlaceholders}`);
  }

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
    const escaped = escapeRegExp(term.toLowerCase());
    const matches = haystack.match(new RegExp(escaped, "g"));
    if (matches) total += matches.length * Math.min(term.length, 8);
  }
  if (isMemoryFile(doc.file)) total += 3;
  return total;
}

function formatResults(results) {
  return results
    .map(({ doc, score: resultScore }, index) => {
      const preview = doc.text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8)
        .join("\n");
      return [
        `\n[${index + 1}] ${doc.file} (score ${resultScore})`,
        "```text",
        preview,
        "```",
      ].join("\n");
    })
    .join("\n");
}

function collectFiles(root, limit) {
  const tracked = lines(git(root, ["ls-files"]));
  const untracked = lines(git(root, ["ls-files", "--others", "--exclude-standard"]));
  const files = tracked.length > 0 ? unique([...tracked, ...untracked]) : walk(root);
  return files
    .filter((file) => !file.startsWith("plugins/project-guardian/"))
    .filter((file) => !file.startsWith(".git/"))
    .filter((file) => !file.includes("node_modules/"))
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

function getChangeSets(root) {
  return {
    staged: lines(git(root, ["diff", "--cached", "--name-only"])),
    working: lines(git(root, ["diff", "--name-only"])),
    untracked: lines(git(root, ["ls-files", "--others", "--exclude-standard"])),
  };
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
  if (!fs.existsSync(packagePath)) {
    return [
      "```bash",
      "# TODO: document install command",
      "# TODO: document development command",
      "# TODO: document test command",
      "```",
    ].join("\n");
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const scripts = Object.keys(pkg.scripts || {});
    const candidates = scripts.filter((name) => /^(dev|start|serve|test|build)$/.test(name));
    return [
      "```bash",
      "# install",
      "npm install",
      "",
      ...candidates.map((name) => `npm run ${name}`),
      "```",
    ].join("\n");
  } catch (_) {
    return "```bash\n# TODO: package.json exists but could not be parsed.\n```";
  }
}

function areaFor(file) {
  const first = file.split(/[\\/]/)[0];
  if (first === file) return "root";
  return first;
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
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (_) {
    return "";
  }
}

function isMemoryFile(file) {
  const normalized = file.replace(/\\/g, "/");
  return [
    "PROJECT_CONTEXT.md",
    "STATE.md",
    "DECISIONS.md",
    "docs/AI_CHANGELOG.md",
    "docs/HANDOVER.md",
    "AGENTS.md",
    ".cursorrules",
  ].includes(normalized);
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => value.replace(/\\/g, "/")))];
}

function indentList(value) {
  const items = lines(value);
  if (items.length === 0) return "  - TODO";
  return items.map((item) => `  - \`${item}\``).join("\n");
}

function lines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
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
  return [
    now.getFullYear(),
    "-",
    pad(now.getMonth() + 1),
    "-",
    pad(now.getDate()),
    " ",
    pad(now.getHours()),
    ":",
    pad(now.getMinutes()),
  ].join("");
}

function fenced(text) {
  return ["```text", text || "TODO", "```"].join("\n");
}

function trimForDoc(text, max) {
  if (!text) return "TODO";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n...`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function help() {
  console.log(`Project Guardian

Usage:
  node scripts/guardian.js init
  node scripts/guardian.js update "task summary"
  node scripts/guardian.js handover
  node scripts/guardian.js check
  node scripts/guardian.js doctor
  node scripts/guardian.js validate-docs
  node scripts/guardian.js query
  node scripts/guardian.js install-hooks
  node scripts/guardian.js install-ci

Commands:
  init           Create standard project memory files and AI rules.
  update         Append an AI-assisted change record and refresh STATE.md.
  handover      Generate docs/HANDOVER.md from current memory and project files.
  check         Fail when code changed but memory was not updated.
  doctor        Audit memory files, AI rules, and git change state.
  validate-docs Fail when memory docs still contain too many placeholders.
  query         Start a local multi-turn project knowledge query loop.
  install-hooks Install a pre-commit hook that runs guardian check.
  install-ci    Install a Gitee Go workflow template.
`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main();
