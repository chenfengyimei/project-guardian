"use strict";

const fs = require("fs");
const path = require("path");
const { DEFAULT_ADAPTERS } = require("./adapters");
const { validateAdapters, validateMcpConfig } = require("./validators");

const CONFIG_FILE = "project-guardian.config.json";
const SUPPORTED_LANGUAGES = ["zh-CN", "en"];

const DEFAULT_CONFIG = {
  memoryFiles: {
    context: "memory/PROJECT_CONTEXT.md",
    state: "memory/STATE.md",
    decisions: "memory/DECISIONS.md",
    changelog: "memory/AI_CHANGELOG.md",
    handover: "memory/HANDOVER.md",
    decisionsDirectory: "memory/decisions",
  },
  quality: {
    requireChangedLines: false,
    taskIdPattern: null,
  },
  hooks: {
    runValidateDocs: true,
  },
  ci: {
    defaultBranch: "master",
    nodeVersion: "18",
  },
  security: {
    scanSecrets: true,
  },
  mcp: {
    readOnly: false,
    allowedTools: [],
  },
  language: "zh-CN",
  adapters: DEFAULT_ADAPTERS,
  ignore: [],
};

function loadConfig(root) {
  const configPath = path.join(root, CONFIG_FILE);
  if (!fs.existsSync(configPath)) return clone(DEFAULT_CONFIG);
  try {
    return mergeConfig(clone(DEFAULT_CONFIG), JSON.parse(fs.readFileSync(configPath, "utf8")));
  } catch (error) {
    const fallback = clone(DEFAULT_CONFIG);
    fallback.__configError = error.message;
    return fallback;
  }
}

function validateConfig(config) {
  const issues = [];
  if (config.__configError) issues.push(`invalid ${CONFIG_FILE}: ${config.__configError}`);
  if (!SUPPORTED_LANGUAGES.includes(config.language)) issues.push(`language must be one of: ${SUPPORTED_LANGUAGES.join(", ")}`);
  for (const [name, value] of Object.entries(config.memoryFiles || {})) {
    if (typeof value !== "string" || value.trim() === "") {
      issues.push(`memoryFiles.${name} must be a non-empty string`);
    } else if (isUnsafePath(value)) {
      issues.push(`memoryFiles.${name} must not contain ".." or be an absolute path: ${value}`);
    }
  }
  if (config.quality.taskIdPattern) {
    try {
      new RegExp(config.quality.taskIdPattern);
    } catch (error) {
      issues.push(`quality.taskIdPattern is not a valid regex: ${error.message}`);
    }
  }
  issues.push(...validateMcpConfig(config.mcp));
  issues.push(...validateAdapters(config.adapters));
  return issues;
}

function isUnsafePath(value) {
  const normalized = path.normalize(value).replace(/\\/g, "/");
  if (path.isAbsolute(value)) return true;
  return normalized.split("/").includes("..");
}

function mergeConfig(base, override) {
  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object") {
      base[key] = mergeConfig(base[key], value);
    } else {
      base[key] = value;
    }
  }
  return base;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyInitFlags(config, flags) {
  const language = flags.language || flags.lang;
  if (!language) return config;
  return mergeConfig(clone(config), { language });
}

function isChinese(config = DEFAULT_CONFIG) {
  return config.language === "zh-CN";
}

module.exports = {
  CONFIG_FILE,
  DEFAULT_CONFIG,
  SUPPORTED_LANGUAGES,
  applyInitFlags,
  clone,
  isChinese,
  loadConfig,
  mergeConfig,
  validateConfig,
};
