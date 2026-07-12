const path = require("path");
const { unique } = require("./shared");

const DEFAULT_ADAPTERS = ["generic", "cursor"];
const ADAPTER_ALIASES = {
  "vscode-copilot": "vscode",
};
const ADAPTER_DEFINITIONS = {
  generic: {
    label: "Generic AI agents",
    files: [{ template: "AGENTS.md", target: "AGENTS.md" }],
    note: "Shared repository-level instructions for tools that read AGENTS.md.",
  },
  codex: {
    label: "OpenAI Codex",
    files: [{ template: "AGENTS.md", target: "AGENTS.md" }],
    note: "Codex reads AGENTS.md and the Codex plugin metadata when installed.",
  },
  cursor: {
    label: "Cursor",
    files: [
      { template: "cursor-rules.mdc", target: path.join(".cursor", "rules", "project-guardian.mdc") },
      { template: "cursorrules", target: ".cursorrules" },
    ],
    note: "Creates both modern Cursor project rules and legacy .cursorrules.",
  },
  copilot: {
    label: "GitHub Copilot",
    files: [
      { template: "copilot-instructions.md", target: path.join(".github", "copilot-instructions.md") },
      { template: "copilot-project-guardian.instructions.md", target: path.join(".github", "instructions", "project-guardian.instructions.md") },
    ],
    note: "Repository and path-specific Copilot custom instructions.",
  },
  windsurf: {
    label: "Windsurf",
    files: [
      { template: "AGENTS.md", target: "AGENTS.md" },
      { template: "windsurf-rule.md", target: path.join(".windsurf", "rules", "project-guardian.md") },
    ],
    note: "Uses AGENTS.md plus a Windsurf workspace rule.",
  },
  cline: {
    label: "Cline",
    files: [{ template: "cline-rule.md", target: path.join(".clinerules", "project-guardian.md") }],
    note: "Project rule for Cline workspaces.",
  },
  continue: {
    label: "Continue",
    files: [{ template: "continue-rule.md", target: path.join(".continue", "rules", "project-guardian.md") }],
    note: "Repository rule for Continue.",
  },
  claude: {
    label: "Claude Code",
    files: [{ template: "CLAUDE.md", target: "CLAUDE.md" }],
    note: "Project memory instructions for Claude Code.",
  },
  gemini: {
    label: "Gemini CLI",
    files: [{ template: "GEMINI.md", target: "GEMINI.md" }],
    note: "Project memory instructions for Gemini CLI.",
  },
  vscode: {
    label: "VS Code",
    files: [
      { template: "copilot-instructions.md", target: path.join(".github", "copilot-instructions.md") },
      { template: "copilot-project-guardian.instructions.md", target: path.join(".github", "instructions", "project-guardian.instructions.md") },
      { template: "vscode-tasks.json", target: path.join(".vscode", "tasks.json") },
    ],
    note: "VS Code tasks plus Copilot custom instructions. This is not a VS Code extension.",
  },
};
const SUPPORTED_ADAPTERS = Object.keys(ADAPTER_DEFINITIONS);

function resolveAdapters(flags = {}, config = {}) {
  const raw = flags.adapter || flags.adapters || config.adapters || DEFAULT_ADAPTERS;
  return expandAdapters(raw, DEFAULT_ADAPTERS);
}

function validateAdapters(raw) {
  if (raw == null) return [];
  try {
    expandAdapters(raw, []);
    return [];
  } catch (error) {
    return [error.message];
  }
}



function expandAdapters(raw, fallback) {
  const values = Array.isArray(raw) ? raw : String(raw).split(",");
  const requested = values.map((value) => canonicalAdapter(String(value).trim())).filter(Boolean);
  const selected = requested.length > 0 ? requested : fallback;
  const expanded = selected.includes("all") ? SUPPORTED_ADAPTERS : selected;
  const unknown = expanded.filter((adapter) => !SUPPORTED_ADAPTERS.includes(adapter));
  if (unknown.length > 0) {
    const supported = [...SUPPORTED_ADAPTERS, ...Object.keys(ADAPTER_ALIASES), "all"];
    throw new Error(`unknown adapter: ${unknown.join(", ")}. Use one of: ${supported.join(", ")}`);
  }
  return unique(expanded);
}

function adapterFiles(adapters) {
  const files = [];
  for (const adapter of adapters) {
    files.push(...(ADAPTER_DEFINITIONS[adapter]?.files || []));
  }
  const seen = new Set();
  return files.filter((file) => {
    const key = file.target.replace(/\\/g, "/");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function adapterMatrix() {
  return SUPPORTED_ADAPTERS.map((adapter) => ({
    adapter,
    label: ADAPTER_DEFINITIONS[adapter].label,
    files: adapterFiles([adapter]),
    note: ADAPTER_DEFINITIONS[adapter].note,
  }));
}

function canonicalAdapter(value) {
  return ADAPTER_ALIASES[value] || value;
}

module.exports = {
  ADAPTER_ALIASES,
  DEFAULT_ADAPTERS,
  SUPPORTED_ADAPTERS,
  adapterMatrix,
  adapterFiles,
  resolveAdapters,
  validateAdapters,
};
