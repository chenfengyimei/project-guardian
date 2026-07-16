"use strict";

const fs = require("fs");
const path = require("path");
const { isChinese, loadConfig } = require("./config");
const { changedFilesForUpdate, changedLineRanges, gitChangeSummary } = require("./git-utils");
const {
  buildManualMemoryContent,
  buildManualMemoryEntry,
  normalizeMemoryName,
  publicMemoryAppendTemplates,
  resolveMemoryTarget: resolveManualMemoryTarget,
} = require("./manual-memory");
const { ensureInitialized, fail, lines, parseFlags, readMaybe, timestamp, validateMemoryWriteText } = require("./shared");

function update(root, args = []) {
  const config = loadConfig(root);
  ensureInitialized(root, config);

  const flags = parseFlags(Array.isArray(args) ? args : [String(args || "")]);
  let task;
  let details;
  try {
    task = validateMemoryWriteText(flags._.join(" "), "Task summary", 500, { required: true });
    details = updateDetails(flags);
  } catch (error) {
    fail(error.message, 2);
  }
  const title = task || "AI-assisted change";
  const changedFiles = changedFilesForUpdate(root);
  const diffStat = gitChangeSummary(root) || "No git diff stat available.";
  const changedLines = changedLineRanges(root);
  const entry = buildChangeEntry(config, title, task, changedFiles, changedLines, diffStat, details);

  prependChangelogEntry(path.join(root, config.memoryFiles.changelog), entry);
  refreshStateLatestChange(root, config, title, changedFiles, details);
  console.log(`Updated ${config.memoryFiles.changelog} and ${config.memoryFiles.state}.`);
  if (completeUpdateDetails(details)) {
    console.log(isChinese(config) ? "结构化变更记录已完整生成；提交前请审阅 diff 并运行 guardian verify。" : "The structured change record is complete; review the diff and run guardian verify before committing.");
  } else {
    console.log(isChinese(config) ? "提交前请把待填写字段补充完整。" : "Please replace TODO fields before committing.");
  }
}

function appendMemory(root, args = []) {
  const config = loadConfig(root);
  ensureInitialized(root, config);
  const flags = parseFlags(args);

  if (flags.templates) {
    const unexpected = Object.keys(flags).filter((name) => !["_", "templates", "file", "name", "target"].includes(name));
    if (unexpected.length > 0) fail(`Option --${unexpected[0]} cannot be used with --templates.`, 2);
    printAppendMemoryTemplates(flags.file || flags.name || "");
    return;
  }

  const memoryName = flags.file || flags.name || flags.target;
  if (!memoryName) {
    process.stderr.write("Missing memory file. Use: guardian append-memory --file STATE --template state-progress\n");
    process.exit(1);
  }

  let target;
  try {
    target = resolveManualMemoryTarget(root, config.memoryFiles, memoryName);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }

  let content;
  try {
    content = buildManualMemoryContent(target.name, flags.template, flags, flags.content);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }

  fs.appendFileSync(path.join(root, target.relativePath), buildManualMemoryEntry(target.name, content, {
    source: isChinese(config) ? "Project Guardian CLI 手动追加。" : "Project Guardian CLI manual append.",
    titlePrefix: isChinese(config) ? "CLI 手动记录" : "CLI manual note",
  }), "utf8");
  console.log(`Appended memory to ${target.relativePath}.`);
}

function printAppendMemoryTemplates(fileName = "") {
  const normalized = fileName ? normalizeMemoryName(fileName) : "";
  const templates = publicMemoryAppendTemplates().filter((item) => !normalized || item.target === normalized || item.target === "*");
  console.log("Project Guardian memory append templates");
  console.log("");
  for (const item of templates) {
    console.log(`${item.id} (${item.target}) - ${item.label}`);
    console.log(`  ${item.description}`);
    for (const field of item.fields) {
      const required = field.required ? "required" : "optional";
      console.log(`  --${field.name} <text> (${required}) ${field.label}`);
    }
    console.log("");
  }
}

function buildChangeEntry(config, title, task, changedFiles, changedLines, diffStat, details = {}) {
  if (isChinese(config)) {
    return [
      "",
      `### ${timestamp()} - ${title}`,
      "",
      `- 用户需求：${task || "待填写：描述本次需求。"}`,
      `- AI 总结：${fieldValue(details.summary, "待填写：说明改了什么以及为什么改。")}`,
      "- 变更文件：",
      indentList(changedFiles.join("\n") || "未检测到变更文件。"),
      "- 变更行：",
      indentList(changedLines.join("\n") || "N/A"),
      `- 业务原因：${fieldValue(details.reason, "待填写：记录本次变更背后的业务规则、缺陷或需求。")}`,
      "- 技术说明：",
      "  ```text",
      diffStat
        .split(/\r?\n/)
        .map((line) => line ? `  ${line}` : "")
        .join("\n"),
      "  ```",
      `- 验证方式：${fieldValue(details.verification, "待填写：记录命令或人工检查。")}`,
      `- 风险：${fieldValue(details.risks, "待填写：记录兼容性、数据、UI 或部署风险。")}`,
      `- 敏感信息检查：${fieldValue(details.sensitiveData, "待填写：是否检查过密码、token、客户隐私等。")}`,
      `- 下一步：${fieldValue(details.nextStep, "待填写：记录下一个开发者应该做什么。")}`,
      "",
    ].join("\n");
  }
  return [
    "",
    `### ${timestamp()} - ${title}`,
    "",
    `- Human request: ${task || "TODO: describe the request."}`,
    `- AI summary: ${fieldValue(details.summary, "TODO: summarize what changed and why.")}`,
    "- Files changed:",
    indentList(changedFiles.join("\n") || "No changed files detected."),
    "- Changed lines:",
    indentList(changedLines.join("\n") || "N/A"),
    `- Business reason: ${fieldValue(details.reason, "TODO: record the business rule, bug, or requirement behind this change.")}`,
    "- Technical notes:",
    "  ```text",
    diffStat
      .split(/\r?\n/)
      .map((line) => line ? `  ${line}` : "")
      .join("\n"),
    "  ```",
    `- Verification: ${fieldValue(details.verification, "TODO: record commands or manual checks.")}`,
    `- Risks: ${fieldValue(details.risks, "TODO: record compatibility, data, UI, or deployment risks.")}`,
    `- Sensitive data checked: ${fieldValue(details.sensitiveData, "TODO: yes/no and notes.")}`,
    `- Next step: ${fieldValue(details.nextStep, "TODO: record what the next developer should do.")}`,
    "",
  ].join("\n");
}

