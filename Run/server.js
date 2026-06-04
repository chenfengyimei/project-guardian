#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { URL } = require("node:url");
const {
  MEMORY_FILE_CONFIG,
  SENSITIVE_TEXT_PATTERN,
  buildManualMemoryContent,
  buildManualMemoryEntry,
  memoryFilesForConfig,
  publicMemoryAppendTemplates,
  resolveMemoryTarget: resolveConfiguredMemoryTarget,
} = require("../plugins/project-guardian/scripts/lib/manual-memory");

const RUN_ROOT = __dirname;
const PUBLIC_ROOT = path.join(RUN_ROOT, "public");
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4357;
const CONFIG_FILE = "project-guardian.config.json";
const API_VERSION = 3;
const COMMAND_TIMEOUT_MS = 90_000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_OUTPUT_BYTES = 512 * 1024;
const MAX_MEMORY_FILE_BYTES = 256 * 1024;
const BRIEF_MODES = new Set(["auto", "quick", "deep", "full"]);
const INIT_LANGUAGES = new Set(["zh-CN", "en"]);
const INIT_ADAPTERS = new Set(["default", "all"]);
const COMMAND_CONFIRMATION = "RUN_COMMAND";
const INSTALL_ADAPTERS = new Set([
  "generic",
  "codex",
  "cursor",
  "copilot",
  "windsurf",
  "cline",
  "continue",
  "claude",
  "gemini",
  "vscode",
  "vscode-copilot",
  "all",
]);

const COMMAND_DEFINITIONS = [
  readCommand("help", "Help 帮助", ["help"], "查看 Guardian CLI 帮助和全部命令。"),
  readCommand("version", "Version 版本", ["--version"], "查看当前 Project Guardian 版本。"),
  readCommand("doctor", "Doctor 体检", ["doctor"], "检查记忆文件、AI 规则、配置和 Git 变更状态。"),
  readCommand("check", "Check 变更关联", ["check"], "检查代码变更是否带有对应项目记忆更新。"),
  readCommand("validate-docs", "Validate Docs", ["validate-docs"], "检查项目记忆文档是否仍是空模板或低质量内容。"),
  readCommand("scan-secrets", "Scan Secrets", ["scan-secrets"], "扫描项目记忆中疑似密码、token、私钥等敏感信息。"),
  readCommand("verify", "Verify 全量检查", ["verify"], "运行 doctor、check、validate-docs、复审和安全扫描。"),
  readCommand("reviews", "Reviews 列表", ["reviews"], "列出所有已登记的决策复审。"),
  readCommand("reviews-due", "Reviews Due", ["reviews", "due"], "检查已到期但还未完成的决策复审。"),
  readCommand("conflicts", "Conflicts 冲突", ["conflicts"], "查看 Git 合并冲突和记忆文件冲突处理建议。"),
  readCommand("adapters-doctor", "Adapters Doctor", ["adapters", "doctor"], "检查各 AI IDE 适配器文件是否已安装。"),
  linkedCommand("init", "Init 初始化", "init", "使用插件初始化页面运行 guardian init。", "guardian init --language zh-CN"),
  linkedCommand("append-memory", "Append Memory", "append", "使用追加记忆页面按模板补充核心项目记忆。", "guardian append-memory --file STATE --template state-progress"),
  linkedCommand("brief", "Brief 读取计划", "brief", "使用读取计划页面生成预算友好的记忆读取计划。", "guardian brief \"任务\" --mode auto --limit 3"),
  linkedCommand("query", "Query 知识查询", "query", "使用知识查询页面查询项目记忆、源码和最近 Git 历史。", "guardian query \"问题\" --limit 3"),
  writeCommand("update", "Update 更新记忆", "追加 AI 协助变更记录，并刷新状态记忆。", "guardian update \"任务摘要\"", [
    textField("summary", "任务摘要", "例如：修复登录验证码校验"),
  ], (body) => ["update", validateTextField(body.summary, "Task summary", 200)]),
  writeCommand("handover", "Handover 生成交接", "根据当前记忆和项目文件重新生成交接指南。", "guardian handover", [], () => ["handover"]),
  writeCommand("decision-add", "Decision Add", "新增结构化决策记录。", "guardian decision add --title ... --context ... --decision ...", [
    textField("title", "标题", "例如：采用本地命令目录"),
    textField("date", "日期，可选", "YYYY-MM-DD"),
    textAreaField("context", "背景", "为什么需要这个决策"),
    textAreaField("decision", "决策", "最终决定是什么"),
    textAreaField("alternatives", "备选方案，可选", "考虑过哪些方案"),
    textField("files", "影响文件，可选", "例如：Run/server.js, Run/public/app.js"),
    textField("relatedChange", "关联变更，可选", "例如：Run CLI command catalog"),
    textAreaField("verification", "验证方式", "如何确认这个决策有效"),
    textAreaField("risks", "风险，可选", "这个决策可能带来的风险"),
    textField("reviewAfter", "复审日期，可选", "YYYY-MM-DD"),
    textAreaField("followUp", "后续动作，可选", "后续需要继续做什么"),
  ], buildDecisionAddArgs),
  writeCommand("reviews-complete", "Reviews Complete", "标记某个决策复审已完成。", "guardian reviews complete memory/decisions/example.md --summary ... --verification ...", [
    textField("file", "复审文件", "memory/decisions/example.md"),
    textAreaField("summary", "复审结论", "本次复审的结论"),
    textAreaField("verification", "验证方式", "检查了哪些文件、测试或风险"),
    textField("reviewer", "复审人，可选", "AI reviewer"),
  ], buildReviewCompleteArgs),
  writeCommand("install-adapters", "Install Adapters", "安装 AI IDE 规则适配器。", "guardian install-adapters --adapter all", [
    textField("adapter", "适配器", "all 或 cursor,copilot,windsurf"),
  ], (body) => ["install-adapters", "--adapter", validateAdapterList(body.adapter || "all")]),
  writeCommand("install-hooks", "Install Hooks", "安装本地 Git pre-commit 检查 hook。", "guardian install-hooks", [], () => ["install-hooks"]),
  writeCommand("install-ci", "Install CI", "生成 Gitee Go Project Guardian 工作流模板。", "guardian install-ci", [], () => ["install-ci"]),
  terminalCommand("mcp", "MCP Server", "启动 stdio MCP server，需要在终端或 AI IDE 配置中运行。", "guardian mcp"),
];
const COMMANDS = new Map(COMMAND_DEFINITIONS.map((command) => [command.id, command]));

