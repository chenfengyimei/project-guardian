"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { isChinese, loadConfig } = require("./config");

async function addDecision(root, args = []) {
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
  const entry = buildDecisionEntry(config, date, fields);
  const decisionFile = writeDecisionFile(root, config, date, fields, entry);
  fs.appendFileSync(path.join(root, config.memoryFiles.decisions), entry, "utf8");
  if (decisionFile) {
    const decisionFileLabel = isChinese(config) ? "决策文件" : "Decision file";
    const separator = isChinese(config) ? "：" : ":";
    const padding = isChinese(config) ? "" : " ";
    fs.appendFileSync(path.join(root, config.memoryFiles.decisions), `- ${decisionFileLabel}${separator}${padding}\`${decisionFile}\`\n`, "utf8");
  }
  console.log(`Added decision to ${config.memoryFiles.decisions}.`);
  if (decisionFile) console.log(`Created ${decisionFile}.`);
  return { config, entry, decisionFile };
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
  const relative = path.join(dir, `${date}-${slug}.md`).replace(/\\/g, "/");
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

function ensureInitialized(root, config) {
  const missing = [
    config.memoryFiles.context,
    config.memoryFiles.state,
    config.memoryFiles.decisions,
    config.memoryFiles.changelog,
    config.memoryFiles.handover,
  ].filter((file) => !fs.existsSync(path.join(root, file)));
  if (missing.length > 0) fail(`Project Guardian memory is missing: ${missing.join(", ")}\nRun: guardian init`);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function today() {
  return timestamp().slice(0, 10);
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

module.exports = {
  addDecision,
  buildDecisionEntry,
  parseFlags,
  slugify,
  writeDecisionFile,
};
