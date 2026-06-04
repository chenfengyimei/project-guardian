"use strict";

const fs = require("fs");
const path = require("path");

function searchIndex(index, question, limit) {
  const terms = tokenize(question);
  const scored = index
    .map((doc) => ({ doc, score: score(doc, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const bestKnowledgeScore = Math.max(0, ...scored.filter((item) => item.doc.kind === "knowledge").map((item) => item.score));
  return scored
    .filter((item) => includeQueryResult(item, terms, bestKnowledgeScore))
    .slice(0, limit);
}

function score(doc, terms) {
  const haystack = `${doc.file}\n${doc.text}`.toLowerCase();
  let total = 0;
  for (const term of terms) {
    const matches = haystack.match(new RegExp(escapeRegExp(term.toLowerCase()), "g"));
    if (matches) total += matches.length * Math.min(term.length, 8);
  }
  const fileMatched = pathMatchesTerms(doc.file, terms);
  if (total === 0 && !fileMatched) return 0;
  if (doc.kind === "knowledge") total += 3;
  if (fileMatched) total += 12;
  return total;
}

function includeQueryResult(item, terms, bestKnowledgeScore) {
  if (item.doc.kind === "knowledge") return true;
  if (bestKnowledgeScore === 0) return true;
  if (pathMatchesTerms(item.doc.file, terms)) return true;
  return item.score >= Math.max(48, bestKnowledgeScore * 4);
}

function pathMatchesTerms(file, terms) {
  const normalized = file.toLowerCase().replace(/\\/g, "/");
  return terms.some((term) => term.length >= 3 && normalized.includes(term.toLowerCase()));
}

function formatResults(results) {
  if (results.length === 0) return "No strong local match. Try a module name, file name, error message, or business keyword.";
  return results
    .map(({ doc, score: resultScore }, index) => {
      const preview = doc.text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8)
        .join("\n");
      return [`\n[${index + 1}] Source: ${doc.file} (score ${resultScore})`, "```text", preview, "```"].join("\n");
    })
    .join("\n");
}

function buildBrief(root, config, question, limit, mode = "auto") {
  const files = [
    briefFile(root, config.memoryFiles.context, "Stable project purpose, architecture, environment, and core workflows."),
    briefFile(root, config.memoryFiles.state, "Current status, known issues, next steps, and latest AI-assisted change."),
    briefFile(root, config.memoryFiles.decisions, "Architecture, workflow, security, compatibility, dependency, and review decisions."),
    briefFile(root, config.memoryFiles.changelog, "Recent implementation history, verification notes, regressions, and risks."),
    briefFile(root, config.memoryFiles.handover, "Onboarding, handover, release preparation, and first-day guidance."),
  ];
  const required = files.slice(0, 2).filter((file) => file.exists);
  const optional = files.slice(2).filter((file) => file.exists);
  const relevantOptional = optional.filter((file) => briefFileRelevant(file.file, question));
  const recommended = recommendedBriefFiles(mode, required, optional, relevantOptional, question);
  const fullTokens = files.reduce((total, file) => total + file.tokens, 0);
  const recommendedTokens = recommended.reduce((total, file) => total + file.tokens, 0);
  return { question, limit, mode, files, required, optional, relevantOptional, recommended, fullTokens, recommendedTokens };
}

function recommendedBriefFiles(mode, required, optional, relevantOptional, question) {
  if (mode === "quick") return required;
  if (mode === "deep") return uniqueBriefFiles([...required, ...optional.filter((file) => /DECISIONS|AI_CHANGELOG/i.test(file.file))]);
  if (mode === "full") return uniqueBriefFiles([...required, ...optional]);
  return question ? uniqueBriefFiles([...required, ...relevantOptional]) : required;
}

function briefFile(root, file, reason) {
  const text = readMaybe(path.join(root, file));
  return { file, reason, exists: Boolean(text), tokens: estimateTokens(text) };
}

function briefFileRelevant(file, question) {
  if (!question) return false;
  const text = question.toLowerCase();
  if (/DECISIONS/i.test(file)) return /decisions|decision|architecture|dependency|security|compatibility|workflow|review|token|budget|cost|mcp|ci|auth|payment|data model|决策|架构|依赖|安全|权限|兼容|工作流|复审|成本|预算|消耗|登录|支付|数据模型|质量/.test(text);
  if (/AI_CHANGELOG/i.test(file)) return /history|recent|change|changed|changelog|bug|regression|error|why|risk|最近|历史|变更|修改|修复|报错|错误|回归|风险|为什么/.test(text);
  if (/HANDOVER/i.test(file)) return /handover|onboard|onboarding|release|start|first day|交接|接手|新人|上线|发布|入门|第一天/.test(text);
  return false;
}

function uniqueBriefFiles(files) {
  const seen = new Set();
  return files.filter((file) => {
    if (seen.has(file.file)) return false;
    seen.add(file.file);
    return true;
  });
}

function estimateTokens(text) {
  return Math.ceil(String(text || "").length / 2.2);
}

function formatBrief(briefData) {
  const savings = briefData.fullTokens > 0
    ? Math.max(0, Math.round((1 - briefData.recommendedTokens / briefData.fullTokens) * 100))
    : 0;
  const queryText = shellQuoteText(briefData.question || "your question");
  const linesOut = [
    "Project Guardian brief",
    "",
    `Question: ${briefData.question || "(not provided)"}`,
    `Mode: ${briefData.mode} budget-aware staged reading`,
    "",
    "Mode guide:",
    "- auto: route by task keywords, then escalate when evidence is weak.",
    "- quick: read only stable context and current state for low-risk routine work.",
    "- deep: read context, state, decisions, and changelog for bugs, regressions, high-risk modules, or unclear history.",
    "- full: read every core memory file for onboarding, handoff, release, audits, large refactors, or explicit full-context requests.",
    "",
    "Read first:",
    ...briefData.required.map((file) => `- ${file.file} (~${file.tokens} tokens): ${file.reason}`),
    "",
    "Read only when relevant:",
    ...briefData.optional.map((file) => `- ${file.file} (~${file.tokens} tokens): ${file.reason}`),
    "",
    "Recommended for this task:",
    ...briefData.recommended.map((file) => `- ${file.file}`),
    "",
    "Suggested commands:",
    `- guardian query "${queryText}" --limit ${briefData.limit}`,
    `- guardian brief "${queryText}" --mode deep --limit ${briefData.limit}`,
    `- guardian brief "${queryText}" --mode full --limit ${briefData.limit}`,
    "- guardian reviews due",
    "",
    "Estimated memory token budget:",
    `- Recommended first pass: ~${briefData.recommendedTokens} tokens`,
    `- Full core memory: ~${briefData.fullTokens} tokens`,
    `- Estimated savings: ~${savings}%`,
    "",
    "Escalate to deep/full when:",
    "- the task touches auth, payment, permissions, data models, CI, MCP, security, compatibility, or shared workflows;",
    "- tests fail, behavior regresses, an error message appears, or the existing implementation is unclear;",
    "- the user asks why something changed, what happened before, or who should take over;",
    "- query results are weak, conflicting, or missing important source paths;",
    "- you plan to delete, rewrite, migrate, or refactor important code.",
    "",
    "Rule: budget-aware reading is a starting point, not a hard restriction. Escalate before making risky changes.",
  ];
  return linesOut.join("\n");
}

function chunks(file, text, size, overlap, kind = "source") {
  const clean = text.replace(/\0/g, "");
  const result = [];
  for (let start = 0; start < clean.length; start += size - overlap) {
    result.push({ file, kind, text: clean.slice(start, start + size) });
    if (result.length > 20) break;
  }
  return result;
}

function tokenize(input) {
  const ascii = input.toLowerCase().match(/[a-z0-9_.:/-]{2,}/g) || [];
  const cjk = input.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const cjkPairs = cjk.flatMap((word) => {
    const pairs = [];
    for (let i = 0; i < word.length - 1; i += 1) pairs.push(word.slice(i, i + 2));
    return pairs;
  });
  return [...new Set([...ascii, ...cjk, ...cjkPairs])];
}

function shellQuoteText(text) {
  return String(text).replace(/"/g, '\\"');
}

function readMaybe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (_) {
    return "";
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  buildBrief,
  chunks,
  estimateTokens,
  formatBrief,
  formatResults,
  searchIndex,
  tokenize,
};
