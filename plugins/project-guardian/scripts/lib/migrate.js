"use strict";

const fs = require("fs");
const path = require("path");
const { CONFIG_FILE, loadConfig, validateConfig } = require("./config");
const { fail, parseFlags, writeFile } = require("./shared");

function migrateMemory(root, args = []) {
  const flags = parseFlags(args);
  const dryRun = Boolean(flags["dry-run"]);
  const configPath = path.join(root, CONFIG_FILE);
  if (!fs.existsSync(configPath)) fail(`Missing ${CONFIG_FILE}. Run: guardian init`);

  const originalConfigText = fs.readFileSync(configPath, "utf8");
  let rawConfig;
  try {
    rawConfig = JSON.parse(originalConfigText);
  } catch (error) {
    fail(`Cannot migrate memory with invalid ${CONFIG_FILE}: ${error.message}`);
  }

  const config = loadConfig(root);
  const configIssues = validateConfig(config);
  if (configIssues.length > 0) {
    fail(`Cannot migrate memory until configuration issues are fixed:\n- ${configIssues.join("\n- ")}`);
  }
  const usesLegacyMemoryKey = !rawConfig.memoryFiles && Boolean(rawConfig.memory);
  const memoryFiles = rawConfig.memoryFiles || rawConfig.memory || config.memoryFiles || config.memory;
  if (!memoryFiles) fail("No memoryFiles configuration found. Run: guardian init");

  const plan = buildMigrationPlan(root, memoryFiles);
  plan.configKeyMigration = usesLegacyMemoryKey;
  if (usesLegacyMemoryKey) plan.alreadyMigrated = false;
  printMigrationPlan(plan, dryRun);
  if (plan.alreadyMigrated) return plan;
  if (plan.conflicts.length > 0) {
    fail("Memory migration stopped before writing because destination conflicts must be resolved manually.");
  }
  if (dryRun) return plan;

  const completedMoves = [];
  try {
    for (const action of plan.actions) {
      if (action.kind !== "move") continue;
      fs.mkdirSync(path.dirname(action.destinationAbsolute), { recursive: true });
      fs.renameSync(action.sourceAbsolute, action.destinationAbsolute);
      completedMoves.push(action);
    }
    rawConfig.memoryFiles = plan.updates;
    if (usesLegacyMemoryKey) delete rawConfig.memory;
    writeFile(configPath, `${JSON.stringify(rawConfig, null, 2)}\n`);
  } catch (error) {
    for (const action of completedMoves.reverse()) {
      try {
        if (fs.existsSync(action.destinationAbsolute) && !fs.existsSync(action.sourceAbsolute)) {
          fs.mkdirSync(path.dirname(action.sourceAbsolute), { recursive: true });
          fs.renameSync(action.destinationAbsolute, action.sourceAbsolute);
        }
      } catch (_) {}
    }
    try { writeFile(configPath, originalConfigText); } catch (_) {}
    fail(`Memory migration failed and completed moves were rolled back: ${error.message}`);
  }

  const moved = plan.actions.filter((action) => action.kind === "move");
  if (moved.length > 0) {
    console.log(`\nMigrated ${moved.length} path(s):`);
    for (const action of moved) console.log(`  ${action.source} -> ${action.destination}`);
  } else {
    console.log("\nNo existing paths needed moving. Config was updated to use memory/ paths.");
  }
  console.log("Run `guardian verify` to confirm the migration.");
  return plan;
}

function buildMigrationPlan(root, memoryFiles) {
  const updates = {};
  const actions = [];
  const conflicts = [];
  const destinations = new Map();

  for (const [key, value] of Object.entries(memoryFiles || {})) {
    if (typeof value !== "string") {
      updates[key] = value;
      continue;
    }
    const source = normalizeRelative(value);
    if (source === "memory" || source.startsWith("memory/")) {
      updates[key] = source;
      continue;
    }

    const destination = key === "decisionsDirectory"
      ? "memory/decisions"
      : `memory/${path.posix.basename(source)}`;
    updates[key] = destination;

    if (destinations.has(destination) && destinations.get(destination) !== source) {
      conflicts.push(`${source} and ${destinations.get(destination)} both map to ${destination}`);
      continue;
    }
    destinations.set(destination, source);

    const sourceAbsolute = insideRoot(root, source);
    const destinationAbsolute = insideRoot(root, destination);
    const sourceExists = fs.existsSync(sourceAbsolute);
    const destinationExists = fs.existsSync(destinationAbsolute);
    if (!sourceExists && destinationExists) {
      actions.push({ key, kind: "adopt", source, destination, sourceAbsolute, destinationAbsolute });
      continue;
    }
    if (!sourceExists) {
      conflicts.push(`${source} is missing and ${destination} does not exist`);
      actions.push({ key, kind: "missing", source, destination, sourceAbsolute, destinationAbsolute });
      continue;
    }
    if (destinationExists) {
      conflicts.push(`${source} cannot move to existing ${destination}`);
      actions.push({ key, kind: "conflict", source, destination, sourceAbsolute, destinationAbsolute });
      continue;
    }
    const kind = fs.statSync(sourceAbsolute).isDirectory() ? "directory" : "file";
    actions.push({ key, kind: "move", source, destination, sourceAbsolute, destinationAbsolute, entryType: kind });
  }

  const alreadyMigrated = actions.length === 0 && conflicts.length === 0
    && Object.entries(memoryFiles || {}).every(([key, value]) => updates[key] === value);
  return { actions, conflicts, updates, alreadyMigrated };
}

function printMigrationPlan(plan, dryRun) {
  console.log("Project Guardian memory migration");
  console.log("");
  if (plan.alreadyMigrated) {
    console.log("Memory files are already under memory/. Nothing to migrate.");
    return;
  }
  if (plan.configKeyMigration) console.log("CONFIG  legacy memory key -> memoryFiles");
  for (const action of plan.actions) {
    if (action.kind === "move") console.log(`MOVE    ${action.source} -> ${action.destination} (${action.entryType})`);
    if (action.kind === "adopt") console.log(`ADOPT   ${action.destination}; legacy source ${action.source} is already absent`);
    if (action.kind === "missing") console.log(`MISSING ${action.source}; destination ${action.destination} is also absent`);
    if (action.kind === "conflict") console.log(`CONFLICT ${action.source} -> ${action.destination}`);
  }
  for (const conflict of plan.conflicts) console.log(`CONFLICT ${conflict}`);
  if (dryRun) console.log("\nDry run only. No files or configuration were changed.");
}

function normalizeRelative(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function insideRoot(root, relative) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relative);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    fail(`Memory path must stay inside the project: ${relative}`);
  }
  return resolved;
}

module.exports = { buildMigrationPlan, migrateMemory, normalizeRelative };
