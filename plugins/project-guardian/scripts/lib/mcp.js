const fs = require("fs");
const { spawn } = require("child_process");
const readline = require("readline");

const PROTOCOL_VERSION = "2025-06-18";
const COMMAND_TIMEOUT_MS = 90_000;
const MAX_OUTPUT_BYTES = 512 * 1024;
const MAX_STDIN_LINE_LENGTH = 1024 * 1024;
const MAX_CONCURRENT_READS = 3;
const WRITE_TOOL_NAMES = new Set(["guardian_update", "guardian_decision_add", "guardian_review_complete", "guardian_handover", "guardian_memory_repair"]);

const STRING_MAX_LENGTHS = {
  question: 2000,
  task: 500,
  title: 200,
  context: 2000,
  decision: 2000,
  alternatives: 2000,
  files: 1000,
  verification: 2000,
  risks: 2000,
  followUp: 2000,
  reviewAfter: 50,
  file: 500,
  summary: 2000,
  reviewer: 200,
  reason: 2000,
  sensitiveData: 1000,
  nextStep: 2000,
};

const TOOLS = [
  {
    name: "guardian_brief",
    description: "Return a budget-aware reading plan, relevant memory files, and rough token estimates.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Task, question, or context to route memory reading.", maxLength: STRING_MAX_LENGTHS.question },
        limit: { type: "number", minimum: 1, maximum: 10, description: "Suggested query snippet limit. Defaults to 3." },
        mode: { type: "string", enum: ["auto", "quick", "deep", "full"], description: "Reading depth. auto routes by task; quick reads core memory; deep adds decisions and changelog; full reads all core memory." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "guardian_query",
    description: "Search Project Guardian memory, source files, and recent Git history.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Question or keywords to search for.", maxLength: STRING_MAX_LENGTHS.question },
        limit: { type: "number", minimum: 1, maximum: 10, description: "Maximum source snippets to return, from 1 to 10. Defaults to 6." },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
  {
    name: "guardian_update",
    description: "Record the latest AI-assisted change first and refresh project state memory.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Short task summary.", maxLength: STRING_MAX_LENGTHS.task },
        summary: { type: "string", description: "What changed and why.", maxLength: STRING_MAX_LENGTHS.summary },
        reason: { type: "string", description: "Business rule, bug, or requirement behind the change.", maxLength: STRING_MAX_LENGTHS.reason },
        verification: { type: "string", description: "Commands or manual checks performed.", maxLength: STRING_MAX_LENGTHS.verification },
        risks: { type: "string", description: "Compatibility, data, UI, or deployment risks.", maxLength: STRING_MAX_LENGTHS.risks },
        sensitiveData: { type: "string", description: "Sensitive-data review result.", maxLength: STRING_MAX_LENGTHS.sensitiveData },
        nextStep: { type: "string", description: "What the next developer should do.", maxLength: STRING_MAX_LENGTHS.nextStep },
      },
      required: ["task"],
      additionalProperties: false,
    },
  },
  {
    name: "guardian_memory_health",
    description: "Check changelog ordering and decision-index synchronization without writing files.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "guardian_memory_repair",
    description: "Deterministically sort changelog entries and rebuild the decision index from individual decision files.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "guardian_decision_add",
    description: "Add a structured Project Guardian decision record.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", maxLength: STRING_MAX_LENGTHS.title },
        context: { type: "string", maxLength: STRING_MAX_LENGTHS.context },
        decision: { type: "string", maxLength: STRING_MAX_LENGTHS.decision },
        alternatives: { type: "string", maxLength: STRING_MAX_LENGTHS.alternatives },
        files: { type: "string", maxLength: STRING_MAX_LENGTHS.files },
        verification: { type: "string", maxLength: STRING_MAX_LENGTHS.verification },
        risks: { type: "string", maxLength: STRING_MAX_LENGTHS.risks },
        followUp: { type: "string", maxLength: STRING_MAX_LENGTHS.followUp },
        reviewAfter: { type: "string", maxLength: STRING_MAX_LENGTHS.reviewAfter },
      },
      required: ["title", "context", "decision"],
      additionalProperties: false,
    },
  },
  {
    name: "guardian_verify",
    description: "Run doctor, check, validate-docs, and configured security scans.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "guardian_doctor",
    description: "Audit memory files, AI rules, config, and Git change state.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "guardian_scan_secrets",
    description: "Scan project memory for likely secrets without printing full values.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "guardian_handover",
    description: "Generate or refresh the configured handover memory file.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "guardian_conflicts",
    description: "Report Git merge conflicts and Project Guardian memory conflict advice.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "guardian_adapters_doctor",
    description: "Show which AI IDE adapters are installed or missing.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "guardian_reviews_due",
    description: "List decision reviews and fail when reviews are due.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "guardian_review_complete",
    description: "Mark a scheduled decision review as completed with a result and verification note.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string", description: "Decision review file path or filename.", maxLength: STRING_MAX_LENGTHS.file },
        summary: { type: "string", description: "Review conclusion.", maxLength: STRING_MAX_LENGTHS.summary },
        verification: { type: "string", description: "How the review was checked.", maxLength: STRING_MAX_LENGTHS.verification },
        reviewer: { type: "string", description: "AI or human reviewer name.", maxLength: STRING_MAX_LENGTHS.reviewer },
      },
      required: ["file", "summary", "verification"],
      additionalProperties: false,
    },
  },
];
const SUPPORTED_MCP_TOOLS = TOOLS.map((tool) => tool.name);

