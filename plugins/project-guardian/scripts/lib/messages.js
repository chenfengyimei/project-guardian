"use strict";

/**
 * Lightweight i18n message registry.
 * Provides t(key, ...args) that selects messages by language.
 * Keep messages minimal — only for CLI user-facing output.
 */

const MESSAGES = {
  "zh-CN": {
    "init.done": "Project Guardian 项目记忆已初始化。",
    "init.next": "下一步：补齐 memory/ 下的项目记忆文件，然后在提交前运行 `guardian verify`。",
    "update.done": "提交前请把待填写字段补充完整。",
    "memory.missing": "Project Guardian memory is missing: {0}\nRun: guardian init",
    "verify.failed": "Project Guardian verify failed.",
    "verify.passed": "Project Guardian verify passed.",
    "check.passed": "Project Guardian check passed for {0} changes.",
    "check.failed": "Project Guardian check failed.",
    "doc.passed": "\nDocument validation passed.",
    "doc.failed": "\nDocument validation failed.",
    "secret.none": "No likely secrets found.",
    "review.passed": "\nDecision review check passed.",
    "review.failed": "\nDecision review check failed.",
    "review.none": "No scheduled decision reviews found.",
    "conflict.none": "No merge conflicts detected.",
    "conflict.detected": "No project memory files are conflicted. Resolve code conflicts, then update memory if behavior changes.",
    "hook.installed": "Installed .git/hooks/pre-commit.",
    "hook.exists": "Project Guardian hook is already installed.",
    "hook.nogit": "No .git directory found. Initialize git before installing hooks.",
    "ci.installed": "Installed .workflow/project-guardian.yml.",
    "ci.review": "Review branch triggers before enabling it in Gitee Go.",
    "append.done": "Appended memory to {0}.",
    "append.missing": "Missing memory file. Use: guardian append-memory --file STATE --template state-progress",
    "decision.unknown": "Unknown decision command. Use: guardian decision add --title \"Decision title\"",
    "reviews.unknown": "Unknown reviews command. Use: guardian reviews, guardian reviews due, or guardian reviews complete <decision-file>",
    "adapters.unknown": "Unknown adapters command. Use: guardian adapters doctor",
    "cmd.unknown": "Unknown command: {0}\nRun: node {1} help",
    "brief.mode.invalid": "brief --mode must be one of: {0}",
    "query.limit.invalid": "query --limit must be an integer from 1 to {0}",
    "cli.source": "Project Guardian CLI 手动追加。",
    "cli.title": "CLI 手动记录",
  },
  "en": {
    "init.done": "Project Guardian memory initialized.",
    "init.next": "Next: fill the project memory files under memory/ and run `guardian verify` before committing.",
    "update.done": "Please replace TODO fields before committing.",
    "memory.missing": "Project Guardian memory is missing: {0}\nRun: guardian init",
    "verify.failed": "Project Guardian verify failed.",
    "verify.passed": "Project Guardian verify passed.",
    "check.passed": "Project Guardian check passed for {0} changes.",
    "check.failed": "Project Guardian check failed.",
    "doc.passed": "\nDocument validation passed.",
    "doc.failed": "\nDocument validation failed.",
    "secret.none": "No likely secrets found.",
    "review.passed": "\nDecision review check passed.",
    "review.failed": "\nDecision review check failed.",
    "review.none": "No scheduled decision reviews found.",
    "conflict.none": "No merge conflicts detected.",
    "conflict.detected": "No project memory files are conflicted. Resolve code conflicts, then update memory if behavior changes.",
    "hook.installed": "Installed .git/hooks/pre-commit.",
    "hook.exists": "Project Guardian hook is already installed.",
    "hook.nogit": "No .git directory found. Initialize git before installing hooks.",
    "ci.installed": "Installed .workflow/project-guardian.yml.",
    "ci.review": "Review branch triggers before enabling it in Gitee Go.",
    "append.done": "Appended memory to {0}.",
    "append.missing": "Missing memory file. Use: guardian append-memory --file STATE --template state-progress",
    "decision.unknown": "Unknown decision command. Use: guardian decision add --title \"Decision title\"",
    "reviews.unknown": "Unknown reviews command. Use: guardian reviews, guardian reviews due, or guardian reviews complete <decision-file>",
    "adapters.unknown": "Unknown adapters command. Use: guardian adapters doctor",
    "cmd.unknown": "Unknown command: {0}\nRun: node {1} help",
    "brief.mode.invalid": "brief --mode must be one of: {0}",
    "query.limit.invalid": "query --limit must be an integer from 1 to {0}",
    "cli.source": "Project Guardian CLI manual append.",
    "cli.title": "CLI manual note",
  },
};

let _language = "zh-CN";

function setLanguage(lang) {
  _language = MESSAGES[lang] ? lang : "zh-CN";
}

function t(key, ...args) {
  const table = MESSAGES[_language] || MESSAGES["zh-CN"];
  let msg = table[key] || MESSAGES["zh-CN"][key] || key;
  for (let i = 0; i < args.length; i += 1) {
    msg = msg.replace(`{${i}}`, String(args[i]));
  }
  return msg;
}

module.exports = { setLanguage, t, MESSAGES };
