"use strict";

const fs = require("fs");
const path = require("path");

const STOP_TERMS = new Set([
  "the", "and", "for", "with", "this", "that", "what", "where", "when", "how", "why",
  "a", "an", "to", "of", "in", "on", "is", "are", "was", "were",
  "这个", "那个", "什么", "哪里", "怎么", "为什么", "如何",
]);

const SYNONYM_GROUPS = [
  ["memory", "context", "knowledge", "state", "project memory", "记忆", "上下文", "知识", "状态"],
  ["handover", "handoff", "onboarding", "takeover", "first day", "交接", "接手", "新人", "入门"],
  ["decision", "architecture", "tradeoff", "rationale", "adr", "决策", "架构", "取舍", "原因"],
  ["risk", "security", "secret", "permission", "audit", "safe", "风险", "安全", "密钥", "权限", "审计"],
  ["verify", "validation", "test", "lint", "check", "quality", "验证", "校验", "测试", "检查", "质量"],
  ["ci", "pipeline", "gitee", "github actions", "hook", "pre-commit", "流水线", "持续集成", "提交钩子"],
  ["mcp", "tool", "agent", "ai ide", "cursor", "copilot", "codex", "cline", "continue", "claude", "gemini"],
  ["query", "search", "retrieve", "retrieval", "semantic", "vector", "rank", "查询", "检索", "搜索", "语义", "向量", "排序"],
  ["token", "budget", "cost", "context window", "成本", "预算", "消耗", "上下文窗口"],
  ["login", "auth", "authentication", "captcha", "verification code", "登录", "认证", "验证码"],
];

function searchIndex(index, question, limit) {
  const query = buildQueryProfile(question);
  const scored = index
    .map((doc) => ({ doc, ...score(doc, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const bestKnowledgeScore = Math.max(0, ...scored.filter((item) => item.doc.kind === "knowledge").map((item) => item.score));
  return scored
    .filter((item) => includeQueryResult(item, query, bestKnowledgeScore))
    .slice(0, limit);
}

function score(doc, query) {
  const haystack = `${doc.file}\n${doc.text}`.toLowerCase();
  const normalizedHaystack = normalizeForSimilarity(haystack);
  let total = 0;
  const matches = new Set();

  total += termScore(haystack, query.terms, 1, matches);
  total += termScore(haystack, query.expandedTerms, 0.35, matches);

  if (query.phrase && query.phrase.length >= 6 && normalizedHaystack.includes(query.phrase)) {
    total += 20;
    matches.add("phrase");
  }

  const fileMatched = pathMatchesTerms(doc.file, query.allTerms);
  if (fileMatched) total += 12;

  const semantic = semanticScore(doc, query);
  const directEvidence = total;
  if (semantic >= 8) total += semantic;
  if (directEvidence === 0 && semantic < 8) return { score: 0, matches: [] };

  if (doc.kind === "knowledge") total += 3;
  if (doc.kind === "history") total *= 0.9;
  return { score: Math.round(total), matches: Array.from(matches).slice(0, 8) };
}

function termScore(haystack, terms, weight, matchesOut) {
  let total = 0;
  for (const term of terms) {
    const normalized = term.toLowerCase();
    const matches = haystack.match(new RegExp(escapeRegExp(normalized), "g"));
    if (matches) {
      total += matches.length * Math.min(normalized.length, 10) * weight;
      if (matchesOut) matchesOut.add(term);
    }
  }
  return total;
}

function includeQueryResult(item, query, bestKnowledgeScore) {
  if (item.doc.kind === "knowledge") return true;
  if (bestKnowledgeScore === 0) return true;
  if (pathMatchesTerms(item.doc.file, query.allTerms)) return true;
  return item.score >= Math.max(36, bestKnowledgeScore * 2.5);
}

function pathMatchesTerms(file, terms) {
  const normalized = file.toLowerCase().replace(/\\/g, "/");
  return terms.some((term) => term.length >= 3 && normalized.includes(term.toLowerCase()));
}

function formatResults(results) {
  if (results.length === 0) return "No strong local match. Try a module name, file name, error message, or business keyword.";
  return results
    .map(({ doc, score: resultScore, matches }, index) => {
      const preview = doc.text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8)
        .join("\n");
      const matched = matches && matches.length ? `\nMatched: ${matches.join(", ")}` : "";
      return [`\n[${index + 1}] Source: ${doc.file} (score ${resultScore})${matched}`, "```text", preview, "```"].join("\n");
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
  return [...new Set([...ascii, ...cjk, ...cjkPairs])]
    .filter((term) => !STOP_TERMS.has(term));
}

function buildQueryProfile(question) {
  const terms = tokenize(question);
  const expandedTerms = expandTerms(terms, question).filter((term) => !terms.includes(term));
  const allTerms = [...new Set([...terms, ...expandedTerms])];
  return {
    question,
    terms,
    expandedTerms,
    allTerms,
    phrase: normalizeForSimilarity(question),
    grams: semanticGrams(question),
  };
}

function expandTerms(terms, question) {
  const lowerQuestion = String(question || "").toLowerCase();
  const expanded = new Set();
  for (const group of SYNONYM_GROUPS) {
    const hasMatch = group.some((item) => terms.includes(item) || lowerQuestion.includes(item));
    if (hasMatch) group.forEach((item) => expanded.add(item));
  }
  for (const term of terms) {
    for (const variant of termVariants(term)) expanded.add(variant);
  }
  return [...expanded].filter((term) => term && !STOP_TERMS.has(term));
}

function termVariants(term) {
  const variants = [];
  if (!/^[a-z0-9_-]+$/.test(term) || term.length < 5) return variants;
  variants.push(term.replace(/ing$/, ""));
  variants.push(term.replace(/ed$/, ""));
  variants.push(term.replace(/tion$/, "t"));
  variants.push(term.replace(/s$/, ""));
  return variants.filter((variant) => variant.length >= 3 && variant !== term);
}

function semanticScore(doc, query) {
  if (!query.grams.size) return 0;
  const docGrams = doc._semanticGrams || (doc._semanticGrams = semanticGrams(`${doc.file}\n${doc.text}`));
  if (!docGrams.size) return 0;
  let hits = 0;
  for (const gram of query.grams) {
    if (docGrams.has(gram)) hits += 1;
  }
  if (hits === 0) return 0;
  const coverage = hits / query.grams.size;
  const cosine = hits / Math.sqrt(query.grams.size * docGrams.size);
  return coverage * 24 + cosine * 16;
}

function semanticGrams(input) {
  const result = new Set();
  const words = String(input || "")
    .toLowerCase()
    .match(/[a-z0-9]{3,}|[\u4e00-\u9fff]{2,}/g) || [];
  for (const word of words.slice(0, 260)) {
    const hasCjk = /[\u4e00-\u9fff]/.test(word);
    const size = hasCjk ? 2 : 3;
    if (word.length <= 24) result.add(word);
    for (let index = 0; index <= word.length - size; index += 1) {
      result.add(word.slice(index, index + size));
      if (result.size >= 900) return result;
    }
  }
  return result;
}

function normalizeForSimilarity(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "")
    .slice(0, 160);
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
