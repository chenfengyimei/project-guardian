"use strict";

const fs = require("fs");
const path = require("path");
const { SUPPORTED_ADAPTERS, adapterFiles, adapterMatrix, resolveAdapters } = require("./adapters");
const {
  CONFIG_FILE,
  DEFAULT_CONFIG,
  SUPPORTED_LANGUAGES,
  applyInitFlags,
  clone,
  isChinese,
  loadConfig,
  mergeConfig,
} = require("./config");
const { normalizeForHook, parseFlags, writeFile } = require("./shared");

const PLUGIN_ROOT = path.resolve(__dirname, "..", "..");
const TEMPLATE_DIR = path.join(PLUGIN_ROOT, "assets", "templates");
const AGENT_RULE_FILES = ["AGENTS.md", ".cursorrules"];

function init(root, args = [], guardianScript) {
  const flags = parseFlags(args);
  const config = applyInitFlags(loadConfig(root), flags);
  validateLanguageOrFail(config.language);
  const adapters = resolveAdaptersOrFail(flags, config);
  copyTemplate(root, "PROJECT_CONTEXT.md", config.memoryFiles.context, config);
  copyTemplate(root, "STATE.md", config.memoryFiles.state, config);
  copyTemplate(root, "DECISIONS.md", config.memoryFiles.decisions, config);
  copyTemplate(root, "AI_CHANGELOG.md", config.memoryFiles.changelog, config);
  copyTemplate(root, "HANDOVER.md", config.memoryFiles.handover, config);
  installAdapters(root, args, { adapters, config, fromInit: true });
  writeDefaultConfig(root, { adapters, language: config.language });

  const packagePath = path.join(root, "package.json");
  if (fs.existsSync(packagePath)) {
    addPackageScripts(packagePath, guardianScript);
  }

  console.log(isChinese(config) ? "Project Guardian 项目记忆已初始化。" : "Project Guardian memory initialized.");
  console.log(isChinese(config) ? "下一步：补齐 memory/ 下的项目记忆文件，然后在提交前运行 `guardian verify`。" : "Next: fill the project memory files under memory/ and run `guardian verify` before committing.");
}

function copyTemplate(root, templateName, target, config = DEFAULT_CONFIG) {
  const targetPath = path.join(root, target);
  if (fs.existsSync(targetPath)) {
    console.log(`Kept existing ${target}`);
    return;
  }
  const source = templatePath(templateName, config);
  writeFile(targetPath, renderTemplate(fs.readFileSync(source, "utf8"), config));
  console.log(`Created ${target}`);
}

function renderTemplate(content, config = DEFAULT_CONFIG) {
  const replacements = {
    "memory/PROJECT_CONTEXT.md": config.memoryFiles.context,
    "memory/STATE.md": config.memoryFiles.state,
    "memory/DECISIONS.md": config.memoryFiles.decisions,
    "memory/AI_CHANGELOG.md": config.memoryFiles.changelog,
    "memory/HANDOVER.md": config.memoryFiles.handover,
    "memory/decisions": config.memoryFiles.decisionsDirectory,
  };
  let rendered = content;
  for (const [from, to] of Object.entries(replacements)) {
    rendered = rendered.replaceAll(from, to);
  }
  return rendered;
}

function templatePath(templateName, config = DEFAULT_CONFIG) {
  if (isChinese(config)) {
    const localized = path.join(TEMPLATE_DIR, "zh-CN", templateName);
    if (fs.existsSync(localized)) return localized;
  }
  return path.join(TEMPLATE_DIR, templateName);
}

function writeDefaultConfig(root, overrides = {}) {
  const configPath = path.join(root, CONFIG_FILE);
  if (fs.existsSync(configPath)) {
    console.log(`Kept existing ${CONFIG_FILE}`);
    return;
  }
  const config = mergeConfig(clone(DEFAULT_CONFIG), overrides);
  writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Created ${CONFIG_FILE}`);
}

function addPackageScripts(packagePath, guardianScript) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    pkg.scripts = pkg.scripts || {};
    const runner = packageScriptRunner(packagePath, guardianScript);
    const scripts = {
      "guardian:init": `${runner} init`,
      "guardian:update": `${runner} update`,
      "guardian:append-memory": `${runner} append-memory`,
      "guardian:handover": `${runner} handover`,
      "guardian:check": `${runner} check`,
      "guardian:doctor": `${runner} doctor`,
      "guardian:validate-docs": `${runner} validate-docs`,
      "guardian:scan-secrets": `${runner} scan-secrets`,
      "guardian:verify": `${runner} verify`,
      "guardian:brief": `${runner} brief`,
      "guardian:query": `${runner} query`,
      "guardian:conflicts": `${runner} conflicts`,
      "guardian:reviews": `${runner} reviews`,
      "guardian:adapters-doctor": `${runner} adapters doctor`,
      "guardian:install-adapters": `${runner} install-adapters`,
      "guardian:mcp": `${runner} mcp`,
      "guardian:install-ci": `${runner} install-ci`,
    };
    for (const [name, command] of Object.entries(scripts)) {
      pkg.scripts[name] = pkg.scripts[name] || command;
    }
    fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
    console.log("Added package.json guardian scripts.");
  } catch (error) {
    console.warn(`Could not update package.json: ${error.message}`);
  }
}

function packageScriptRunner(packagePath, guardianScript) {
  const relScript = normalizeForHook(path.relative(path.dirname(packagePath), guardianScript));
  if (!relScript.startsWith("../") && relScript !== ".." && !path.isAbsolute(relScript)) {
    return `node "${relScript}"`;
  }
  return "guardian";
}

function installAdapters(root, args = [], options = {}) {
  const config = options.config || loadConfig(root);
  const flags = parseFlags(args);
  const adapters = options.adapters || resolveAdaptersOrFail(flags, config);
  const files = adapterFiles(adapters);

  for (const file of files) {
    copyTemplate(root, file.template, file.target, config);
  }

  if (!options.fromInit) {
    console.log(`Installed Project Guardian adapters: ${adapters.join(", ")}`);
  }
}

function adaptersDoctor(root) {
  const config = loadConfig(root);
  console.log("Project Guardian adapter doctor");
  console.log("");
  for (const adapter of adapterMatrix()) {
    const missing = adapter.files.filter((file) => !fs.existsSync(path.join(root, file.target)));
    const status = missing.length === 0 ? "installed" : "missing";
    console.log(`- ${adapter.adapter} (${adapter.label}): ${status}`);
    console.log(`  files: ${adapter.files.map((file) => file.target).join(", ")}`);
    console.log(`  install: guardian install-adapters --adapter ${adapter.adapter}`);
    console.log(`  note: ${adapter.note}`);
    if (missing.length > 0) console.log(`  missing: ${missing.map((file) => file.target).join(", ")}`);
  }
  console.log("");
  console.log(`Configured adapters: ${resolveAdaptersOrFail({}, config).join(", ")}`);
}

function resolveAdaptersOrFail(flags, config) {
  try {
    return resolveAdapters(flags, config);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

function validateLanguageOrFail(language) {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    process.stderr.write(`Unknown language: ${language}. Use one of: ${SUPPORTED_LANGUAGES.join(", ")}\n`);
    process.exit(1);
  }
}

module.exports = {
  AGENT_RULE_FILES,
  init,
  copyTemplate,
  renderTemplate,
  templatePath,
  writeDefaultConfig,
  addPackageScripts,
  packageScriptRunner,
  installAdapters,
  adaptersDoctor,
  resolveAdaptersOrFail,
  validateLanguageOrFail,
};
