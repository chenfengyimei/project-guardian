"use strict";

const fs = require("fs");
const path = require("path");
const { CONFIG_FILE, DEFAULT_CONFIG, loadConfig, mergeConfig, clone } = require("./config");
const { getCoreMemoryFiles, fail, writeFile } = require("./shared");

function migrateMemory(root) {
  const config = loadConfig(root);
  const memoryFiles = config.memoryFiles || config.memory;

  if (!memoryFiles) {
    fail("No memoryFiles configuration found. Run: guardian init");
  }

  const targetDir = "memory";
  const targetPrefix = `${targetDir}/`;
  const alreadyMigrated = Object.values(memoryFiles).every(
    (file) => typeof file !== "string" || file.startsWith(targetPrefix) || file === targetDir
  );

  if (alreadyMigrated) {
    console.log("Memory files are already under memory/. Nothing to migrate.");
    return;
  }

  // Create target directory
  const targetPath = path.join(root, targetDir);
  fs.mkdirSync(targetPath, { recursive: true });

  const updates = {};
  const moved = [];

  for (const [key, file] of Object.entries(memoryFiles)) {
    if (typeof file !== "string" || file.startsWith(targetPrefix)) {
      updates[key] = file;
      continue;
    }

    const sourcePath = path.join(root, file);
    const basename = path.basename(file);
    const newPath = `${targetDir}/${basename}`;
    const destPath = path.join(root, newPath);

    if (fs.existsSync(sourcePath)) {
      // Read content and write to new location, then delete old
      const content = fs.readFileSync(sourcePath, "utf8");
      writeFile(destPath, content);
      fs.unlinkSync(sourcePath);
      moved.push(`${file} -> ${newPath}`);
    }

    updates[key] = newPath;
  }

  // Update config file
  const configPath = path.join(root, CONFIG_FILE);
  if (fs.existsSync(configPath)) {
    const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    rawConfig.memoryFiles = updates;
    writeFile(configPath, `${JSON.stringify(rawConfig, null, 2)}\n`);
  }

  if (moved.length > 0) {
    console.log(`Migrated ${moved.length} file(s) to ${targetDir}/:`);
    for (const move of moved) console.log(`  ${move}`);
  } else {
    console.log("No files needed moving. Config updated to use memory/ paths.");
  }

  console.log("Run `guardian verify` to confirm the migration.");
}

module.exports = { migrateMemory };
