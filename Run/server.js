#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { URL } = require("node:url");
const {
  MEMORY_FILE_CONFIG,
  buildManualMemoryContent,
  buildManualMemoryEntry,
  memoryFilesForConfig,
  publicMemoryAppendTemplates,
  resolveMemoryTarget: resolveConfiguredMemoryTarget,
} = require("../plugins/project-guardian/scripts/lib/manual-memory");
const {
  COMMAND_CONFIRMATION,
  COMMAND_DEFINITIONS,
  COMMANDS,
  publicCommandDefinition,
} = require("./lib/commands");
const {
  appendAuditEvent,
  isAuthorizedApiRequest,
  isRunAuthRequired,
  readAuditLogPayload,
  summarizeAuditArgs,
} = require("./lib/audit");
const { loadConfig } = require("../plugins/project-guardian/scripts/lib/config");
const { executeMcpTool, publicMcpStatus, TaskQueue } = require("../plugins/project-guardian/scripts/lib/mcp");
const {
  getDecisionFiles,
  getReviewItems,
  reviewItem,
  runReviewValidation,
} = require("../plugins/project-guardian/scripts/lib/reviews");

const RUN_ROOT = __dirname;
const PUBLIC_ROOT = path.join(RUN_ROOT, "public");
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4357;
const CONFIG_FILE = "project-guardian.config.json";
const API_VERSION = 6;
const COMMAND_TIMEOUT_MS = 90_000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_OUTPUT_BYTES = 512 * 1024;
const MAX_DIFF_PREVIEW_BYTES = 96 * 1024;
const MAX_MEMORY_FILE_BYTES = 256 * 1024;
const BRIEF_MODES = new Set(["auto", "quick", "deep", "full"]);
const INIT_LANGUAGES = new Set(["zh-CN", "en"]);
const INIT_ADAPTERS = new Set(["default", "all"]);

const MEMORY_FILES = MEMORY_FILE_CONFIG.map((item) => [item.name, item.fallbackPath]);

const WRITE_CONFIRMATIONS = {
  init: "RUN_INIT",
  appendMemory: "APPEND_MEMORY",
  command: COMMAND_CONFIRMATION,
  mcpTool: "RUN_MCP",
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

Environment:
  GUARDIAN_RUN_TOKEN  Optional API token. When set, browser requests must send it with ?token=...,
                      X-Guardian-Run-Token, or Authorization: Bearer <token>.

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
  const mcpQueue = inputOptions.mcpQueue || new TaskQueue();

  return http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      if (requestUrl.pathname.startsWith("/api/")) {
        await handleApi(req, res, requestUrl, { projectRoot, guardianScript, mcpQueue });
        return;
      }
      serveStatic(requestUrl.pathname, res);
    } catch (error) {
      sendJson(res, error.statusCode || 500, { ok: false, error: error.message || String(error) });
    }
  });
}

