"use strict";

const fs = require("fs");
const path = require("path");
const { CONFIG_FILE, DEFAULT_CONFIG, isChinese, loadConfig, validateConfig } = require("./config");
const { latestChangelog, runDocValidation } = require("./doc-validation");
const { getChangeSets } = require("./git-utils");
const { runSecretScan } = require("./security");
const { getCoreMemoryFiles, readMaybe, unique } = require("./shared");
const { resolveAdapters, adapterFiles } = require("./adapters");

const AGENT_RULE_FILES = ["AGENTS.md", ".cursorrules"];

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

function getKnowledgeFiles(config) {
  return [...getCoreMemoryFiles(config), ...AGENT_RULE_FILES];
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

function memoryContainsPattern(root, config, pattern) {
  const regex = new RegExp(pattern);
  return getCoreMemoryFiles(config).some((file) => regex.test(readMaybe(path.join(root, file))));
}

module.exports = {
  runDoctor,
  runCheck,
  printDoctor,
  printCheck,
  printDocValidation,
  printSecretScan,
  finish,
  getKnowledgeFiles,
  isMemoryFile,
  isMemoryRelatedFile,
  isDecisionDirectoryFile,
  memoryContainsPattern,
};