function runMcpServer(options) {
  const server = new McpServer(options);
  server.start();
}

class TaskQueue {
  constructor(options = {}) {
    this.maxConcurrentReads = options.maxConcurrentReads || MAX_CONCURRENT_READS;
    this.pending = [];
    this.active = new Map();
    this.runningReads = 0;
    this.runningWrite = false;
    this.nextId = 0;
  }

  enqueue(job, isWrite) {
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.push({ id, job, isWrite, resolve, reject });
      this.flush();
    });
  }

  flush() {
    while (this.pending.length > 0) {
      const next = this.pending[0];
      if (next.isWrite) {
        if (this.active.size > 0) return;
      } else if (this.runningWrite || this.runningReads >= this.maxConcurrentReads) {
        return;
      }

      const task = this.pending.shift();
      if (task.isWrite) {
        this.runningWrite = true;
        this.runTask(task);
        return;
      }
      this.runningReads += 1;
      this.runTask(task);
    }
  }

  async runTask(task) {
    this.active.set(task.id, task);
    try {
      const result = await task.job();
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      const isWrite = task.isWrite;
      const wasActive = this.active.delete(task.id);
      if (wasActive) {
        if (isWrite) this.runningWrite = false;
        else this.runningReads -= 1;
        this.flush();
      }
    }
  }

  runningCount() {
    return this.active.size;
  }

  abortAll(message) {
    for (const task of this.active.values()) {
      task.reject(new Error(message));
      this.active.delete(task.id);
    }
    this.runningReads = 0;
    this.runningWrite = false;
    for (const task of this.pending) {
      task.reject(new Error(message));
    }
    this.pending = [];
  }
}

class McpServer {
  constructor(options) {
    this.root = options.root;
    this.node = options.node || process.execPath;
    this.guardianScript = options.guardianScript;
    if (!this.guardianScript || !fs.existsSync(this.guardianScript)) {
      const hint = this.guardianScript ? `File not found: ${this.guardianScript}` : "guardianScript is not set";
      throw new Error(`Project Guardian CLI script is missing. ${hint}`);
    }
    this.mcpConfig = normalizeMcpConfig(options.mcpConfig || {});
    this.enabledToolNames = enabledToolNames(this.mcpConfig);
    this.tools = TOOLS.filter((tool) => this.enabledToolNames.has(tool.name));
    this.queue = new TaskQueue({ maxConcurrentReads: MAX_CONCURRENT_READS });
    this.shuttingDown = false;
  }