async function handleApi(req, res, requestUrl, context) {
  if (!isAuthorizedApiRequest(req)) {
    appendAuditEvent(context, {
      action: "unauthorized",
      route: requestUrl.pathname,
      kind: "security",
      ok: false,
      status: 401,
      error: "Unauthorized API request.",
    });
    sendJson(res, 401, { ok: false, error: "Unauthorized. Provide GUARDIAN_RUN_TOKEN as X-Guardian-Run-Token or Bearer token." });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/status") {
    sendJson(res, 200, statusPayload(context));
    return;
  }


  if (req.method === "GET" && requestUrl.pathname === "/api/reviews") {
    sendJson(res, 200, readReviewsPayload(context));
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/review-file" && requestUrl.searchParams.get("file")) {
    sendJson(res, 200, readReviewFilePayload(context, requestUrl.searchParams.get("file")));
    return;
  }
  if (req.method === "GET" && requestUrl.pathname === "/api/diff-preview") {
    sendJson(res, 200, await diffPreviewPayload(context));
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/audit-log") {
    sendJson(res, 200, readAuditLogPayload(context, requestUrl.searchParams.get("limit")));
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
    const command = COMMANDS.get(action);
    if (!command) {
      sendJson(res, 400, { ok: false, error: `Unsupported action: ${action}` });
      return;
    }
    if (command.kind === "linked") {
      sendJson(res, 400, { ok: false, error: `${command.label} has a dedicated module. Open the ${command.view} view instead.` });
      return;
    }
    if (command.kind === "terminal") {
      sendJson(res, 400, { ok: false, error: `${command.label} must be started in a terminal: ${command.command}` });
      return;
    }
    if (command.kind === "write") validateConfirmation(body.confirm, COMMAND_CONFIRMATION);
    const args = command.kind === "write" ? command.buildArgs(body) : command.args;
    await sendCommandResult(res, context, args, action, { route: requestUrl.pathname, kind: command.kind });
    return;
  }

  if (requestUrl.pathname === "/api/mcp/call") {
    const name = validateMcpToolName(body.name);
    const args = validateMcpArguments(body.arguments);
    const config = loadConfig(context.projectRoot);
    const mcpStatus = mcpStatusForContext(context, config);
    const tool = mcpStatus.tools.find((item) => item.name === name);
    if (!mcpStatus.configValid) throw badRequest(`Invalid MCP configuration: ${mcpStatus.configIssues.join("; ")}`);
    if (!tool) throw badRequest(`Unsupported MCP tool: ${name}`);
    if (!tool.enabled) throw badRequest(`MCP tool is disabled by configuration: ${name}`);
    if (tool.write) validateConfirmation(body.confirm, WRITE_CONFIRMATIONS.mcpTool);
    await sendMcpToolResult(res, context, config.mcp, name, args, tool);
    return;
  }

  if (requestUrl.pathname === "/api/brief") {
    const question = validateQuestion(body.question);
    const limit = validateLimit(body.limit, 3);
    const mode = validateMode(body.mode || "auto");
    await sendCommandResult(res, context, ["brief", question, "--mode", mode, "--limit", String(limit)], "brief", {
      route: requestUrl.pathname,
      kind: "read",
      questionLength: question.length,
      limit,
      mode,
    });
    return;
  }

  if (requestUrl.pathname === "/api/query") {
    const question = validateQuestion(body.question);
    const limit = validateLimit(body.limit, 3);
    await sendCommandResult(res, context, ["query", question, "--limit", String(limit)], "query", {
      route: requestUrl.pathname,
      kind: "read",
      questionLength: question.length,
      limit,
    });
    return;
  }

  if (requestUrl.pathname === "/api/init") {
    validateConfirmation(body.confirm, WRITE_CONFIRMATIONS.init);
    const language = validateInitLanguage(body.language);
    const adapter = validateInitAdapter(body.adapter);
    const args = ["init", "--language", language];
    if (adapter === "all") args.push("--adapter", "all");
    await sendCommandResult(res, context, args, "init", { route: requestUrl.pathname, kind: "write", language, adapter });
    return;
  }

  if (requestUrl.pathname === "/api/memory/append") {
    validateConfirmation(body.confirm, WRITE_CONFIRMATIONS.appendMemory);
    const result = appendManualMemory(context, body.name, body);
    appendAuditEvent(context, {
      action: "append-memory",
      route: requestUrl.pathname,
      kind: "write",
      ok: true,
      status: 0,
      memoryName: result.name,
      memoryPath: result.path,
      templateId: String(body.templateId || ""),
      fieldNames: Object.keys(body.fields || {}).sort(),
    });
    sendJson(res, 200, result);
    return;
  }

  sendJson(res, 404, { ok: false, error: "API route not found" });
}

