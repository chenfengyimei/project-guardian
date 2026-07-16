"use strict";

const fs = require("fs");
const path = require("path");
const { isChinese, loadConfig } = require("./config");
const { collectFiles } = require("./git-utils");
const { ensureInitialized, fail, readMaybe, timestamp, writeFile } = require("./shared");

function generateHandover(root) {
  const config = loadConfig(root);
  ensureInitialized(root, config);

  const files = collectFiles(root, config, 160);
  const packageInfo = readPackageInfo(root);
  const state = readMaybe(path.join(root, config.memoryFiles.state)).trim();
  const context = readMaybe(path.join(root, config.memoryFiles.context)).trim();
  const decisions = readDecisions(root, config).trim();
  const content = buildHandover(config, { context, decisions, files, packageInfo, state });

  writeFile(path.join(root, config.memoryFiles.handover), content);
  return { path: config.memoryFiles.handover, config };
}

function buildHandover(config, data) {
  const { context, decisions, files, packageInfo, state } = data;
  if (isChinese(config)) {
    return [
      "# 交接指南",
      "",
      `最后生成：${timestamp()}`,
      "",
      "## 优先阅读",
      "",
      "修改代码前先阅读这些文件：",
      "",
      `1. \`${config.memoryFiles.context}\``,
      `2. \`${config.memoryFiles.state}\``,
      `3. \`${config.memoryFiles.decisions}\``,
      `4. \`${config.memoryFiles.changelog}\``,
      "",
      "## 如何运行",
      "",
      packageInfo,
      "",
      "## 项目地图",
      "",
      "| 区域 | 文件 | 用途 |",
      "| --- | --- | --- |",
      ...files.slice(0, 80).map((file) => `| ${areaFor(file)} | \`${file}\` | 修改 ${areaFor(file)} 时需要查看。 |`),
      "",
      "## 当前状态快照",
      "",
      fenced(trimForDoc(state, 3000)),
      "",
      "## 项目上下文快照",
      "",
      fenced(trimForDoc(context, 3000)),
      "",
      "## 决策快照",
      "",
      fenced(trimForDoc(decisions, 2500)),
      "",
      "## 风险区域",
      "",
      "- 修改核心行为前先查看状态文件中的 `风险区域`。",
      "- 提交交接变更前运行 `guardian verify`。",
      "",
      "## 常见问题",
      "",
      "| 问题 | 可能原因 | 处理方式 |",
      "| --- | --- | --- |",
      "| 记忆校验失败 | 必填字段仍是模板或待填写 | 补齐最新变更、当前状态和决策细节 |",
      "",
      "## 新人第一天",
      "",
      "1. 阅读全部项目记忆文件。",
      "2. 在本地跑起来项目。",
      "3. 运行可用测试或冒烟检查。",
      `4. 从 \`${config.memoryFiles.state}\` 里选一个小的下一步任务。`,
      `5. 完成后更新 \`${config.memoryFiles.state}\` 和 \`${config.memoryFiles.changelog}\`。`,
      "",
    ].join("\n");
  }

  return [
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

function areaFor(file) {
  const first = file.split(/[\\/]/)[0];
  return first === file ? "root" : first;
}

function fenced(text) {
  return ["```text", text || "No content recorded.", "```"].join("\n");
}

function trimForDoc(text, max) {
  if (!text) return "No content recorded.";
  const normalized = String(text).split(/\r?\n/).map((line) => line.trimEnd()).join("\n");
  return normalized.length <= max ? normalized : `${normalized.slice(0, max).trimEnd()}\n[snapshot truncated]`;
}

module.exports = {
  buildHandover,
  generateHandover,
  readDecisions,
  readPackageInfo,
  trimForDoc,
};
