const { spawn } = require("child_process");
const readline = require("readline");

const PROTOCOL_VERSION = "2025-06-18";

const TOOLS = [
  {
    name: "guardian_query",
    description: "Search Project Guardian memory, source files, and recent Git history.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Question or keywords to search for." },
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
];

function runMcpServer(options) {
  const server = new McpServer(options);
  server.start();
}

class McpServer {
  constructor(options) {
    this.root = options.root;
    this.node = options.node || process.execPath;
    this.guardianScript = options.guardianScript;
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
    if (message.method === "tools/list") return { jsonrpc: "2.0", id: message.id, result: { tools: TOOLS } };
    if (message.method === "tools/call") return this.callTool(message);
    if (message.id === undefined) return null;
    return {
      jsonrpc: "2.0",
      id: message.id,
      error: { code: -32601, message: `Method not found: ${message.method}` },
    };
  }

  async callTool(message) {
    const params = message.params || {};
    const name = params.name;
    const args = params.arguments || {};
    const tool = TOOLS.find((item) => item.name === name);
    if (!tool) {
      return {
        jsonrpc: "2.0",
        id: message.id,
        error: { code: -32602, message: `Unknown tool: ${name}` },
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

function commandForTool(name, args) {
  switch (name) {
    case "guardian_query":
      return ["query", requiredString(args.question, "question")];
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
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
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
  TOOLS,
  runMcpServer,
};
