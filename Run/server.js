#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { URL } = require("node:url");

const RUN_ROOT = __dirname;
const PUBLIC_ROOT = path.join(RUN_ROOT, "public");
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4357;
const CONFIG_FILE = "project-guardian.config.json";
const API_VERSION = 2;
const COMMAND_TIMEOUT_MS = 90_000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_OUTPUT_BYTES = 512 * 1024;
const MAX_MEMORY_FILE_BYTES = 256 * 1024;
const MAX_MANUAL_MEMORY_BYTES = 16 * 1024;
const BRIEF_MODES = new Set(["auto", "quick", "deep", "full"]);
const INIT_LANGUAGES = new Set(["zh-CN", "en"]);
const INIT_ADAPTERS = new Set(["default", "all"]);
const SENSITIVE_TEXT_PATTERN = /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(authorization|bearer)\b|\b(password|passwd|secret|token|api[_-]?key|private\s+key)\b\s*[:=：]|(密码|密钥|令牌|私钥)\s*[:=：]/i;

const READ_ONLY_ACTIONS = new Map([
  ["doctor", ["doctor"]],
  ["verify", ["verify"]],
  ["validate-docs", ["validate-docs"]],
  ["reviews", ["reviews"]],
  ["reviews-due", ["reviews", "due"]],
  ["scan-secrets", ["scan-secrets"]],
  ["adapters-doctor", ["adapters", "doctor"]],
]);

const MEMORY_FILE_CONFIG = [
  ["PROJECT_CONTEXT", "context", "memory/PROJECT_CONTEXT.md"],
  ["STATE", "state", "memory/STATE.md"],
  ["DECISIONS", "decisions", "memory/DECISIONS.md"],
  ["AI_CHANGELOG", "changelog", "memory/AI_CHANGELOG.md"],
  ["HANDOVER", "handover", "memory/HANDOVER.md"],
];
const MEMORY_FILES = MEMORY_FILE_CONFIG.map(([name, , relativePath]) => [name, relativePath]);

const WRITE_CONFIRMATIONS = {
  init: "RUN_INIT",
  appendMemory: "APPEND_MEMORY",
};

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
};

