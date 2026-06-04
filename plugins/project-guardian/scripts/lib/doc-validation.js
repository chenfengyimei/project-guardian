"use strict";

const fs = require("fs");
const path = require("path");

function runDocValidation(root, config) {
  const reports = getDocRules(config).map((rule) => inspectDoc(root, rule));
  const issues = reports.flatMap((report) => report.issues.map((message) => ({ file: report.file, message })));
  return { ok: issues.length === 0, reports, issues };
}

function inspectDoc(root, rule) {
  const filePath = path.join(root, rule.file);
  const text = readMaybe(filePath);
  const placeholders = countPlaceholders(text);
  const issues = [];

  if (!text.trim()) issues.push("file is empty");
  if (meaningfulLength(text) < rule.minLength) issues.push(`content is too short: ${meaningfulLength(text)}/${rule.minLength}`);
  for (const section of rule.sections) {
    const variants = Array.isArray(section) ? section : [section];
    if (!variants.some((variant) => text.includes(variant))) issues.push(`missing section: ${variants.join(" / ")}`);
  }
  if (placeholders > rule.maxPlaceholders) issues.push(`too many placeholders: ${placeholders}/${rule.maxPlaceholders}`);
  for (const issue of fieldIssues(text)) issues.push(issue);
  if (hasEmptyTableRow(text)) issues.push("contains an empty table row");
  if (rule.type === "state" && !/^(Last updated|最后更新)[:：]\s*\S+/m.test(text)) issues.push("Last updated / 最后更新 must have a value");
  if (rule.type === "decisions" && !hasRealDecision(text)) issues.push("must contain a real decision or explicitly say 暂无关键决策");
  if (rule.type === "changelog") {
    const latest = latestChangelogText(text);
    if (hasTodo(latest)) issues.push("latest changelog entry must not contain TODO / 待填写");
    if (hasMidnightTimestamp(latest)) issues.push("latest changelog entry must use the current local HH:mm time, not 00:00");
  }

  return { file: rule.file, placeholders, issues };
}

function countPlaceholders(text) {
  let count = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (hasTodo(line)) count += 1;
    if (/^-\s*$/.test(line)) count += 1;
    if (/^-\s*[^:：]+[:：]\s*$/.test(line)) count += 1;
    if (/^(Last (updated|generated)|最后(更新|生成))[:：]\s*$/.test(line)) count += 1;
    if (/^\|\s*(\|\s*)+$/.test(line)) count += 1;
  }
  return count;
}

function meaningfulLength(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*\-_|:`\s]/g, "")
    .replace(/\bTODO\b/gi, "")
    .replace(/待填写/g, "")
    .length;
}

function fieldIssues(text) {
  return text
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), index: index + 1 }))
    .filter(({ line }) => /^-\s*[^:：]+[:：]\s*$/.test(line))
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
  const hasDecisionTitle = /###\s+\d{4}-\d{2}-\d{2}\s+-\s+(?!(Decision title|决策标题))[^\n]+/.test(text);
  const hasDecisionField = /-\s*(Decision|决策)[:：]\s*\S+/i.test(text);
  return hasDecisionTitle && hasDecisionField;
}

function hasTodo(text) {
  return /\bTODO\b/i.test(text) || text.includes("待填写");
}

function latestChangelog(root, config) {
  return latestChangelogText(readMaybe(path.join(root, config.memoryFiles.changelog)));
}

function latestChangelogText(text) {
  const matches = [...text.matchAll(/^###\s+.+$/gm)];
  if (matches.length === 0) return "";
  const first = matches[0];
  const second = matches[1];
  return text.slice(first.index, second ? second.index : undefined);
}

function hasMidnightTimestamp(text) {
  return /^###\s+\d{4}-\d{2}-\d{2}\s+00:00\s+-\s+\S+/m.test(text);
}

function getDocRules(config) {
  return [
    {
      file: config.memoryFiles.context,
      type: "context",
      sections: [
        ["## Project Summary", "## 项目概览"],
        ["## Tech Stack", "## 技术栈"],
        ["## Core Business Flows", "## 核心业务流程"],
        ["## How To Run", "## 如何运行"],
      ],
      maxPlaceholders: 8,
      minLength: 400,
    },
    {
      file: config.memoryFiles.state,
      type: "state",
      sections: [
        ["## Current Status", "## 当前状态"],
        ["## Next Steps", "## 下一步"],
        ["## Known Issues", "## 已知问题"],
        ["## Latest AI-Assisted Change", "## 最新 AI 协助变更"],
      ],
      maxPlaceholders: 6,
      minLength: 300,
    },
    {
      file: config.memoryFiles.decisions,
      type: "decisions",
      sections: [["# Decisions", "# 决策记录"]],
      maxPlaceholders: 4,
      minLength: 150,
    },
    {
      file: config.memoryFiles.changelog,
      type: "changelog",
      sections: [["# AI Changelog", "# AI 变更日志"]],
      maxPlaceholders: 8,
      minLength: 150,
    },
    {
      file: config.memoryFiles.handover,
      type: "handover",
      sections: [
        ["## First Read", "## 优先阅读"],
        ["## How To Run", "## 如何运行"],
        ["## Project Map", "## 项目地图"],
        ["## New Developer First Day", "## 新人第一天"],
      ],
      maxPlaceholders: 8,
      minLength: 300,
    },
  ];
}

function readMaybe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (_) {
    return "";
  }
}

module.exports = {
  countPlaceholders,
  getDocRules,
  hasMidnightTimestamp,
  hasTodo,
  inspectDoc,
  latestChangelog,
  latestChangelogText,
  runDocValidation,
};
