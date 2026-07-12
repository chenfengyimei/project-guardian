"use strict";

const fs = require("fs");
const path = require("path");
const { loadConfig } = require("./config");
const { normalizeForHook, writeFile } = require("./shared");

function installHooks(root, guardianScript) {
  const config = loadConfig(root);
  const gitDir = path.join(root, ".git");
  if (!fs.existsSync(gitDir)) {
    process.stderr.write("No .git directory found. Initialize git before installing hooks.\n");
    process.exit(1);
  }
  const hookPath = path.join(gitDir, "hooks", "pre-commit");
  const scriptPath = normalizeForHook(path.relative(root, guardianScript));
  const markerStart = "# >>> Project Guardian";
  const markerEnd = "# <<< Project Guardian";
  const commands = [`node "${scriptPath}" check`];
  if (config.hooks.runValidateDocs) {
    commands.push(`node "${scriptPath}" validate-docs`);
  }
  if (config.security.scanSecrets) {
    commands.push(`node "${scriptPath}" scan-secrets`);
  }
  const block = [markerStart, "# Installed by Project Guardian.", ...commands, markerEnd, ""].join("\n");
  const body = `#!/bin/sh\n${block}`;

  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, "utf8");
    if (existing.includes(markerStart)) {
      console.log("Project Guardian hook is already installed.");
      return;
    }
    writeFile(hookPath, `${existing.replace(/\s*$/, "")}\n\n${block}`);
  } else {
    writeFile(hookPath, body);
  }
  try {
    fs.chmodSync(hookPath, 0o755);
  } catch (_) {
    // Windows may ignore POSIX modes.
  }
  console.log("Installed .git/hooks/pre-commit.");
}

function installCi(root) {
  const config = loadConfig(root);
  const commands = [
    "node plugins/project-guardian/scripts/guardian.js check",
    "node plugins/project-guardian/scripts/guardian.js validate-docs",
  ];
  if (config.security.scanSecrets) {
    commands.push("node plugins/project-guardian/scripts/guardian.js scan-secrets");
  }
  const content = [
    "name: project-guardian",
    "displayName: Project Guardian Memory Check",
    "triggers:",
    "  push:",
    "    - matchType: PRECISE",
    `      branch: ${config.ci.defaultBranch}`,
    'commitMessage: ""',
    "stages:",
    "  - stage:",
    "      name: project_guardian",
    "      displayName: Project Guardian",
    "      failFast: false",
    "      steps:",
    "        - step: npmbuild@1",
    "          name: guardian_check",
    "          displayName: Check project memory",
    "          inputs:",
    `            nodeVersion: ${config.ci.nodeVersion}`,
    "            goals: |",
    ...commands.map((command) => `              ${command}`),
    "",
  ].join("\n");
  writeFile(path.join(root, ".workflow", "project-guardian.yml"), content);
  console.log("Installed .workflow/project-guardian.yml.");
  console.log("Review branch triggers before enabling it in Gitee Go.");
}

module.exports = {
  installHooks,
  installCi,
};
