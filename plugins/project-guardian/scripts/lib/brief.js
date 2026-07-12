"use strict";

const path = require("path");
const { readMaybe, estimateTokens } = require("./shared");

function buildBrief(root, config, question, limit, mode = "auto") {
  const mf = config.memoryFiles || config.memory || {};
  const files = [
    briefFile(root, mf.context, "Stable project purpose, architecture, environment, and core workflows."),
    briefFile(root, mf.state, "Current status, known issues, next steps, and latest AI-assisted change."),
    briefFile(root, mf.decisions, "Architecture, workflow, security, compatibility, dependency, and review decisions."),
    briefFile(root, mf.changelog, "Recent implementation history, verification notes, regressions, and risks."),
    briefFile(root, mf.handover, "Onboarding, handover, release preparation, and first-day guidance."),
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
  const filePath = file ? path.join(root, file) : "";
  const text = filePath ? readMaybe(filePath) : "";
  return { file: file || "(not configured)", reason, exists: Boolean(text), tokens: estimateTokens(text) };
}

function briefFileRelevant(file, question) {
  if (!question) return false;
  const text = question.toLowerCase();
  if (/DECISIONS/i.test(file)) return /decisions|decision|architecture|dependency|security|compatibility|workflow|review|token|budget|cost|mcp|ci|auth|payment|data model/.test(text);
  if (/AI_CHANGELOG/i.test(file)) return /history|recent|change|changed|changelog|bug|regression|error|why|risk/.test(text);
  if (/HANDOVER/i.test(file)) return /handover|onboard|onboarding|release|start|first day/.test(text);
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
    `- guardian query ${queryText} --limit ${briefData.limit}`,
    `- guardian brief ${queryText} --mode deep --limit ${briefData.limit}`,
    `- guardian brief ${queryText} --mode full --limit ${briefData.limit}`,
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

function shellQuoteText(text) {
  const cleaned = String(text).replace(/'/g, "'\\''");
  return `'${cleaned}'`;
}

module.exports = {
  buildBrief,
  formatBrief,
  briefFile,
  briefFileRelevant,
  recommendedBriefFiles,
  uniqueBriefFiles,
  shellQuoteText,
};
