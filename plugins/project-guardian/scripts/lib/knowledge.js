"use strict";

const fs = require("fs");
const path = require("path");
const { readMaybe, estimateTokens } = require("./shared");
const { buildBrief, formatBrief, shellQuoteText } = require("./brief");

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
  return selectDiverseResults(
    scored.filter((item) => includeQueryResult(item, query, bestKnowledgeScore)),
    limit
  );
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
      const location = doc.line && doc.line > 1 ? `${doc.file}:${doc.line}` : doc.file;
      return [`\n[${index + 1}] Source: ${location} (score ${resultScore})${matched}`, "```text", preview, "```"].join("\n");
    })
    .join("\n");
}

function chunks(file, text, size, overlap, kind = "source") {
  const safeSize = Math.max(1, size || 800);
  const safeOverlap = Math.min(Math.max(0, overlap || 0), safeSize - 1);
  const clean = text.replace(/\0/g, "");
  const result = [];
  for (let rawStart = 0; rawStart < clean.length; rawStart += safeSize - safeOverlap) {
    const start = alignedChunkStart(clean, rawStart);
    const end = alignedChunkEnd(clean, start, safeSize);
    const line = 1 + (clean.slice(0, start).match(/\n/g) || []).length;
    result.push({ file, kind, line, text: clean.slice(start, end) });
    if (result.length > 20) break;
  }
  return result;
}

function alignedChunkStart(text, start) {
  if (start === 0 || text[start - 1] === "\n") return start;
  const newline = text.indexOf("\n", start);
  return newline !== -1 && newline - start <= 120 ? newline + 1 : start;
}

function alignedChunkEnd(text, start, size) {
  const target = Math.min(text.length, start + size);
  if (target === text.length || text[target] === "\n") return target;
  const newline = text.lastIndexOf("\n", target);
  return newline > start + Math.floor(size * 0.6) ? newline : target;
}

function selectDiverseResults(results, limit) {
  const selected = [];
  const deferred = [];
  const perFile = new Map();
  const seenText = new Set();
  for (const item of results) {
    const signature = normalizeForSimilarity(item.doc.text).slice(0, 120);
    if (signature && seenText.has(signature)) continue;
    const count = perFile.get(item.doc.file) || 0;
    if (count >= 2) {
      deferred.push(item);
      continue;
    }
    selected.push(item);
    perFile.set(item.doc.file, count + 1);
    if (signature) seenText.add(signature);
    if (selected.length >= limit) return selected;
  }
  for (const item of deferred) {
    selected.push(item);
    if (selected.length >= limit) break;
  }
  return selected;
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  buildBrief,
  alignedChunkEnd,
  alignedChunkStart,
  chunks,
  estimateTokens,
  formatBrief,
  formatResults,
  searchIndex,
  selectDiverseResults,
  tokenize,
};