  start() {
    const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (line.length > MAX_STDIN_LINE_LENGTH) {
        this.respondError(null, -32700, `Request line exceeds maximum length of ${MAX_STDIN_LINE_LENGTH} bytes.`);
        return;
      }
      if (this.shuttingDown) return;
      this.handleLine(line);
    });
    rl.on("close", () => this.shutdown());

    this.shuttingDown = false;
    process.on("SIGTERM", () => this.shutdown());
    process.on("SIGINT", () => this.shutdown());
  }

  shutdown() {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    const active = this.queue.runningCount();
    if (active > 0) {
      process.stderr.write(`Project Guardian MCP: shutting down, waiting for ${active} active task(s)...\n`);
    }
    this.queue.abortAll("MCP server shutting down.");
    process.exit(0);
  }

  async handleLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    let message;
    try {
      message = JSON.parse(trimmed);
    } catch (error) {
      this.respondError(null, -32700, "Parse error: invalid JSON.");
      return;
    }

    try {
      const response = await this.handleMessage(message);
      if (response) this.write(response);
    } catch (error) {
      process.stderr.write(`Project Guardian MCP internal error: ${error.message}\n`);
      this.respondError(message.id ?? null, -32603, "Internal server error.");
    }
  }

  async handleMessage(message) {
    if (message.method === "initialize") {
      return {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: "project-guardian", version: this.readVersion() },
        },
      };
    }
    if (message.method === "notifications/initialized") return null;
    if (message.method === "ping") return { jsonrpc: "2.0", id: message.id, result: {} };
    if (message.method === "tools/list") return { jsonrpc: "2.0", id: message.id, result: { tools: this.tools } };
    if (message.method === "tools/call") return this.callTool(message);
    if (message.id === undefined) return null;
    return {
      jsonrpc: "2.0",
      id: message.id,
      error: { code: -32601, message: `Method not found: ${message.method}` },
    };
  }

  async callTool(message) {
    const params = plainObject(message.params) ? message.params : {};
    const name = params.name;
    const args = params.arguments == null ? {} : params.arguments;
    try {
      const result = await executeMcpTool({
        root: this.root,
        node: this.node,
        guardianScript: this.guardianScript,
        normalizedMcpConfig: this.mcpConfig,
        enabledToolNames: this.enabledToolNames,
        queue: this.queue,
        name,
        arguments: args,
      });
      return {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          content: [{ type: "text", text: result.text }],
          isError: result.isError,
        },
      };
    } catch (error) {
      if (error instanceof McpToolCallError) {
        return {
          jsonrpc: "2.0",
          id: message.id,
          error: { code: -32602, message: error.message },
        };
      }
      return {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          content: [{ type: "text", text: `Tool execution failed: ${error.message}` }],
          isError: true,
        },
      };
    }
  }

  runGuardian(args) {
    return runGuardianCommand({
      root: this.root,
      node: this.node,
      guardianScript: this.guardianScript,
    }, args);
  }

  readVersion() {
    return require("../../.codex-plugin/plugin.json").version || "0.0.0";
  }

  respondError(id, code, message) {
    this.write({ jsonrpc: "2.0", id, error: { code, message } });
  }

  write(message) {
    process.stdout.write(`${JSON.stringify(message)}\n`);
  }
}

function appendLimited(current, addition) {
  if (Buffer.byteLength(current, "utf8") >= MAX_OUTPUT_BYTES) return current;
  const next = current + addition;
  if (Buffer.byteLength(next, "utf8") <= MAX_OUTPUT_BYTES) return next;
  const buf = Buffer.from(next, "utf8").subarray(0, MAX_OUTPUT_BYTES);
  let safeEnd = buf.length;
  while (safeEnd > 0 && (buf[safeEnd - 1] & 0xC0) === 0x80) safeEnd -= 1;
  return `${buf.subarray(0, safeEnd).toString("utf8")}\n[output truncated]`;
}