const MEMORY_FILES = MEMORY_FILE_CONFIG.map((item) => [item.name, item.fallbackPath]);

const WRITE_CONFIRMATIONS = {
  init: "RUN_INIT",
  appendMemory: "APPEND_MEMORY",
  command: COMMAND_CONFIRMATION,
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

function readCommand(id, label, args, description) {
  return {
    id,
    label,
    kind: "read",
    command: `guardian ${args.join(" ")}`,
    description,
    args,
    fields: [],
  };
}

function linkedCommand(id, label, view, description, command) {
  return {
    id,
    label,
    kind: "linked",
    view,
    command,
    description,
    fields: [],
  };
}

function writeCommand(id, label, description, command, fields, buildArgs) {
  return {
    id,
    label,
    kind: "write",
    command,
    description,
    confirmation: COMMAND_CONFIRMATION,
    fields,
    buildArgs,
  };
}

function terminalCommand(id, label, description, command) {
  return {
    id,
    label,
    kind: "terminal",
    command,
    description,
    fields: [],
  };
}

function textField(name, label, placeholder) {
  return { name, label, type: "text", placeholder };
}

function textAreaField(name, label, placeholder) {
  return { name, label, type: "textarea", placeholder };
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
    await sendCommandResult(res, context, args, action);
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
    const result = appendManualMemory(context, body.name, body);
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
      templateMemoryAppend: true,
    },
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

function publicCommandDefinition(command) {
  return {
    id: command.id,
    label: command.label,
    kind: command.kind,
    command: command.command,
    description: command.description,
    view: command.view || null,
    confirmation: command.confirmation || null,
    fields: command.fields || [],
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

function validateTextField(value, label, maxLength) {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!text) throw badRequest(`${label} is required.`);
  if (text.length > maxLength) throw badRequest(`${label} must be ${maxLength} characters or fewer.`);
  if (SENSITIVE_TEXT_PATTERN.test(text)) {
    throw badRequest(`${label} looks like it may contain a password, token, API key, or other secret.`);
  }
  return text;
}

function validateOptionalTextField(value, label, maxLength) {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";
  if (text.length > maxLength) throw badRequest(`${label} must be ${maxLength} characters or fewer.`);
  if (SENSITIVE_TEXT_PATTERN.test(text)) {
    throw badRequest(`${label} looks like it may contain a password, token, API key, or other secret.`);
  }
  return text;
}

function validateReviewAfter(value) {
  return validateOptionalDate(value, "Review after");
}

function validateOptionalDate(value, label) {
  const date = validateOptionalTextField(value, label, 20);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw badRequest(`${label} must use YYYY-MM-DD.`);
  }
  return date;
}

function validateRelativeCliPath(value, label) {
  const text = validateTextField(value, label, 260).replace(/\\/g, "/");
  if (path.isAbsolute(text) || text.split("/").includes("..")) {
    throw badRequest(`${label} must be a relative path inside the project.`);
  }
  return text;
}

function validateAdapterList(value) {
  const adapters = String(value || "all")
    .split(",")
    .map((adapter) => adapter.trim().toLowerCase())
    .filter(Boolean);
  const selected = adapters.length ? adapters : ["all"];
  if (selected.includes("all") && selected.length > 1) {
    throw badRequest("Adapter all cannot be combined with other adapters.");
  }
  const unknown = selected.filter((adapter) => !INSTALL_ADAPTERS.has(adapter));
  if (unknown.length) {
    throw badRequest(`Adapter must be one of: ${Array.from(INSTALL_ADAPTERS).join(", ")}.`);
  }
  return Array.from(new Set(selected)).join(",");
}

function buildDecisionAddArgs(body) {
  const args = [
    "decision",
    "add",
    "--title",
    validateTextField(body.title, "Decision title", 120),
    "--context",
    validateTextField(body.context, "Decision context", 1200),
    "--decision",
    validateTextField(body.decision, "Decision", 1200),
    "--verification",
    validateTextField(body.verification, "Verification", 800),
  ];
  const date = validateOptionalDate(body.date, "Decision date");
  if (date) args.push("--date", date);
  pushOptionalArg(args, "--alternatives", validateOptionalTextField(body.alternatives, "Alternatives", 1000));
  pushOptionalArg(args, "--files", validateOptionalTextField(body.files, "Affected files", 800));
  pushOptionalArg(args, "--related-change", validateOptionalTextField(body.relatedChange, "Related change", 500));
  pushOptionalArg(args, "--risks", validateOptionalTextField(body.risks, "Risks", 1000));
  const reviewAfter = validateReviewAfter(body.reviewAfter);
  if (reviewAfter) args.push("--review-after", reviewAfter);
  pushOptionalArg(args, "--follow-up", validateOptionalTextField(body.followUp, "Follow-up", 1000));
  return args;
}

function pushOptionalArg(args, flag, value) {
  if (value) args.push(flag, value);
}

function buildReviewCompleteArgs(body) {
  const args = [
    "reviews",
    "complete",
    validateRelativeCliPath(body.file, "Review file"),
    "--summary",
    validateTextField(body.summary, "Review summary", 1000),
    "--verification",
    validateTextField(body.verification, "Review verification", 1000),
  ];
  const reviewer = validateOptionalTextField(body.reviewer, "Reviewer", 120);
  if (reviewer) args.push("--reviewer", reviewer);
  return args;
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
  COMMAND_DEFINITIONS,
  MEMORY_FILES,
  WRITE_CONFIRMATIONS,
  API_VERSION,
};

if (require.main === module) main();
