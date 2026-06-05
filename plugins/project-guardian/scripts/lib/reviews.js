"use strict";

const fs = require("fs");
const path = require("path");
const { isChinese, loadConfig } = require("./config");

function reviews(root, args = []) {
  const config = loadConfig(root);
  ensureInitialized(root, config);
  const subcommand = args[0] || "list";
  if (subcommand === "complete") {
    completeReview(root, config, args.slice(1));
    return;
  }
  if (!["list", "due", "status"].includes(subcommand)) {
    fail("Unknown reviews command. Use: guardian reviews, guardian reviews due, or guardian reviews complete <decision-file>");
  }
  const result = runReviewValidation(root, config);
  printReviewValidation(result, false);
  if (subcommand === "due" && !result.ok) process.exit(1);
}

function runReviewValidation(root, config) {
  const items = getReviewItems(root, config);
  const due = items.filter((item) => item.status === "due");
  const issues = due.map((item) => ({
    file: item.file,
    message: `review due since ${item.reviewAfter}: ${item.title}`,
  }));
  return { ok: due.length === 0, items, due, issues };
}

function printReviewValidation(result, silent) {
  if (silent) return;
  console.log("Project Guardian decision review");
  console.log("");
  if (result.items.length === 0) {
    console.log("No scheduled decision reviews found.");
    return;
  }
  for (const item of result.items) {
    const label = item.status === "completed" ? "completed" : item.status === "due" ? "due" : "scheduled";
    console.log(`${item.file}: ${label} (review after ${item.reviewAfter})`);
    console.log(`  - ${item.title}`);
    if (item.status === "due") console.log(`  - review due since ${item.reviewAfter}`);
  }
  console.log(result.ok ? "\nDecision review check passed." : "\nDecision review check failed.");
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

function getReviewItems(root, config) {
  return getDecisionFiles(root, config)
    .map((file) => reviewItem(root, file))
    .filter((item) => item.reviewAfter);
}

function reviewItem(root, file) {
  const text = readMaybe(path.join(root, file));
  const reviewAfter = reviewDate(text);
  const title = reviewTitle(text, file);
  const completed = reviewCompleted(text);
  const status = completed ? "completed" : reviewAfter && reviewAfter <= today() ? "due" : "scheduled";
  return { file, title, reviewAfter, completed, status };
}

function reviewDate(text) {
  const match = text.match(/^-\s*(?:Review after|复审时间)[:：]\s*(.+)$/mi);
  if (!match) return "";
  const value = match[1].trim();
  if (/^(not scheduled|未安排)/i.test(value)) return "";
  const date = value.match(/\d{4}-\d{2}-\d{2}/);
  return date ? date[0] : "";
}

function reviewTitle(text, fallback) {
  const heading = text.match(/^###\s+(.+)$/m) || text.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback;
}

function reviewCompleted(text) {
  const status = text.match(/^-\s*(?:Review status|复审状态)[:：]\s*(.+)$/mi);
  const further = text.match(/^-\s*(?:Further review|后续复审)[:：]\s*(.+)$/mi);
  return Boolean(status && /^(completed|complete|done|normal|正常|已完成|无需继续复审)/i.test(status[1].trim()))
    || Boolean(further && /^(no further review needed|无需继续复审)/i.test(further[1].trim()));
}

function completeReview(root, config, args) {
  const flags = parseFlags(args);
  const target = flags._[0];
  if (!target) fail("Missing decision file. Use: guardian reviews complete memory/decisions/example.md --summary \"Still valid\" --verification \"Checked tests\"");
  const file = resolveReviewFile(root, config, target);
  const full = path.join(root, file);
  const current = readMaybe(full);
  if (!current) fail(`Review file not found: ${target}`);
  if (reviewCompleted(current)) {
    console.log(`${file} is already marked as review completed.`);
    return;
  }
  const block = buildReviewCompletion(config, flags);
  fs.writeFileSync(full, `${current.replace(/\s*$/, "")}\n\n${block}\n`, "utf8");
  console.log(`Marked review completed for ${file}.`);
}

function resolveReviewFile(root, config, target) {
  const normalized = normalizePath(target);
  const rootPath = path.resolve(root);
  const direct = path.resolve(rootPath, normalized);
  if (!direct.startsWith(`${rootPath}${path.sep}`) && direct !== rootPath) {
    fail(`Review file must be inside the project: ${target}`);
  }
  if (fs.existsSync(direct)) return normalizePath(path.relative(rootPath, direct));
  const files = getDecisionFiles(root, config);
  const found = files.find((file) => file === normalized || path.basename(file) === normalized || file.includes(normalized));
  if (!found) fail(`Review file not found: ${target}`);
  return found;
}

function buildReviewCompletion(config, flags) {
  const reviewer = flags.reviewer || flags.by || (isChinese(config) ? "AI 或人工复审者" : "AI or human reviewer");
  const summary = flags.summary || flags.result || (isChinese(config) ? "复审通过，当前决策仍然有效。" : "Review passed; the decision remains valid.");
  const verification = flags.verification || (isChinese(config) ? "复审时已检查相关代码、文档或测试结果。" : "Relevant code, docs, or test results were checked during review.");
  if (isChinese(config)) {
    return [
      "## 复审结果",
      "",
      "- 复审状态：正常",
      `- 复审完成时间：${timestamp()}`,
      `- 复审人：${reviewer}`,
      `- 复审结论：${summary}`,
      `- 验证方式：${verification}`,
      "- 后续复审：无需继续复审",
    ].join("\n");
  }
  return [
    "## Review Result",
    "",
    "- Review status: completed",
    `- Review completed at: ${timestamp()}`,
    `- Reviewer: ${reviewer}`,
    `- Review summary: ${summary}`,
    `- Verification: ${verification}`,
    "- Further review: no further review needed",
  ].join("\n");
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

function normalizePath(file) {
  return String(file || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function readMaybe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (_) {
    return "";
  }
}

function today() {
  return timestamp().slice(0, 10);
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

module.exports = {
  buildReviewCompletion,
  completeReview,
  getDecisionFiles,
  getReviewItems,
  printReviewValidation,
  reviewCompleted,
  reviewDate,
  reviewItem,
  reviews,
  runReviewValidation,
};