function normalizeMcpConfig(config = {}) {
  const issues = validateMcpConfig(config);
  if (issues.length) throw new Error(`Invalid MCP configuration: ${issues.join("; ")}`);
  return {
    readOnly: config.readOnly === true,
    allowedTools: Array.isArray(config.allowedTools) ? [...config.allowedTools] : [],
  };
}

function validateMcpConfig(config = {}) {
  const issues = [];
  if (!plainObject(config)) {
    issues.push("mcp must be an object");
    return issues;
  }
  if (typeof config.readOnly !== "boolean") issues.push("mcp.readOnly must be a boolean");
  if (!Array.isArray(config.allowedTools)) {
    issues.push("mcp.allowedTools must be an array");
    return issues;
  }
  for (const tool of config.allowedTools) {
    if (typeof tool !== "string") {
      issues.push("mcp.allowedTools entries must be strings");
    } else if (!SUPPORTED_MCP_TOOLS.includes(tool)) {
      issues.push(`mcp.allowedTools contains unsupported tool: ${tool}`);
    }
  }
  return issues;
}

function enabledToolNames(normalizedConfig) {
  const all = new Set(SUPPORTED_MCP_TOOLS);
  const configured = normalizedConfig.allowedTools.length
    ? new Set(normalizedConfig.allowedTools)
    : all;
  if (normalizedConfig.readOnly || process.env.PROJECT_GUARDIAN_MCP_READ_ONLY === "1") {
    for (const name of WRITE_TOOL_NAMES) configured.delete(name);
  }
  return configured;
}

class McpToolCallError extends Error {}

async function executeMcpTool(options = {}) {
  const root = options.root;
  const node = options.node || process.execPath;
  const guardianScript = options.guardianScript;
  if (!guardianScript || !fs.existsSync(guardianScript)) {
    const hint = guardianScript ? `File not found: ${guardianScript}` : "guardianScript is not set";
    throw new McpToolCallError(`Project Guardian CLI script is missing. ${hint}`);
  }

  const normalizedConfig = options.normalizedMcpConfig || normalizeMcpConfig(options.mcpConfig || {});
  const enabledNames = options.enabledToolNames || enabledToolNames(normalizedConfig);
  const args = options.arguments == null ? {} : options.arguments;
  const tool = validateMcpToolCall(options.name, args, enabledNames);
  const command = commandForTool(tool.name, args);
  const isWrite = WRITE_TOOL_NAMES.has(tool.name);
  const queue = options.queue || new TaskQueue({ maxConcurrentReads: MAX_CONCURRENT_READS });
  const result = await queue.enqueue(() => runGuardianCommand({ root, node, guardianScript }, command), isWrite);
  return {
    ok: result.code === 0,
    isError: result.code !== 0,
    name: tool.name,
    write: isWrite,
    status: result.code,
    text: result.text,
    command,
  };
}

function validateMcpToolCall(name, args, enabledNames) {
  const toolName = String(name || "").trim();
  const knownTool = TOOLS.find((item) => item.name === toolName);
  if (!knownTool) throw new McpToolCallError(`Unknown tool: ${toolName}`);
  if (!enabledNames.has(toolName)) throw new McpToolCallError(`Tool disabled by MCP configuration: ${toolName}`);
  const argumentIssue = validateToolArguments(knownTool, args);
  if (argumentIssue) throw new McpToolCallError(argumentIssue);
  return knownTool;
}

function runGuardianCommand(context, args) {
  return new Promise((resolve) => {
    const child = spawn(context.node, [context.guardianScript, ...args], {
      cwd: context.root,
      env: { ...process.env, PROJECT_GUARDIAN_MCP_CHILD: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let outputTruncated = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, COMMAND_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout = appendLimited(stdout, chunk.toString());
      if (Buffer.byteLength(stdout, "utf8") >= MAX_OUTPUT_BYTES) outputTruncated = true;
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendLimited(stderr, chunk.toString());
      if (Buffer.byteLength(stderr, "utf8") >= MAX_OUTPUT_BYTES) outputTruncated = true;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: 1, text: error.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        resolve({ code: 1, text: `Command timed out after ${COMMAND_TIMEOUT_MS / 1000}s.` });
        return;
      }
      const text = trimOutput(stdout, stderr, outputTruncated, code);
      resolve({ code: code === null ? 1 : code, text });
    });
  });
}

