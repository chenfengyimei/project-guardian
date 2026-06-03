const { spawn } = require("child_process");
const readline = require("readline");

const PROTOCOL_VERSION = "2025-06-18";
const WRITE_TOOL_NAMES = new Set(["guardian_update", "guardian_decision_add", "guardian_review_complete", "guardian_handover"]);

const TOOLS = [
  {
    name: "guardian_brief",
    description: "Return a budget-aware reading plan, relevant memory files, and rough token estimates.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Task, question, or context to route memory reading." },
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
        question: { type: "string", description: "Question or keywords to search for." },
        limit: { type: "number", minimum: 1, maximum: 10, description: "Maximum source snippets to return, from 1 to 10. Defaults to 6." },
      },
      required: ["question"],
      additionalProperties: false,
    },
  },
  {
    name: "guardian_update",
    description: "Append an AI-assisted change record and refresh project state memory.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Short task summary." },
      },
      required: ["task"],
      additionalProperties: false,
    },
  },
  {
    name: "guardian_decision_add",
    description: "Add a structured Project Guardian decision record.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        context: { type: "string" },
        decision: { type: "string" },
        alternatives: { type: "string" },
        files: { type: "string" },
        verification: { type: "string" },
        risks: { type: "string" },
        followUp: { type: "string" },
        reviewAfter: { type: "string" },
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
        file: { type: "string", description: "Decision review file path or filename." },
        summary: { type: "string", description: "Review conclusion." },
        verification: { type: "string", description: "How the review was checked." },
        reviewer: { type: "string", description: "AI or human reviewer name." },
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

class McpServer {
  constructor(options) {
    this.root = options.root;
    this.node = options.node || process.execPath;
    this.guardianScript = options.guardianScript;
    this.mcpConfig = normalizeMcpConfig(options.mcpConfig || {});
    this.enabledToolNames = enabledToolNames(this.mcpConfig);
    this.tools = TOOLS.filter((tool) => this.enabledToolNames.has(tool.name));
  }

  start() {
    const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    rl.on("line", (line) => this.handleLine(line));
  }

  async handleLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    let message;
    try {
      message = JSON.parse(trimmed);
    } catch (error) {
      this.respondError(null, -32700, `Parse error: ${error.message}`);
      return;
    }

    try {
      const response = await this.handleMessage(message);
      if (response) this.write(response);
    } catch (error) {
      this.respondError(message.id ?? null, -32603, error.message);
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
    const knownTool = TOOLS.find((item) => item.name === name);
    if (!knownTool) {
      return {
        jsonrpc: "2.0",
        id: message.id,
        error: { code: -32602, message: `Unknown tool: ${name}` },
      };
    }
    if (!this.enabledToolNames.has(name)) {
      return {
        jsonrpc: "2.0",
        id: message.id,
        error: { code: -32602, message: `Tool disabled by MCP configuration: ${name}` },
      };
    }
    const argumentIssue = validateToolArguments(knownTool, args);
    if (argumentIssue) {
      return {
        jsonrpc: "2.0",
        id: message.id,
        error: { code: -32602, message: argumentIssue },
      };
    }

    const command = commandForTool(name, args);
    const result = await this.runGuardian(command);
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        content: [{ type: "text", text: result.text }],
        isError: result.code !== 0,
      },
    };
  }

  runGuardian(args) {
    return new Promise((resolve) => {
      const child = spawn(this.node, [this.guardianScript, ...args], {
        cwd: this.root,
        env: { ...process.env, PROJECT_GUARDIAN_MCP_CHILD: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (error) => {
        resolve({ code: 1, text: error.message });
      });
      child.on("close", (code) => {
        resolve({ code, text: trimOutput(stdout, stderr, code) });
      });
    });
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

function enabledToolNames(config = {}) {
  const normalized = normalizeMcpConfig(config);
  const all = new Set(SUPPORTED_MCP_TOOLS);
  const configured = normalized.allowedTools.length
    ? new Set(normalized.allowedTools)
    : all;
  if (normalized.readOnly || process.env.PROJECT_GUARDIAN_MCP_READ_ONLY === "1") {
    for (const name of WRITE_TOOL_NAMES) configured.delete(name);
  }
  return configured;
}

function validateToolArguments(tool, args) {
  if (!plainObject(args)) return `${tool.name} arguments must be an object`;
  const schema = tool.inputSchema || {};
  const properties = schema.properties || {};
  const propertyNames = new Set(Object.keys(properties));
  for (const name of Object.keys(args)) {
    if (!propertyNames.has(name)) return `Unsupported argument for ${tool.name}: ${name}`;
    const expected = properties[name].type;
    if (expected === "number" && !Number.isFinite(args[name])) return `Invalid argument type for ${tool.name}.${name}: expected number`;
    if (expected && typeof args[name] !== expected) return `Invalid argument type for ${tool.name}.${name}: expected ${expected}`;
    if (properties[name].enum && !properties[name].enum.includes(args[name])) return `${tool.name}.${name} must be one of: ${properties[name].enum.join(", ")}`;
    if (typeof args[name] === "number") {
      if (properties[name].minimum !== undefined && args[name] < properties[name].minimum) return `${tool.name}.${name} must be at least ${properties[name].minimum}`;
      if (properties[name].maximum !== undefined && args[name] > properties[name].maximum) return `${tool.name}.${name} must be at most ${properties[name].maximum}`;
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
      return ["update", requiredString(args.task, "task")];
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
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
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

function trimOutput(stdout, stderr, code) {
  const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
  if (output) return output;
  return code === 0 ? "Command completed." : `Command failed with exit code ${code}.`;
}

module.exports = {
  PROTOCOL_VERSION,
  SUPPORTED_MCP_TOOLS,
  TOOLS,
  enabledToolNames,
  validateMcpConfig,
  runMcpServer,
};
