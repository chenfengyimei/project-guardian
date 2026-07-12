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

module.exports = {
  CORE_MEMORY_KEYS,
  ensureInitialized,
  fail,
  getCoreMemoryFiles,
  lines,
  normalizeForHook,
  parseFlags,
  readMaybe,
  relative,
  timestamp,
  unique,
  writeFile,
};