function publicMcpStatus(config = {}, options = {}) {
  const issues = validateMcpConfig(config);
  const normalized = issues.length
    ? { readOnly: false, allowedTools: [] }
    : normalizeMcpConfig(config);
  const enabledNames = issues.length ? new Set() : enabledToolNames(normalized);
  const envReadOnly = process.env.PROJECT_GUARDIAN_MCP_READ_ONLY === "1";
  return {
    protocolVersion: PROTOCOL_VERSION,
    configValid: issues.length === 0,
    configIssues: issues,
    readOnly: normalized.readOnly,
    envReadOnly,
    effectiveReadOnly: normalized.readOnly || envReadOnly,
    allowedTools: normalized.allowedTools,
    commands: {
      global: options.globalCommand || "guardian mcp",
      local: options.localCommand || "",
    },
    totalTools: TOOLS.length,
    enabledTools: enabledNames.size,
    writeTools: Array.from(WRITE_TOOL_NAMES),
    tools: TOOLS.map((tool) => publicMcpTool(tool, enabledNames)),
  };
}

function publicMcpTool(tool, enabledNames) {
  const properties = Object.keys((tool.inputSchema && tool.inputSchema.properties) || {});
  return {
    name: tool.name,
    description: tool.description,
    enabled: enabledNames.has(tool.name),
    write: WRITE_TOOL_NAMES.has(tool.name),
    required: tool.inputSchema && Array.isArray(tool.inputSchema.required) ? tool.inputSchema.required : [],
    properties,
    fields: publicMcpFields(tool),
  };
}

function publicMcpFields(tool) {
  const schema = tool.inputSchema || {};
  const properties = schema.properties || {};
  const required = new Set(Array.isArray(schema.required) ? schema.required : []);
  return Object.keys(properties).map((name) => publicMcpField(name, properties[name], required.has(name)));
}

function publicMcpField(name, property, required) {
  return {
    name,
    label: name,
    type: publicMcpFieldType(property),
    required,
    description: property.description || "",
    maxLength: property.maxLength,
    minimum: property.minimum,
    maximum: property.maximum,
    options: Array.isArray(property.enum) ? property.enum : undefined,
  };
}

function publicMcpFieldType(property) {
  if (Array.isArray(property.enum)) return "select";
  if (property.type === "number") return "number";
  if (property.type === "string" && property.maxLength && property.maxLength > 500) return "textarea";
  return "text";
}