function buildStateLatestChange(config, marker, title, changedFiles, details = {}) {
  if (isChinese(config)) {
    return [
      marker,
      "",
      `- 任务：${title}`,
      `- 总结：${fieldValue(details.summary, "待填写：概括行为变化。")}`,
      "- 文件：",
      indentList(changedFiles.join("\n") || "未检测到变更文件。"),
      `- 验证：${fieldValue(details.verification, "待填写：记录检查方式。")}`,
      `- 后续：${fieldValue(details.nextStep, "待填写：记录下一步。")}`,
      "",
    ].join("\n");
  }
  return [
    marker,
    "",
    `- Task: ${title}`,
    `- Summary: ${fieldValue(details.summary, "TODO: summarize the behavior change.")}`,
    "- Files:",
    indentList(changedFiles.join("\n") || "No changed files detected."),
    `- Verification: ${fieldValue(details.verification, "TODO: record checks.")}`,
    `- Follow-up: ${fieldValue(details.nextStep, "TODO: record next step.")}`,
    "",
  ].join("\n");
}

function refreshStateLatestChange(root, config, title, changedFiles, details = {}) {
  const statePath = path.join(root, config.memoryFiles.state);
  const current = readMaybe(statePath);
  const marker = isChinese(config) ? "## 最新 AI 协助变更" : "## Latest AI-Assisted Change";
  const markerPattern = /(## Latest AI-Assisted Change|## 最新 AI 协助变更)[\s\S]*$/;
  const replacement = buildStateLatestChange(config, marker, title, changedFiles, details);
  const withDate = current
    .replace(/^Last updated:.*$/m, `Last updated: ${timestamp()}`)
    .replace(/^最后更新[:：].*$/m, `最后更新：${timestamp()}`);
  if (markerPattern.test(current)) {
    fs.writeFileSync(statePath, withDate.replace(markerPattern, replacement), "utf8");
  } else {
    fs.writeFileSync(statePath, `${withDate}\n${replacement}`, "utf8");
  }
}

function prependChangelogEntry(file, entry) {
  const current = readMaybe(file);
  const firstEntry = current.search(/^###\s+/m);
  const cleanEntry = entry.trim();
  const next = firstEntry === -1
    ? `${current.replace(/\s*$/, "")}\n\n${cleanEntry}\n`
    : `${current.slice(0, firstEntry).replace(/\s*$/, "")}\n\n${cleanEntry}\n\n${current.slice(firstEntry).replace(/^\s+/, "")}`;
  fs.writeFileSync(file, next, "utf8");
}

function updateDetails(flags) {
  return {
    summary: validateMemoryWriteText(flags.summary, "Summary", 4000),
    reason: validateMemoryWriteText(flags.reason || flags["business-reason"], "Reason", 4000),
    verification: validateMemoryWriteText(flags.verification, "Verification", 4000),
    risks: validateMemoryWriteText(flags.risks || flags.risk, "Risks", 4000),
    sensitiveData: validateMemoryWriteText(flags.sensitiveData || flags["sensitive-data"] || flags.sensitive, "Sensitive-data check", 2000),
    nextStep: validateMemoryWriteText(flags.nextStep || flags["next-step"] || flags.followUp || flags["follow-up"], "Next step", 4000),
  };
}

function fieldValue(value, fallback) {
  const text = String(value || "").trim();
  return text ? text.replace(/\r?\n/g, "\n  ") : fallback;
}

function completeUpdateDetails(details) {
  return ["summary", "reason", "verification", "risks", "sensitiveData", "nextStep"]
    .every((key) => String(details[key] || "").trim());
}

function indentList(value) {
  const items = lines(value);
  if (items.length === 0) return "  - N/A";
  return items.map((item) => `  - \`${item}\``).join("\n");
}

module.exports = {
  update,
  appendMemory,
  printAppendMemoryTemplates,
  buildChangeEntry,
  buildStateLatestChange,
  refreshStateLatestChange,
  prependChangelogEntry,
  updateDetails,
  fieldValue,
  completeUpdateDetails,
  indentList,
};
