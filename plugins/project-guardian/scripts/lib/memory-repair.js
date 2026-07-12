"use strict";

const fs = require("fs");
const path = require("path");
const { isChinese, loadConfig } = require("./config");
const { markdownEntries } = require("./doc-validation");
const { getDecisionFiles } = require("./reviews");
const { ensureInitialized, parseFlags, readMaybe, writeFile } = require("./shared");

function repairMemory(root, args = []) {
  const config = loadConfig(root);
  ensureInitialized(root, config);
  const flags = parseFlags(args);
  const write = Boolean(flags.write || flags.apply);
  const plan = buildRepairPlan(root, config);

  console.log("Project Guardian memory repair");
  console.log("");
  console.log(`Changelog order: ${plan.changelog.changed ? "needs repair" : "ok"}`);
  console.log(`Decision index: ${plan.decisions.changed ? "needs sync" : "ok"}`);
  console.log(`Decision source files: ${plan.decisions.count}`);

  if (!plan.changed) {
    console.log("\nNo repair is needed.");
    return plan;
  }
  if (!write) {
    console.log("\nDry run only. Run `guardian repair-memory --write` to apply these deterministic repairs.");
    return plan;
  }

  if (plan.changelog.changed) writeFile(path.join(root, config.memoryFiles.changelog), plan.changelog.content);
  if (plan.decisions.changed) writeFile(path.join(root, config.memoryFiles.decisions), plan.decisions.content);
  console.log("\nMemory repair applied. Run `guardian validate-docs` and review the Git diff.");
  return plan;
}

function buildRepairPlan(root, config) {
  const changelogPath = path.join(root, config.memoryFiles.changelog);
  const decisionsPath = path.join(root, config.memoryFiles.decisions);
  const currentChangelog = readMaybe(changelogPath);
  const currentDecisions = readMaybe(decisionsPath);
  const changelog = sortMarkdownEntries(currentChangelog);
  const decisions = buildDecisionIndex(root, config);
  return {
    changed: changelog !== currentChangelog || decisions.content !== currentDecisions,
    changelog: { changed: changelog !== currentChangelog, content: changelog },
    decisions: { changed: decisions.content !== currentDecisions, ...decisions },
  };
}

function sortMarkdownEntries(text) {
  const value = String(text || "");
  const entries = markdownEntries(value);
  if (entries.length < 2) return value;
  const firstIndex = value.search(/^###\s+/m);
  const preamble = value.slice(0, firstIndex).replace(/\s*$/, "");
  const sorted = entries
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.index - b.index)
    .map((entry) => entry.text.trim());
  return `${preamble}\n\n${sorted.join("\n\n")}\n`;
}

function buildDecisionIndex(root, config) {
  const entries = getDecisionFiles(root, config)
    .map((file) => decisionEntryFromFile(root, file, config))
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date) || a.file.localeCompare(b.file));
  const preamble = isChinese(config)
    ? "# 决策记录\n\n本文件由 `memory/decisions/` 中的独立决策文件同步生成。独立决策文件是结构化决策与复审状态的事实来源。\n\n## 有效决策"
    : "# Decisions\n\nThis index is synchronized from the individual decision files in `memory/decisions/`. Those files are the source of truth for structured decisions and review status.\n\n## Active Decisions";
  return {
    count: entries.length,
    content: `${preamble}\n\n${entries.map((entry) => entry.text).join("\n\n")}\n`,
  };
}

function decisionEntryFromFile(root, file, config) {
  const content = readMaybe(path.join(root, file));
  const entries = markdownEntries(content);
  if (entries.length === 0) return null;
  const entry = entries[0];
  const reviewHeading = entry.text.search(/^##\s+(?:Review Result|复审结果)\s*$/m);
  const body = (reviewHeading === -1 ? entry.text : entry.text.slice(0, reviewHeading)).trim();
  const label = isChinese(config) ? "决策文件" : "Decision file";
  const separator = isChinese(config) ? "：" : ": ";
  const link = `- ${label}${separator}\`${file.replace(/\\/g, "/")}\``;
  return { file, date: entry.timestamp.slice(0, 10), text: `${body}\n${link}` };
}

module.exports = {
  buildDecisionIndex,
  buildRepairPlan,
  decisionEntryFromFile,
  repairMemory,
  sortMarkdownEntries,
};