function validateToolArguments(tool, args) {
  if (!plainObject(args)) return `${tool.name} arguments must be an object`;
  const schema = tool.inputSchema || {};
  const properties = schema.properties || {};
  const propertyNames = new Set(Object.keys(properties));
  for (const name of Object.keys(args)) {
    if (!propertyNames.has(name)) return `Unsupported argument for ${tool.name}: ${name}`;
    const prop = properties[name];
    const expected = prop.type;
    if (expected === "number" && !Number.isFinite(args[name])) return `Invalid argument type for ${tool.name}.${name}: expected number`;
    if (expected && typeof args[name] !== expected) return `Invalid argument type for ${tool.name}.${name}: expected ${expected}`;
    if (prop.enum && !prop.enum.includes(args[name])) return `${tool.name}.${name} must be one of: ${prop.enum.join(", ")}`;
    if (typeof args[name] === "number") {
      if (prop.minimum !== undefined && args[name] < prop.minimum) return `${tool.name}.${name} must be at least ${prop.minimum}`;
      if (prop.maximum !== undefined && args[name] > prop.maximum) return `${tool.name}.${name} must be at most ${prop.maximum}`;
    }
    if (expected === "string" && typeof args[name] === "string" && prop.maxLength !== undefined) {
      if (args[name].length > prop.maxLength) return `${tool.name}.${name} exceeds maximum length of ${prop.maxLength}`;
    }
  }
  for (const name of schema.required || []) {
    if (typeof args[name] !== "string" || !args[name].trim()) return `Missing required argument: ${name}`;
  }
  return "";
}

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function commandForTool(name, args) {
  switch (name) {
    case "guardian_brief":
      return briefArgs(args);
    case "guardian_query":
      return queryArgs(args);
    case "guardian_update":
      return updateArgs(args);
    case "guardian_decision_add":
      return decisionArgs(args);
    case "guardian_verify":
      return ["verify"];
    case "guardian_doctor":
      return ["doctor"];
    case "guardian_scan_secrets":
      return ["scan-secrets"];
    case "guardian_handover":
      return ["handover"];
    case "guardian_conflicts":
      return ["conflicts"];
    case "guardian_adapters_doctor":
      return ["adapters", "doctor"];
    case "guardian_reviews_due":
      return ["reviews", "due"];
    case "guardian_review_complete":
      return reviewCompleteArgs(args);
    case "guardian_memory_health":
      return ["repair-memory"];
    case "guardian_memory_repair":
      return ["repair-memory", "--write"];
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function updateArgs(args) {
  const values = ["update", requiredString(args.task, "task")];
  addOptional(values, "--summary", args.summary);
  addOptional(values, "--reason", args.reason);
  addOptional(values, "--verification", args.verification);
  addOptional(values, "--risks", args.risks);
  addOptional(values, "--sensitive-data", args.sensitiveData);
  addOptional(values, "--next-step", args.nextStep);
  return values;
}

function briefArgs(args) {
  const values = ["brief"];
  if (typeof args.question === "string" && args.question.trim()) values.push(args.question.trim());
  addOptional(values, "--limit", args.limit);
  addOptional(values, "--mode", args.mode);
  return values;
}

function queryArgs(args) {
  const values = ["query", requiredString(args.question, "question")];
  addOptional(values, "--limit", args.limit);
  return values;
}

function reviewCompleteArgs(args) {
  const values = ["reviews", "complete", requiredString(args.file, "file")];
  addOptional(values, "--summary", args.summary);
  addOptional(values, "--verification", args.verification);
  addOptional(values, "--reviewer", args.reviewer);
  return values;
}

function decisionArgs(args) {
  const values = [
    "decision",
    "add",
    "--title",
    requiredString(args.title, "title"),
    "--context",
    requiredString(args.context, "context"),
    "--decision",
    requiredString(args.decision, "decision"),
  ];
  addOptional(values, "--alternatives", args.alternatives);
  addOptional(values, "--files", args.files);
  addOptional(values, "--verification", args.verification);
  addOptional(values, "--risks", args.risks);
  addOptional(values, "--follow-up", args.followUp);
  addOptional(values, "--review-after", args.reviewAfter);
  return values;
}

function addOptional(values, flag, value) {
  if (typeof value === "string" && value.trim()) values.push(flag, value.trim());
  if (typeof value === "number" && Number.isFinite(value)) values.push(flag, String(value));
}

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing required argument: ${label}`);
  return value.trim();
}

function trimOutput(stdout, stderr, truncated, code) {
  const parts = [
    stdout.trim() ? stdout.trim() : "",
    stderr.trim() ? `[stderr]\n${stderr.trim()}` : "",
  ];
  if (truncated) parts.push("[output truncated — exceeded 512KB limit]");
  const output = parts.filter(Boolean).join("\n");
  if (output) return output;
  return code === 0 ? "Command completed." : `Command failed with exit code ${code}.`;
}

module.exports = {
  PROTOCOL_VERSION,
  SUPPORTED_MCP_TOOLS,
  TOOLS,
  enabledToolNames,
  executeMcpTool,
  publicMcpStatus,
  validateMcpConfig,
  runMcpServer,
  TaskQueue,
};
