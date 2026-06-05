"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".php",
  ".rb",
  ".cs",
  ".html",
  ".css",
  ".scss",
  ".vue",
  ".svelte",
  ".json",
  ".yaml",
  ".yml",
  ".md",
]);

function git(root, args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch (_) {
    return "";
  }
}

function collectFiles(root, config, limit = 80) {
  const tracked = lines(git(root, ["ls-files"]));
  const untracked = lines(git(root, ["ls-files", "--others", "--exclude-standard"]));
  const files = tracked.length > 0 ? unique([...tracked, ...untracked]) : walk(root).map((file) => relative(root, file));
  const ignored = loadIgnorePatterns(root, config);
  return files
    .filter((file) => {
      if (isIgnored(file, ignored)) return false;
      if (file.startsWith("plugins/project-guardian/")) return false;
      if (file.startsWith(".git/") || file.includes("/node_modules/")) return false;
      return SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase());
    })
    .slice(0, limit)
    .map((file) => file.replace(/\\/g, "/"));
}

function gitChangeSummary(root) {
  const staged = git(root, ["diff", "--cached", "--stat"]) || "No staged changes.";
  const unstaged = git(root, ["diff", "--stat"]) || "No unstaged changes.";
  return `Staged changes:\n${staged}\n\nUnstaged changes:\n${unstaged}`;
}

function changedFilesForUpdate(root) {
  return unique([
    ...lines(git(root, ["diff", "--cached", "--name-only"])),
    ...lines(git(root, ["diff", "--name-only"])),
    ...lines(git(root, ["ls-files", "--others", "--exclude-standard"])),
  ]);
}

function changedLineRanges(root) {
  const diff = git(root, ["diff", "--cached", "--unified=0"]) || git(root, ["diff", "--unified=0"]);
  const ranges = [];
  let currentFile = "";
  for (const line of diff.split(/\r?\n/)) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunkMatch && currentFile) {
      const start = Number(hunkMatch[1]);
      const length = Number(hunkMatch[2] || "1");
      const end = Math.max(start, start + length - 1);
      ranges.push(`${currentFile}:${start}${end === start ? "" : `-${end}`}`);
    }
  }
  return ranges;
}

function getChangeSets(root) {
  return {
    staged: lines(git(root, ["diff", "--cached", "--name-only"])),
    working: lines(git(root, ["diff", "--name-only"])),
    untracked: lines(git(root, ["ls-files", "--others", "--exclude-standard"])),
  };
}

function loadIgnorePatterns(root, config) {
  const filePatterns = fs.existsSync(path.join(root, ".guardianignore"))
    ? fs.readFileSync(path.join(root, ".guardianignore"), "utf8").split(/\r?\n/)
    : [];
  return [...(config.ignore || []), ...filePatterns]
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function isIgnored(file, patterns) {
  const normalized = file.replace(/\\/g, "/");
  return patterns.some((pattern) => {
    const clean = pattern.replace(/\\/g, "/");
    return clean.endsWith("/") ? normalized.startsWith(clean) : normalized === clean || normalized.startsWith(`${clean}/`);
  });
}

function walk(root, current = root, collected = []) {
  if (!fs.existsSync(current)) return collected;
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if ([".git", "node_modules", ".project-guardian", "dist", "build", ".next", "coverage"].includes(entry.name)) continue;
      walk(root, full, collected);
    } else {
      collected.push(full);
    }
  }
  return collected;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function lines(value) {
  return value ? value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : [];
}

function relative(root, file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

module.exports = {
  changedFilesForUpdate,
  changedLineRanges,
  collectFiles,
  getChangeSets,
  git,
  gitChangeSummary,
  isIgnored,
  lines,
  loadIgnorePatterns,
  unique,
};
