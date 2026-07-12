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
const { ensureInitialized, lines, parseFlags, readMaybe, timestamp } = require("./shared");

function update(root, task) {
  const config = loadConfig(root);
  ensureInitialized(root, config);

  const title = task || "AI-assisted change";
  const changedFiles = changedFilesForUpdate(root);
  const diffStat = gitChangeSummary(root) || "No git diff stat available.";
  const changedLines = changedLineRanges(root);
  const entry = buildChangeEntry(config, title, task, changedFiles, changedLines, diffStat);

  fs.appendFileSync(path.join(root, config.memoryFiles.changelog), entry, "utf8");
  refreshStateLatestChange(root, config, title, changedFiles);
  console.log(`Updated ${config.memoryFiles.changelog} and ${config.memoryFiles.state}.`);
  console.log(isChinese(config) ? "提交前请把待填写字段补充完整。" : "Please replace TODO fields before committing.");
}

function appendMemory(root, args = []) {
  const config = loadConfig(root);
  ensureInitialized(root, config);
  const flags = parseFlags(args);

  if (flags.templates) {
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

function buildChangeEntry(config, title, task, changedFiles, changedLines, diffStat) {
  if (isChinese(config)) {
    return [
      "",
      `### ${timestamp()} - ${title}`,
      "",
      `- 用户需求：${task || "待填写：描述本次需求。"}`,
      "- AI 总结：待填写：说明改了什么以及为什么改。",
      "- 变更文件：",
      indentList(changedFiles.join("\n") || "未检测到变更文件。"),
      "- 变更行：",
      indentList(changedLines.join("\n") || "N/A"),
      "- 业务原因：待填写：记录本次变更背后的业务规则、缺陷或需求。",
      "- 技术说明：",
      "  ```text",
      diffStat
        .split(/\r?\n/)
        .map((line) => `  ${line}`)
        .join("\n"),
      "  ```",
      "- 验证方式：待填写：记录命令或人工检查。",
      "- 风险：待填写：记录兼容性、数据、UI 或部署风险。",
      "- 敏感信息检查：待填写：是否检查过密码、token、客户隐私等。",
      "- 下一步：待填写：记录下一个开发者应该做什么。",
      "",
    ].join("\n");
  }
  return [
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
}

function buildStateLatestChange(config, marker, title, changedFiles) {
  if (isChinese(config)) {
    return [
      marker,
      "",
      `- 任务：${title}`,
      "- 总结：待填写：概括行为变化。",
      "- 文件：",
      indentList(changedFiles.join("\n") || "未检测到变更文件。"),
      "- 验证：待填写：记录检查方式。",
      "- 后续：待填写：记录下一步。",
      "",
    ].join("\n");
  }
  return [
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
}

function refreshStateLatestChange(root, config, title, changedFiles) {
  const statePath = path.join(root, config.memoryFiles.state);
  const current = readMaybe(statePath);
  const marker = isChinese(config) ? "## 最新 AI 协助变更" : "## Latest AI-Assisted Change";
  const markerPattern = /(## Latest AI-Assisted Change|## 最新 AI 协助变更)[\s\S]*$/;
  const replacement = buildStateLatestChange(config, marker, title, changedFiles);
  const withDate = current
    .replace(/^Last updated:.*$/m, `Last updated: ${timestamp()}`)
    .replace(/^最后更新[:：].*$/m, `最后更新：${timestamp()}`);
  if (markerPattern.test(current)) {
    fs.writeFileSync(statePath, withDate.replace(markerPattern, replacement), "utf8");
  } else {
    fs.writeFileSync(statePath, `${withDate}\n${replacement}`, "utf8");
  }
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
  indentList,
};
