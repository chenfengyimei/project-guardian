const path = require("path");

const SUPPORTED_ADAPTERS = ["codex", "cursor", "copilot", "generic"];
const DEFAULT_ADAPTERS = ["generic", "cursor"];

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
  const requested = values.map((value) => String(value).trim()).filter(Boolean);
  const selected = requested.length > 0 ? requested : fallback;
  const expanded = selected.includes("all") ? SUPPORTED_ADAPTERS : selected;
  const unknown = expanded.filter((adapter) => !SUPPORTED_ADAPTERS.includes(adapter));
  if (unknown.length > 0) {
    throw new Error(`unknown adapter: ${unknown.join(", ")}. Use one of: ${SUPPORTED_ADAPTERS.join(", ")}, all`);
  }
  return unique(expanded);
}

function adapterFiles(adapters) {
  const files = [];
  const add = (template, target) => files.push({ template, target });
  for (const adapter of adapters) {
    if (adapter === "codex" || adapter === "generic") {
      add("AGENTS.md", "AGENTS.md");
    }
    if (adapter === "cursor") {
      add("cursor-rules.mdc", path.join(".cursor", "rules", "project-guardian.mdc"));
      add("cursorrules", ".cursorrules");
    }
    if (adapter === "copilot") {
      add("copilot-instructions.md", path.join(".github", "copilot-instructions.md"));
      add("copilot-project-guardian.instructions.md", path.join(".github", "instructions", "project-guardian.instructions.md"));
    }
  }
  const seen = new Set();
  return files.filter((file) => {
    const key = file.target.replace(/\\/g, "/");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unique(values) {
  return [...new Set(values)];
}

module.exports = {
  DEFAULT_ADAPTERS,
  SUPPORTED_ADAPTERS,
  adapterFiles,
  resolveAdapters,
  validateAdapters,
};