function statusPayload(context) {
  const config = loadConfig(context.projectRoot);
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
      templateMemoryAppend: true,
      commandSearch: true,
      diffPreview: true,
      operationLog: true,
      serverAuditLog: true,
      auditHashChain: true,
      authRequired: isRunAuthRequired(),
      mcpStatus: true,
      mcpToolCall: true,
    },
    mcp: mcpStatusForContext(context, config),
    readOnly: false,
    commandApiReadOnly: false,
    writeRequiresConfirmation: true,
    confirmations: WRITE_CONFIRMATIONS,
    actions: COMMAND_DEFINITIONS.map((command) => command.id),
    commands: COMMAND_DEFINITIONS.map(publicCommandDefinition),
    memoryAppendTemplates: publicMemoryAppendTemplates(),
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


function readReviewsPayload(context) {
  const config = loadConfig(context.projectRoot);
  const items = getReviewItems(context.projectRoot, config);
  const reviewFiles = getDecisionFiles(context.projectRoot, config);
  return {
    ok: true,
    items,
    reviewFiles,
  };
}

function readReviewFilePayload(context, relativePath) {
  const root = context.projectRoot;
  const config = loadConfig(root);
  const files = getDecisionFiles(root, config);
  const normalized = relativePath.replace(/\\\\/g, "/");
  const file = files.find((f) => f === normalized || f.endsWith("/" + normalized) || path.basename(f) === normalized);
  if (!file) return { ok: false, error: "Review file not found: " + relativePath };
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) return { ok: false, error: "Review file does not exist: " + file };
  const stat = fs.statSync(fullPath);
  const maxBytes = 256 * 1024;
  const tooLarge = stat.size > maxBytes;
  const content = tooLarge ? "" : fs.readFileSync(fullPath, "utf8");
  return {
    ok: true,
    name: path.basename(file),
    path: file,
    exists: true,
    size: stat.size,
    tooLarge,
    content,
  };
}

function mcpStatusForContext(context, config = loadConfig(context.projectRoot)) {
  return publicMcpStatus(config.mcp, {
    globalCommand: "guardian mcp",
    localCommand: guardianScriptCommand(context),
  });
}

function guardianScriptCommand(context) {
  if (!context.guardianScript) return "";
  const relativeScript = path.relative(context.projectRoot, context.guardianScript).replace(/\\/g, "/");
  const displayScript = relativeScript && !relativeScript.startsWith("..") && !path.isAbsolute(relativeScript)
    ? relativeScript
    : context.guardianScript;
  return `node ${quoteCliPath(displayScript)} mcp`;
}

function quoteCliPath(value) {
  return /\s/.test(value) ? `"${value}"` : value;
}

