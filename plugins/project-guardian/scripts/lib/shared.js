"use strict";

const fs = require("fs");
const path = require("path");

const CORE_MEMORY_KEYS = ["context", "state", "decisions", "changelog", "handover"];

function readMaybe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") process.stderr.write(`Warning: could not read ${file}: ${error.message}\n`);
    return "";
  }
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
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

function parseFlags(args) {
  const result = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") {
      result._.push(...args.slice(index + 1));
      break;
    }
    if (!arg.startsWith("--")) {
      result._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (!key) {
      result._.push(arg);
      continue;
    }
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

function lines(value) {
  return String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter((v) => typeof v === "string" && v).map((value) => value.replace(/\\/g, "/")))];
}

function relative(root, file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function normalizeForHook(file) {
  return file.replace(/\\/g, "/");
}

function getCoreMemoryFiles(config) {
  const memoryFiles = (config && (config.memoryFiles || config.memory)) || {};
  return [
    memoryFiles.context || memoryFiles.projectContext,
    memoryFiles.state,
    memoryFiles.decisions,
    memoryFiles.changelog,
    memoryFiles.handover,
  ].filter(Boolean);
}

function ensureInitialized(root, config) {
  const missing = getCoreMemoryFiles(config).filter((file) => !fs.existsSync(path.join(root, file)));
  if (missing.length > 0) {
    fail(`Project Guardian memory is missing: ${missing.join(", ")}\nRun: guardian init`);
  }
}

// Unified secret detection patterns — superset of all previous implementations.
const SECRET_KEYWORD_RE =
  /\b(password|passwd|pwd|secret|token|api[_-]?key|private[_\s-]?key|access[_-]?key|authorization|bearer)\b\s*[:=]\s*["']?[^"'\s]{4,}/gi;
const SECRET_KEYWORD_CN_RE =
  /(密码|密钥|令牌|私钥)\s*[:=：]\s*\S+/g;
const PEM_KEY_RE = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const HIGH_ENTROPY_RE = /[A-Za-z0-9+/=_-]{40,}/g;

function looksHighEntropy(token) {
  if (token.length < 40) return false;
  const chars = new Set(token);
  const hasUpper = /[A-Z]/.test(token);
  const hasLower = /[a-z]/.test(token);
  const hasDigit = /\d/.test(token);
  const hasSpecial = /[+/_=-]/.test(token);
  return chars.size >= 18 && hasUpper && hasLower && hasDigit && hasSpecial;
}

function containsLikelySecret(text) {
  if (SECRET_KEYWORD_RE.test(text)) return true;
  SECRET_KEYWORD_RE.lastIndex = 0;
  if (SECRET_KEYWORD_CN_RE.test(text)) return true;
  SECRET_KEYWORD_CN_RE.lastIndex = 0;
  if (PEM_KEY_RE.test(text)) return true;
  const matches = text.match(HIGH_ENTROPY_RE);
  if (matches) {
    for (const token of matches.slice(0, 20)) {
      if (looksHighEntropy(token)) return true;
    }
  }
  return false;
}

function redactLikelySecret(text) {
  let redacted = text.replace(SECRET_KEYWORD_RE, "$1=[redacted]");
  SECRET_KEYWORD_RE.lastIndex = 0;
  redacted = redacted.replace(SECRET_KEYWORD_CN_RE, "$1=[redacted]");
  SECRET_KEYWORD_CN_RE.lastIndex = 0;
  redacted = redacted.replace(HIGH_ENTROPY_RE, (match) =>
    looksHighEntropy(match) ? "[redacted-token]" : match
  );
  return redacted;
}

module.exports = {
  CORE_MEMORY_KEYS,
  containsLikelySecret,
  ensureInitialized,
  fail,
  getCoreMemoryFiles,
  looksHighEntropy,
  lines,
  normalizeForHook,
  parseFlags,
  readMaybe,
  redactLikelySecret,
  relative,
  timestamp,
  unique,
  writeFile,
};