function parseServerArgs(argv) {
  const options = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    projectRoot: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--host") {
      options.host = readArgValue(argv, index, arg);
      index += 1;
    } else if (arg === "--port") {
      const rawPort = readArgValue(argv, index, arg);
      const port = Number(rawPort);
      if (!Number.isInteger(port) || port < 0 || port > 65535) fail(`Invalid --port value: ${rawPort}`);
      options.port = port;
      index += 1;
    } else if (arg === "--cwd") {
      options.projectRoot = path.resolve(readArgValue(argv, index, arg));
      index += 1;
    } else {
      fail(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function readArgValue(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${name} requires a value`);
  return value;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function badRequest(message) {
  return new HttpError(400, message);
}

function printHelp() {
  console.log(`Project Guardian Run UI

Usage:
  node Run/server.js [--host 127.0.0.1] [--port 4357] [--cwd path]

Options:
  --host   Bind address. Defaults to 127.0.0.1.
  --port   HTTP port. Use 0 to let the OS choose a free port.
  --cwd    Target project root. Defaults to the current working directory.

The web UI runs allowlisted Project Guardian commands. Write-capable UI actions require explicit confirmation.`);
}

function resolveProjectRoot(projectRoot) {
  if (projectRoot) return path.resolve(projectRoot);
  const cwd = process.cwd();
  if (path.basename(cwd).toLowerCase() === "run" && fs.existsSync(path.join(cwd, "server.js"))) {
    return path.dirname(cwd);
  }
  return cwd;
}

function findGuardianScript(projectRoot) {
  const targetProjectScript = path.join(projectRoot, "plugins", "project-guardian", "scripts", "guardian.js");
  const packagedScript = path.resolve(RUN_ROOT, "..", "plugins", "project-guardian", "scripts", "guardian.js");
  if (fs.existsSync(targetProjectScript)) return targetProjectScript;
  if (fs.existsSync(packagedScript)) return packagedScript;
  return null;
}

function createServer(inputOptions = {}) {
  const projectRoot = resolveProjectRoot(inputOptions.projectRoot);
  const guardianScript = inputOptions.guardianScript || findGuardianScript(projectRoot);

  return http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      if (requestUrl.pathname.startsWith("/api/")) {
        await handleApi(req, res, requestUrl, { projectRoot, guardianScript });
        return;
      }
      serveStatic(requestUrl.pathname, res);
    } catch (error) {
      sendJson(res, error.statusCode || 500, { ok: false, error: error.message || String(error) });
    }
  });
}

async function handleApi(req, res, requestUrl, context) {
  if (req.method === "GET" && requestUrl.pathname === "/api/status") {
    sendJson(res, 200, statusPayload(context));
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/memory") {
    sendJson(res, 200, readMemoryPayload(context, requestUrl.searchParams.get("name")));
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);

  if (requestUrl.pathname === "/api/command") {
    const action = String(body.action || "").trim();
    if (!READ_ONLY_ACTIONS.has(action)) {
      sendJson(res, 400, { ok: false, error: `Unsupported or write-capable action: ${action}` });
      return;
    }
    await sendCommandResult(res, context, READ_ONLY_ACTIONS.get(action), action);
    return;
  }

  if (requestUrl.pathname === "/api/brief") {
    const question = validateQuestion(body.question);
    const limit = validateLimit(body.limit, 3);
    const mode = validateMode(body.mode || "auto");
    await sendCommandResult(res, context, ["brief", question, "--mode", mode, "--limit", String(limit)], "brief");
    return;
  }

  if (requestUrl.pathname === "/api/query") {
    const question = validateQuestion(body.question);
    const limit = validateLimit(body.limit, 3);
    await sendCommandResult(res, context, ["query", question, "--limit", String(limit)], "query");
    return;
  }

  if (requestUrl.pathname === "/api/init") {
    validateConfirmation(body.confirm, WRITE_CONFIRMATIONS.init);
    const language = validateInitLanguage(body.language);
    const adapter = validateInitAdapter(body.adapter);
    const args = ["init", "--language", language];
    if (adapter === "all") args.push("--adapter", "all");
    await sendCommandResult(res, context, args, "init");
    return;
  }

  if (requestUrl.pathname === "/api/memory/append") {
    validateConfirmation(body.confirm, WRITE_CONFIRMATIONS.appendMemory);
    const result = appendManualMemory(context, body.name, body.content);
    sendJson(res, 200, result);
    return;
  }

  sendJson(res, 404, { ok: false, error: "API route not found" });
}

function statusPayload(context) {
  return {
    ok: true,
    projectRoot: context.projectRoot,
    guardianScript: context.guardianScript,
    guardianAvailable: Boolean(context.guardianScript),
    nodeVersion: process.version,
    apiVersion: API_VERSION,
    features: {
      memoryRead: true,
      initProject: true,
      appendMemory: true,
      configuredMemoryPaths: true,
    },
    readOnly: false,
    commandApiReadOnly: true,
    writeRequiresConfirmation: true,
    confirmations: WRITE_CONFIRMATIONS,
    actions: Array.from(READ_ONLY_ACTIONS.keys()),
    memoryFiles: memoryFilesForProject(context.projectRoot).map(([name, relativePath]) => {
      const absolutePath = path.join(context.projectRoot, relativePath);
      return {
        name,
        path: relativePath,
        exists: fs.existsSync(absolutePath),
      };
    }),
  };
}

function readMemoryPayload(context, name) {
  const target = resolveMemoryTarget(context.projectRoot, name);
  const exists = fs.existsSync(target.absolutePath);
  const payload = {
    ok: true,
    name: target.name,
    path: target.relativePath,
    exists,
    size: 0,
    tooLarge: false,
    content: "",
  };
  if (!exists) return payload;

  const stat = fs.statSync(target.absolutePath);
  payload.size = stat.size;
  if (stat.size > MAX_MEMORY_FILE_BYTES) {
    payload.tooLarge = true;
    return payload;
  }
  payload.content = fs.readFileSync(target.absolutePath, "utf8");
  return payload;
}

function appendManualMemory(context, name, content) {
  const target = resolveMemoryTarget(context.projectRoot, name);
  if (!fs.existsSync(target.absolutePath)) {
    throw badRequest(`Memory file does not exist yet: ${target.relativePath}. Run init first.`);
  }

  const cleanedContent = validateManualMemoryContent(content);
  fs.appendFileSync(target.absolutePath, buildManualMemoryEntry(target.name, cleanedContent), "utf8");
  return readMemoryPayload(context, target.name);
}

function resolveMemoryTarget(projectRoot, name) {
  const normalized = String(name || "").trim().toUpperCase();
  const entry = memoryFilesForProject(projectRoot).find(([memoryName]) => memoryName === normalized);
  if (!entry) throw badRequest("Unknown memory file. Use one of the core Project Guardian memory names.");
  return {
    name: entry[0],
    relativePath: entry[1],
    absolutePath: path.join(projectRoot, entry[1]),
  };
}

function memoryFilesForProject(projectRoot) {
  const configuredMemoryFiles = loadProjectMemoryConfig(projectRoot);
  return MEMORY_FILE_CONFIG.map(([name, configKey, fallbackPath]) => [
    name,
    sanitizeMemoryPath(configuredMemoryFiles[configKey], fallbackPath),
  ]);
}

function loadProjectMemoryConfig(projectRoot) {
  const configPath = path.join(projectRoot, CONFIG_FILE);
  if (!fs.existsSync(configPath)) return {};
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return config && typeof config.memoryFiles === "object" && config.memoryFiles ? config.memoryFiles : {};
  } catch {
    return {};
  }
}

function sanitizeMemoryPath(value, fallbackPath) {
  const rawPath = typeof value === "string" && value.trim() ? value.trim() : fallbackPath;
  const normalized = rawPath.replace(/\\/g, "/");
  if (path.isAbsolute(normalized) || normalized.split("/").includes("..")) return fallbackPath;
  return normalized;
}

function validateQuestion(value) {
  const question = String(value || "").trim();
  if (!question) throw badRequest("Question is required.");
  if (question.length > 500) throw badRequest("Question must be 500 characters or fewer.");
  return question;
}

function validateLimit(value, fallback) {
  const limit = value === undefined || value === null || value === "" ? fallback : Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw badRequest("Limit must be an integer from 1 to 10.");
  return limit;
}

function validateMode(value) {
  const mode = String(value || "auto").trim().toLowerCase();
  if (!BRIEF_MODES.has(mode)) throw badRequest("Mode must be one of: auto, quick, deep, full.");
  return mode;
}

function validateInitLanguage(value) {
  const language = String(value || "zh-CN").trim();
  if (!INIT_LANGUAGES.has(language)) throw badRequest("Language must be zh-CN or en.");
  return language;
}

function validateInitAdapter(value) {
  const adapter = String(value || "default").trim().toLowerCase();
  if (!INIT_ADAPTERS.has(adapter)) throw badRequest("Adapter must be default or all.");
  return adapter;
}

function validateConfirmation(value, expected) {
  if (String(value || "").trim() !== expected) throw badRequest(`Type ${expected} to confirm this write operation.`);
}

function validateManualMemoryContent(value) {
  const content = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!content) throw badRequest("Memory content is required.");
  if (Buffer.byteLength(content, "utf8") > MAX_MANUAL_MEMORY_BYTES) {
    throw badRequest(`Memory content must be ${MAX_MANUAL_MEMORY_BYTES} bytes or fewer.`);
  }
  if (SENSITIVE_TEXT_PATTERN.test(content)) {
    throw badRequest("Memory content looks like it may contain a password, token, API key, or other secret.");
  }
  return content;
}

function buildManualMemoryEntry(name, content) {
  const title = `Run 手动记录 - ${localTimestamp()}`;
  if (name === "AI_CHANGELOG") {
    const indented = content
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n");
    return [
      "",
      "",
      `### ${title}`,
      "",
      "- 用户记录：",
      indented,
      "- 来源：Run 可视化控制台手动追加。",
      "- Sensitive data checked: Run 基础敏感词拦截已通过。",
      "",
    ].join("\n");
  }

  return [
    "",
    "",
    `## ${title}`,
    "",
    "来源：Run 可视化控制台手动追加。",
    "",
    content,
    "",
  ].join("\n");
}

function localTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function sendCommandResult(res, context, args, action) {
  const result = await runGuardian(context, args);
  sendJson(res, 200, {
    ok: result.status === 0,
    action,
    args,
    status: result.status,
    timedOut: result.timedOut,
    stdout: result.stdout,
    stderr: result.stderr,
  });
}

function runGuardian(context, args) {
  return new Promise((resolve) => {
    if (!context.guardianScript) {
      resolve({
        status: 1,
        stdout: "",
        stderr: "Project Guardian CLI script was not found.",
        timedOut: false,
      });
      return;
    }

    const child = spawn(process.execPath, [context.guardianScript, ...args], {
      cwd: context.projectRoot,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, COMMAND_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout = appendLimited(stdout, chunk.toString());
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendLimited(stderr, chunk.toString());
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ status: 1, stdout, stderr: `${stderr}${error.message}`, timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ status: code === null ? 1 : code, stdout, stderr, timedOut });
    });
  });
}

function appendLimited(current, addition) {
  if (Buffer.byteLength(current, "utf8") >= MAX_OUTPUT_BYTES) return current;
  const next = current + addition;
  if (Buffer.byteLength(next, "utf8") <= MAX_OUTPUT_BYTES) return next;
  return `${next.slice(0, MAX_OUTPUT_BYTES)}\n[output truncated]`;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
        reject(badRequest("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(badRequest("Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(urlPath, res) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const targetPath = path.normalize(path.join(PUBLIC_ROOT, relativePath));
  const relativeToPublic = path.relative(PUBLIC_ROOT, targetPath);

  if (relativeToPublic.startsWith("..") || path.isAbsolute(relativeToPublic)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
    sendText(res, 404, "Not found");
    return;
  }

  const contentType = CONTENT_TYPES[path.extname(targetPath).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  fs.createReadStream(targetPath).pipe(res);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(text);
}

function main() {
  const options = parseServerArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const projectRoot = resolveProjectRoot(options.projectRoot);
  const guardianScript = findGuardianScript(projectRoot);
  const server = createServer({ projectRoot, guardianScript });

  server.listen(options.port, options.host, () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : options.port;
    const url = `http://${options.host}:${port}`;
    console.log(`Project Guardian Run UI: ${url}`);
    console.log(`Project root: ${projectRoot}`);
    if (!guardianScript) console.log("Warning: Project Guardian CLI script was not found.");
    if (options.host !== DEFAULT_HOST) console.log("Warning: non-localhost binding has no built-in authentication.");
  });
}

module.exports = {
  createServer,
  findGuardianScript,
  parseServerArgs,
  resolveProjectRoot,
  READ_ONLY_ACTIONS,
  MEMORY_FILES,
  WRITE_CONFIRMATIONS,
  API_VERSION,
};

if (require.main === module) main();
