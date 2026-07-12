"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { isChinese, loadConfig } = require("./config");
const { ensureInitialized, fail, parseFlags, readMaybe, timestamp, writeFile } = require("./shared");

async function addDecision(root, args = []) {
  const config = loadConfig(root);
  ensureInitialized(root, config);
  const flags = parseFlags(args);
  const date = flags.date || today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fail(`--date must be in YYYY-MM-DD format, got: ${date}`);
  }
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
  if (fields.reviewAfter && !/^\d{4}-\d{2}-\d{2}$/.test(fields.reviewAfter)) {
    fail(`--review-after must be in YYYY-MM-DD format, got: ${fields.reviewAfter}`);
  }
  const entry = buildDecisionEntry(config, date, fields);
  const decisionFile = writeDecisionFile(root, config, date, fields, entry);
  let indexEntry = entry.trim();
  if (decisionFile) {
    const decisionFileLabel = isChinese(config) ? "决策文件" : "Decision file";
    const separator = isChinese(config) ? "：" : ":";
    const padding = isChinese(config) ? "" : " ";
    indexEntry += `\n- ${decisionFileLabel}${separator}${padding}\`${decisionFile}\``;
  }
  prependDecisionEntry(path.join(root, config.memoryFiles.decisions), indexEntry);
  console.log(`Added decision to ${config.memoryFiles.decisions}.`);
  if (decisionFile) console.log(`Created ${decisionFile}.`);
  return { config, entry, decisionFile };
}

function prependDecisionEntry(file, entry) {
  const current = readMaybe(file);
  const firstEntry = current.search(/^###\s+/m);
  const next = firstEntry === -1
    ? `${current.replace(/\s*$/, "")}\n\n${entry.trim()}\n`
    : `${current.slice(0, firstEntry).replace(/\s*$/, "")}\n\n${entry.trim()}\n\n${current.slice(firstEntry).replace(/^\s+/, "")}`;
  fs.writeFileSync(file, next, "utf8");
}

function buildDecisionEntry(config, date, fields) {
  if (isChinese(config)) {
    return [
      "",
      `### ${date} - ${fields.title}`,
      "",
      `- 背景：${fields.context}`,
      `- 决策：${fields.decision}`,
      `- 备选方案：${fields.alternatives || "暂无记录。"}`,
      `- 影响文件/模块：${fields.files || "未指定。"}`,
      `- 关联变更：${fields.relatedChange || "未指定。"}`,
      `- 验证方式：${fields.verification || "暂无记录。"}`,
      `- 风险：${fields.risks || "暂无记录。"}`,
      `- 复审时间：${fields.reviewAfter || "未安排。"}`,
      `- 后续动作：${fields.followUp || "暂无记录。"}`,
      "",
    ].join("\n");
  }
  return [
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
}

function writeDecisionFile(root, config, date, fields, entry) {
  const dir = config.memoryFiles.decisionsDirectory;
  if (!dir) return "";
  const slug = slugify(fields.title) || `decision-${Date.now()}`;
  const safeDate = date.replace(/[^0-9-]/g, "");
  const safeSlug = slug.replace(/[^\p{Letter}\p{Number}-]/gu, "");
  const relative = path.join(dir, `${safeDate}-${safeSlug}.md`).replace(/\\/g, "/");
  const fullPath = path.join(root, relative);
  const rootResolved = path.resolve(root);
  if (!path.resolve(fullPath).startsWith(rootResolved + path.sep) && path.resolve(fullPath) !== rootResolved) {
    fail(`Decision file path escapes project root: ${relative}`);
  }
  const dateLabel = isChinese(config) ? "日期" : "Date";
  const recordHeading = isChinese(config) ? "## 决策记录" : "## Decision Record";
  const content = [
    `# ${fields.title}`,
    "",
    `${dateLabel}: ${date}`,
    "",
    recordHeading,
    entry.trim(),
    "",
  ].join("\n");
  writeFile(path.join(root, relative), content);
  return relative;
}

function prompt(label) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(label, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

async function requiredValue(value, label) {
  const next = value || (process.stdin.isTTY ? await prompt(`${label}: `) : "");
  if (!next) fail(`Missing required field: ${label}`);
  return next;
}

async function optionalValue(value, label) {
  return value || (process.stdin.isTTY ? await prompt(`${label}: `) : "");
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function today() {
  return timestamp().slice(0, 10);
}

module.exports = {
  addDecision,
  buildDecisionEntry,
  parseFlags,
  prependDecisionEntry,
  slugify,
  writeDecisionFile,
};
