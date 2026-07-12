"use strict";

const fs = require("fs");
const path = require("path");
const { readMaybe } = require("./shared");

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
  for (const issue of textIntegrityIssues(text)) issues.push(issue);
  if (rule.type === "state" && !/^(Last updated|最后更新)[:：]\s*\S+/m.test(text)) issues.push("Last updated / 最后更新 must have a value");
  if (rule.type === "decisions") {
    if (!hasRealDecision(text)) issues.push("must contain a real decision or explicitly say 暂无关键决策");
    if (!headingsAreNewestFirst(text, "date")) issues.push("decision entries must be ordered newest first");
  }
  if (rule.type === "changelog") {
    const latest = latestChangelogText(text);
    if (hasTodo(latest)) issues.push("latest changelog entry must not contain TODO / 待填写");
    if (hasMidnightTimestamp(latest)) issues.push("latest changelog entry must use the current local HH:mm time, not 00:00");
    if (!headingsAreNewestFirst(text, "timestamp")) issues.push("changelog entries must be ordered newest first");
  }

  return { file: rule.file, placeholders, issues };
}

function countPlaceholders(text) {
  let count = 0;
  const rawLines = text.split(/\r?\n/);
  for (let index = 0; index < rawLines.length; index += 1) {
    const rawLine = rawLines[index];
    const line = rawLine.trim();
    if (!line) continue;
    if (hasTodo(line)) count += 1;
    if (/^-\s*$/.test(line)) count += 1;
    if (/^-\s*[^:：]+[:：]\s*$/.test(line) && !hasNestedFieldContent(rawLines, index)) count += 1;
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
  const rawLines = text.split(/\r?\n/);
  return rawLines
    .map((raw, index) => ({ raw, line: raw.trim(), index }))
    .filter(({ line, index }) => /^-\s*[^:：]+[:：]\s*$/.test(line) && !hasNestedFieldContent(rawLines, index))
    .map(({ line, index }) => `line ${index + 1} has an empty field: ${line}`);
}

function hasNestedFieldContent(lines, fieldIndex) {
  const fieldIndent = (lines[fieldIndex].match(/^\s*/) || [""])[0].length;
  for (let index = fieldIndex + 1; index < lines.length; index += 1) {
    if (!lines[index].trim()) continue;
    const nextIndent = (lines[index].match(/^\s*/) || [""])[0].length;
    return nextIndent > fieldIndent;
  }
  return false;
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
  const entries = markdownEntries(text);
  if (entries.length === 0) return "";
  const dated = entries.filter((entry) => entry.timestamp);
  if (dated.length === 0) return entries[0].text;
  return dated.reduce((latest, entry) => entry.timestamp > latest.timestamp ? entry : latest).text;
}

function markdownEntries(text) {
  const value = String(text || "");
  const matches = [...value.matchAll(/^###\s+(.+)$/gm)];
  return matches.map((match, index) => {
    const heading = match[1].trim();
    const timestampMatch = heading.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\s+-\s+/);
    const timestamp = timestampMatch
      ? `${timestampMatch[1]} ${timestampMatch[2] || "00:00"}`
      : "";
    const end = matches[index + 1] ? matches[index + 1].index : value.length;
    return { heading, timestamp, text: value.slice(match.index, end).replace(/\s+$/, "") };
  });
}

function headingsAreNewestFirst(text, precision = "timestamp") {
  const entries = markdownEntries(text);
  const values = entries
    .map((entry) => precision === "date" ? entry.timestamp.slice(0, 10) : entry.timestamp)
    .filter(Boolean);
  return values.every((value, index) => index === 0 || values[index - 1] >= value);
}

function textIntegrityIssues(text) {
  const issues = [];
  const value = String(text || "");
  if (value.includes("\uFFFD") || /锟斤拷|ï¿½|Ã[\x80-\xBF]|â(?:€|™|œ|“|”)/.test(value)) {
    issues.push("contains likely encoding corruption or mojibake");
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) {
    issues.push("contains invalid control characters");
  }
  const suspiciousQuestions = value.match(/(?:[\u3400-\u9fff]\?(?=[\u3400-\u9fffA-Za-z0-9`])|\?(?=[\u3400-\u9fff]))/g) || [];
  if (suspiciousQuestions.length >= 3) {
    issues.push(`contains likely damaged CJK text (${suspiciousQuestions.length} suspicious question marks)`);
  }
  return issues;
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

module.exports = {
  countPlaceholders,
  fieldIssues,
  getDocRules,
  hasMidnightTimestamp,
  hasTodo,
  inspectDoc,
  latestChangelog,
  latestChangelogText,
  markdownEntries,
  headingsAreNewestFirst,
  hasNestedFieldContent,
  textIntegrityIssues,
  runDocValidation,
};
