"use strict";

const fs = require("fs");
const path = require("path");
const { CONFIG_FILE } = require("./config");
const { isIgnored, loadIgnorePatterns, unique } = require("./git-utils");

const AGENT_RULE_FILES = ["AGENTS.md", ".cursorrules"];

function runSecretScan(root, config, files) {
  const patterns = loadIgnorePatterns(root, config);
  const targets = unique(files || defaultSecretFiles(root, config));
  const findings = [];

  for (const file of targets) {
    if (isIgnored(file, patterns)) continue;
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) continue;
    const content = fs.readFileSync(absolute, "utf8");
    content.split(/\r?\n/).forEach((line, index) => {
      for (const finding of scanSecretLine(line)) {
        findings.push({ file, line: index + 1, ...finding });
      }
    });
  }

  return { ok: findings.length === 0, findings };
}

function scanSecretLine(line) {
  const findings = [];
  const keyword = line.match(/\b(password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|access[_-]?key)\b\s*[:=]\s*["']?([^"'\s]{8,})/i);
  if (keyword) findings.push({ type: "keyword-secret", preview: redact(keyword[2]) });
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line)) findings.push({ type: "private-key", preview: "[redacted private key]" });
  const matches = line.match(/[A-Za-z0-9+/=_-]{40,}/g) || [];
  for (const value of matches) {
    if (looksHighEntropy(value)) findings.push({ type: "high-entropy", preview: redact(value) });
  }
  return findings;
}

function looksHighEntropy(value) {
  return new Set(value).size >= 18 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[+/_=-]/.test(value);
}

function redact(value) {
  const clean = value.replace(/^["']|["']$/g, "");
  if (clean.length <= 8) return "[redacted]";
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

function defaultSecretFiles(root, config) {
  return [
    ...getKnowledgeFiles(config),
    ...getDecisionFiles(root, config),
    CONFIG_FILE,
  ];
}

function getKnowledgeFiles(config) {
  return [...getCoreMemoryFiles(config), ...AGENT_RULE_FILES];
}

function getCoreMemoryFiles(config) {
  const memoryFiles = config.memoryFiles || config.memory || {};
  return [
    memoryFiles.context || memoryFiles.projectContext,
    memoryFiles.state,
    memoryFiles.decisions,
    memoryFiles.changelog,
    memoryFiles.handover,
  ];
}

function getDecisionFiles(root, config) {
  const memoryFiles = config.memoryFiles || config.memory || {};
  const decisionsDir = memoryFiles.decisionsDirectory || memoryFiles.decisionsDir;
  if (!decisionsDir) return [];
  const dir = path.join(root, decisionsDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => path.join(decisionsDir, name).replace(/\\/g, "/"));
}

module.exports = {
  looksHighEntropy,
  redact,
  runSecretScan,
  scanSecretLine,
};