async function diffPreviewPayload(context) {
  const [status, unstaged, staged] = await Promise.all([
    runGit(context, ["status", "--short"]),
    runGit(context, ["diff", "--stat"]),
    runGit(context, ["diff", "--cached", "--stat"]),
  ]);
  const gitAvailable = [status, unstaged, staged].some((result) => result.status === 0);
  return {
    ok: true,
    gitAvailable,
    projectRoot: context.projectRoot,
    status: status.stdout.trim(),
    unstagedStat: unstaged.stdout.trim(),
    stagedStat: staged.stdout.trim(),
    stderr: uniqueLines([status.stderr, unstaged.stderr, staged.stderr].join("\n")),
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

  let cleanedContent;
  try {
    cleanedContent = buildManualMemoryContent(target.name, content.templateId, content.fields, content.content);
  } catch (error) {
    throw badRequest(error.message);
  }
  fs.appendFileSync(target.absolutePath, buildManualMemoryEntry(target.name, cleanedContent, {
    source: "Run 可视化控制台手动追加。",
    titlePrefix: "Run 手动记录",
  }), "utf8");
  return readMemoryPayload(context, target.name);
}

function resolveMemoryTarget(projectRoot, name) {
  try {
    return resolveConfiguredMemoryTarget(projectRoot, loadProjectMemoryConfig(projectRoot), name);
  } catch (error) {
    throw badRequest(error.message);
  }
}

function memoryFilesForProject(projectRoot) {
  return memoryFilesForConfig(loadProjectMemoryConfig(projectRoot));
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

function validateMcpToolName(value) {
  const name = String(value || "").trim();
  if (!name) throw badRequest("MCP tool name is required.");
  if (!/^[A-Za-z0-9_-]+$/.test(name)) throw badRequest("MCP tool name contains unsupported characters.");
  return name;
}

function validateMcpArguments(value) {
  if (value === undefined || value === null || value === "") return {};
  if (typeof value !== "object" || Array.isArray(value)) throw badRequest("MCP arguments must be an object.");
  return value;
}

async function sendCommandResult(res, context, args, action, auditMeta = {}) {
  const startedAt = Date.now();
  const result = await runGuardian(context, args);
  appendAuditEvent(context, {
    action,
    route: auditMeta.route || "/api/command",
    kind: auditMeta.kind || "command",
    ok: result.status === 0,
    status: result.status,
    timedOut: result.timedOut,
    durationMs: Date.now() - startedAt,
    args: summarizeAuditArgs(action, args),
    questionLength: auditMeta.questionLength,
    limit: auditMeta.limit,
    mode: auditMeta.mode,
    language: auditMeta.language,
    adapter: auditMeta.adapter,
    error: result.status === 0 ? "" : result.stderr || result.stdout,
  });
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

async function sendMcpToolResult(res, context, mcpConfig, name, args, tool) {
  const startedAt = Date.now();
  try {
    const result = await executeMcpTool({
      root: context.projectRoot,
      guardianScript: context.guardianScript,
      mcpConfig,
      queue: context.mcpQueue,
      name,
      arguments: args,
    });
    appendAuditEvent(context, {
      action: `mcp:${name}`,
      route: "/api/mcp/call",
      kind: tool.write ? "write" : "read",
      ok: result.ok,
      status: result.status,
      durationMs: Date.now() - startedAt,
      mcpTool: name,
      mcpArgumentNames: Object.keys(args).sort(),
      confirmationRequired: Boolean(tool.write),
      error: result.ok ? "" : result.text,
    });
    sendJson(res, 200, {
      ok: result.ok,
      action: "mcp",
      tool: name,
      write: tool.write,
      status: result.status,
      timedOut: false,
      stdout: result.text,
      stderr: "",
    });
  } catch (error) {
    appendAuditEvent(context, {
      action: `mcp:${name}`,
      route: "/api/mcp/call",
      kind: tool.write ? "write" : "read",
      ok: false,
      status: null,
      durationMs: Date.now() - startedAt,
      mcpTool: name,
      mcpArgumentNames: Object.keys(args).sort(),
      confirmationRequired: Boolean(tool.write),
      error: error.message,
    });
    sendJson(res, 400, { ok: false, error: error.message });
  }
}

function runGit(context, args) {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
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
    }, 10_000);

    child.stdout.on("data", (chunk) => {
      stdout = appendLimitedTo(stdout, chunk.toString(), MAX_DIFF_PREVIEW_BYTES);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendLimitedTo(stderr, chunk.toString(), MAX_DIFF_PREVIEW_BYTES);
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
  return appendLimitedTo(current, addition, MAX_OUTPUT_BYTES);
}

function appendLimitedTo(current, addition, byteLimit) {
  if (Buffer.byteLength(current, "utf8") >= byteLimit) return current;
  const next = current + addition;
  if (Buffer.byteLength(next, "utf8") <= byteLimit) return next;
  return `${next.slice(0, byteLimit)}\n[output truncated]`;
}

function uniqueLines(value) {
  return [...new Set(String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean))].join("\n");
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
    if (isRunAuthRequired()) console.log("Run API token protection is enabled with GUARDIAN_RUN_TOKEN.");
    if (options.host !== DEFAULT_HOST && !isRunAuthRequired()) console.log("Warning: non-localhost binding has no built-in authentication. Set GUARDIAN_RUN_TOKEN before sharing Run on a network.");
  });
}

module.exports = {
  createServer,
  findGuardianScript,
  parseServerArgs,
  resolveProjectRoot,
  COMMAND_DEFINITIONS,
  MEMORY_FILES,
  WRITE_CONFIRMATIONS,
  API_VERSION,
};

if (require.main === module) main();
