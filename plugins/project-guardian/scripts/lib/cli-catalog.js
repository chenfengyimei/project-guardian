"use strict";

const { publicMemoryAppendTemplates } = require("./manual-memory");

const text = (zh, en) => ({ zh, en });
const option = (names, value, description, options = {}) => ({
  names: Array.isArray(names) ? names : [names],
  value,
  description,
  maxLength: options.maxLength || 0,
  missingValueMessage: options.missingValueMessage || "",
});
const command = (key, usage, description, options = {}) => ({
  key,
  tokens: key.split(" "),
  usage: Array.isArray(usage) ? usage : [usage],
  description,
  options: options.options || [],
  minPositionals: options.minPositionals || 0,
  maxPositionals: options.maxPositionals === undefined ? 0 : options.maxPositionals,
  maxPositionalLength: options.maxPositionalLength || 0,
  mutates: Boolean(options.mutates),
  hidden: Boolean(options.hidden),
});

const manualFieldNames = [...new Set(publicMemoryAppendTemplates()
  .flatMap((template) => template.fields.map((field) => field.name)))]
  .filter((name) => !["file", "name", "target", "template", "content", "templates"].includes(name));

const COMMAND_SPECS = [
  command("init", "guardian init [--language zh-CN|en] [--adapter <list>]", text("初始化项目记忆、配置和 AI 规则。", "Initialize project memory, config, and AI rules."), {
    options: [
      option(["language", "lang"], true, text("模板语言。", "Template language."), { maxLength: 16 }),
      option(["adapter", "adapters"], true, text("逗号分隔的 AI 适配器或 all。", "Comma-separated AI adapters or all."), { maxLength: 240 }),
    ],
    mutates: true,
  }),
  command("update", "guardian update <task summary> [options]", text("记录 AI 协助变更并刷新项目状态。", "Record an AI-assisted change and refresh project state."), {
    minPositionals: 1,
    maxPositionals: Infinity,
    maxPositionalLength: 500,
    options: [
      option("summary", true, text("改了什么。", "What changed."), { maxLength: 4000 }),
      option(["reason", "business-reason"], true, text("为什么修改。", "Why it changed."), { maxLength: 4000 }),
      option("verification", true, text("验证命令或人工检查。", "Verification commands or checks."), { maxLength: 4000 }),
      option(["risks", "risk"], true, text("剩余风险。", "Remaining risks."), { maxLength: 4000 }),
      option(["sensitive-data", "sensitiveData", "sensitive"], true, text("敏感信息检查结论。", "Sensitive-data check result."), { maxLength: 2000 }),
      option(["next-step", "nextStep", "follow-up", "followUp"], true, text("下一步。", "Next step."), { maxLength: 4000 }),
    ],
    mutates: true,
  }),
  command("append-memory", [
    "guardian append-memory --templates [--file <memory>]",
    "guardian append-memory --file <memory> [--template <id>] [template fields]",
  ], text("使用受保护模板追加项目记忆。", "Append project memory through guarded templates."), {
    options: [
      option(["file", "name", "target"], true, text("核心记忆名称。", "Core memory name."), { maxLength: 80 }),
      option("template", true, text("追加模板 ID。", "Append template id."), { maxLength: 80 }),
      option("content", true, text("自定义完整记录。", "Custom complete note."), { maxLength: 16000 }),
      option("templates", false, text("列出可用模板。", "List available templates.")),
      ...manualFieldNames.map((name) => option(name, true, text("模板字段。", "Template field."), { maxLength: 16000 })),
    ],
    mutates: true,
  }),
  command("decision add", "guardian decision add [title] --context <text> --decision <text> [options]", text("新增结构化决策和独立事实源文件。", "Add a structured decision and source file."), {
    minPositionals: 0,
    maxPositionals: Infinity,
    maxPositionalLength: 160,
    options: [
      option("title", true, text("决策标题。", "Decision title."), { maxLength: 160 }),
      option("date", true, text("YYYY-MM-DD 日期。", "YYYY-MM-DD date.")),
      option("context", true, text("决策背景。", "Decision context."), { maxLength: 4000 }),
      option("decision", true, text("最终决策。", "Decision."), { maxLength: 4000 }),
      option("alternatives", true, text("备选方案。", "Alternatives considered."), { maxLength: 4000 }),
      option("files", true, text("影响文件或模块。", "Affected files or modules."), { maxLength: 2000 }),
      option(["related-change", "relatedChange"], true, text("关联变更。", "Related change."), { maxLength: 2000 }),
      option("verification", true, text("验证方式。", "Verification."), { maxLength: 4000 }),
      option("risks", true, text("风险。", "Risks."), { maxLength: 4000 }),
      option(["review-after", "reviewAfter"], true, text("复审日期。", "Review date.")),
      option(["follow-up", "followUp"], true, text("后续动作。", "Follow-up."), { maxLength: 4000 }),
    ],
    mutates: true,
  }),
  command("reviews", "guardian reviews", text("列出决策复审。", "List decision reviews.")),
  command("reviews list", "guardian reviews list", text("列出决策复审。", "List decision reviews.")),
  command("reviews status", "guardian reviews status", text("列出决策复审状态。", "List decision review status.")),
  command("reviews due", "guardian reviews due", text("检查到期复审；存在到期项时失败。", "Check due reviews and fail when any are due.")),
  command("reviews complete", "guardian reviews complete <decision-file> [options]", text("标记一项复审完成。", "Mark a decision review completed."), {
    minPositionals: 1,
    maxPositionals: 1,
    options: [
      option(["reviewer", "by"], true, text("复审人。", "Reviewer."), { maxLength: 160 }),
      option(["summary", "result"], true, text("复审结论。", "Review summary."), { maxLength: 4000 }),
      option("verification", true, text("复审验证。", "Review verification."), { maxLength: 4000 }),
    ],
    mutates: true,
  }),
  command("handover", "guardian handover", text("重新生成交接指南。", "Regenerate the handover guide."), { mutates: true }),
  command("check", "guardian check", text("检查代码变更是否带有有效记忆更新。", "Check that code changes include valid memory updates.")),
  command("doctor", "guardian doctor", text("检查配置、记忆、AI 规则和 Git 状态。", "Audit config, memory, AI rules, and Git state.")),
  command("validate-docs", "guardian validate-docs", text("验证项目记忆质量与完整性。", "Validate project-memory quality and integrity.")),
  command("scan-secrets", "guardian scan-secrets", text("扫描记忆中的疑似敏感值并脱敏输出。", "Scan memory for likely secrets with redacted output.")),
  command("verify", "guardian verify", text("运行完整本地质量闸门。", "Run the complete local quality gate.")),
  command("brief", "guardian brief [question] [--mode auto|quick|deep|full] [--limit 1..10]", text("生成预算友好的记忆读取计划。", "Build a budget-aware memory reading plan."), {
    minPositionals: 0,
    maxPositionals: Infinity,
    maxPositionalLength: 4000,
    options: [
      option("mode", true, text("读取深度。", "Reading depth."), {
        maxLength: 16,
        missingValueMessage: "brief --mode must be one of: auto, quick, deep, full",
      }),
      option("limit", true, text("建议返回片段数。", "Suggested result count."), { maxLength: 2 }),
    ],
  }),
  command("query", "guardian query [question] [--limit 1..10]", text("查询项目记忆、源码和 Git 历史。", "Search project memory, source, and Git history."), {
    minPositionals: 0,
    maxPositionals: Infinity,
    maxPositionalLength: 4000,
    options: [option("limit", true, text("返回片段数。", "Result count."), { maxLength: 2 })],
  }),
  command("conflicts", "guardian conflicts", text("报告 Git 与项目记忆冲突。", "Report Git and project-memory conflicts.")),
  command("install-adapters", "guardian install-adapters [--adapter <list>]", text("安装 AI IDE 规则适配器。", "Install AI IDE rule adapters."), {
    options: [option(["adapter", "adapters"], true, text("逗号分隔的适配器或 all。", "Comma-separated adapters or all."), { maxLength: 240 })],
    mutates: true,
  }),
  command("adapters doctor", "guardian adapters doctor", text("检查 AI IDE 适配器状态。", "Check AI IDE adapter status.")),
  command("mcp", "guardian mcp", text("启动 stdio MCP server。", "Start the stdio MCP server.")),
  command("install-hooks", "guardian install-hooks", text("安装追加式 pre-commit 检查。", "Install the additive pre-commit checks."), { mutates: true }),
  command("install-ci", "guardian install-ci", text("生成 Gitee Go 工作流。", "Generate the Gitee Go workflow."), { mutates: true }),
  command("migrate-memory", ["guardian migrate-memory", "guardian migrate-memory --dry-run"], text("安全迁移旧记忆路径；--dry-run 只预览。", "Safely migrate legacy memory paths; --dry-run previews only."), {
    options: [option("dry-run", false, text("只输出迁移计划。", "Print the migration plan without writing."))],
    mutates: true,
  }),
  command("repair-memory", ["guardian repair-memory", "guardian repair-memory --write"], text("检查或确定性修复记忆顺序与决策索引。", "Check or deterministically repair memory order and the decision index."), {
    options: [
      option(["write", "apply"], false, text("应用修复。", "Apply repairs.")),
    ],
    mutates: true,
  }),
  command("commands", ["guardian commands", "guardian commands --json"], text("列出稳定 CLI 契约；--json 便于工具集成。", "List the stable CLI contract; --json supports tool integration."), {
    options: [option("json", false, text("输出 JSON。", "Output JSON."))],
  }),
  command("version", "guardian --version", text("输出插件版本。", "Print the plugin version.")),
];

const COMMAND_MAP = new Map(COMMAND_SPECS.map((spec) => [spec.key, spec]));
const PARENT_HELP = new Map([
  ["decision", "decision add"],
  ["adapters", "adapters doctor"],
  ["review", "reviews"],
]);

function normalizeArgv(argv) {
  const values = [...argv];
  if (values[0] === "decision-add") values.splice(0, 1, "decision", "add");
  if (values[0] === "review") values[0] = "reviews";
  if (["--version", "-v"].includes(values[0])) values[0] = "version";
  return values;
}

function resolveInvocation(argv) {
  const values = normalizeArgv(argv);
  const candidates = COMMAND_SPECS
    .filter((spec) => spec.tokens.every((token, index) => values[index] === token))
    .sort((left, right) => right.tokens.length - left.tokens.length);
  const spec = candidates[0];
  if (!spec) return null;
  return { spec, args: values.slice(spec.tokens.length), argv: values };
}

function resolveHelpRequest(argv) {
  const values = normalizeArgv(argv);
  if (values.length === 0) return { requested: true, key: "" };
  if (["help", "--help", "-h"].includes(values[0])) {
    const target = values.slice(1).filter((arg) => !["--help", "-h"].includes(arg)).join(" ").trim();
    if (!target) return { requested: true, key: "" };
    if (PARENT_HELP.has(target)) return { requested: true, key: PARENT_HELP.get(target) };
    const resolved = resolveInvocation(target.split(/\s+/));
    return { requested: true, key: resolved ? resolved.spec.key : target, invalid: !resolved };
  }
  const terminator = values.indexOf("--");
  const helpIndex = values.findIndex((arg, index) => ["--help", "-h"].includes(arg) && (terminator === -1 || index < terminator));
  if (helpIndex === -1) return { requested: false, key: "" };
  const withoutHelp = values.filter((_, index) => index !== helpIndex);
  const resolved = resolveInvocation(withoutHelp);
  return { requested: true, key: resolved ? resolved.spec.key : withoutHelp.join(" "), invalid: !resolved };
}

function validateInvocation(invocation) {
  const { spec, args } = invocation;
  const options = new Map();
  for (const definition of spec.options) {
    for (const name of definition.names) options.set(name, definition);
  }
  const seen = new Set();
  const positionals = [];
  let terminated = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!terminated && arg === "--") {
      terminated = true;
      continue;
    }
    if (terminated || !arg.startsWith("-")) {
      positionals.push(arg);
      continue;
    }
    if (!arg.startsWith("--")) throw usageError(`Unknown option: ${arg}`, spec);

    const equals = arg.indexOf("=");
    const name = arg.slice(2, equals === -1 ? undefined : equals);
    const inlineValue = equals === -1 ? undefined : arg.slice(equals + 1);
    const definition = options.get(name);
    if (!definition) {
      const suggestion = closest(name, [...options.keys()]);
      const suffix = suggestion ? ` Did you mean --${suggestion}?` : "";
      throw usageError(`Unknown option for ${spec.key}: --${name}.${suffix}`, spec);
    }
    const canonical = definition.names[0];
    if (seen.has(canonical)) throw usageError(`Option may only be provided once: --${canonical}`, spec);
    seen.add(canonical);

    if (!definition.value) {
      if (inlineValue !== undefined) throw usageError(`Option --${name} does not accept a value.`, spec);
      continue;
    }
    let value = inlineValue;
    if (value === undefined) {
      value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw usageError(definition.missingValueMessage || `Option --${name} requires a value.`, spec);
      }
      index += 1;
    }
    if (!String(value).trim()) throw usageError(`Option --${name} requires a non-empty value.`, spec);
    if (definition.maxLength && String(value).length > definition.maxLength) {
      throw usageError(`Option --${name} must be ${definition.maxLength} characters or fewer.`, spec);
    }
  }

  if (positionals.length < spec.minPositionals) throw usageError(`Missing required argument for ${spec.key}.`, spec);
  if (positionals.length > spec.maxPositionals) {
    throw usageError(`Unexpected argument for ${spec.key}: ${positionals[spec.maxPositionals]}`, spec);
  }
  const positionalText = positionals.join(" ");
  if (spec.maxPositionalLength && positionalText.length > spec.maxPositionalLength) {
    throw usageError(`Positional input for ${spec.key} must be ${spec.maxPositionalLength} characters or fewer.`, spec);
  }
  if (spec.key === "decision add" && positionals.length > 0 && seen.has("title")) {
    throw usageError("Decision title must be provided either positionally or with --title, not both.", spec);
  }
  return { positionals, seen };
}

function usageError(message, spec) {
  const error = new Error(`${message}\nUse: ${spec.usage[0]}\nRun: guardian help ${spec.key}`);
  error.exitCode = 2;
  return error;
}

function unknownCommandError(argv) {
  const normalized = normalizeArgv(argv);
  const input = normalized.slice(0, 2).join(" ").trim() || String(normalized[0] || "");
  const suggestion = closest(input, COMMAND_SPECS.map((spec) => spec.key));
  const suffix = suggestion ? `\nDid you mean: guardian ${suggestion}` : "";
  const error = new Error(`Unknown command: ${input || "(empty)"}${suffix}\nRun: guardian help`);
  error.exitCode = 2;
  return error;
}

function formatHelp(key = "", language = "zh-CN") {
  const chinese = language === "zh-CN";
  if (key) {
    const spec = COMMAND_MAP.get(key);
    if (!spec) return "";
    const output = [
      `Project Guardian - ${spec.key}`,
      "",
      chinese ? local(spec.description, true) : local(spec.description, false),
      "",
      chinese ? "用法：" : "Usage:",
      ...spec.usage.map((usage) => `  ${usage}`),
    ];
    if (spec.options.length > 0) {
      output.push("", chinese ? "选项：" : "Options:");
      for (const definition of spec.options) {
        const names = definition.names.map((name) => `--${name}`).join(", ");
        output.push(`  ${names}${definition.value ? " <value>" : ""}`);
        output.push(`      ${local(definition.description, chinese)}`);
      }
    }
    output.push("", "  -h, --help", `      ${chinese ? "显示当前命令帮助。" : "Show help for this command."}`, "");
    return output.join("\n");
  }

  const visible = COMMAND_SPECS.filter((spec) => !spec.hidden && !["version", "reviews list", "reviews status"].includes(spec.key));
  const output = [
    "Project Guardian",
    "",
    chinese ? "可靠、零服务的项目记忆 CLI。" : "A reliable, zero-service project-memory CLI.",
    "",
    chinese ? "用法：" : "Usage:",
    "  guardian <command> [options]",
    "  guardian help <command>",
    "  guardian commands --json",
    "",
    chinese ? "命令：" : "Commands:",
  ];
  const width = Math.max(...visible.map((spec) => spec.key.length));
  for (const spec of visible) output.push(`  ${spec.key.padEnd(width)}  ${local(spec.description, chinese)}`);
  output.push(
    "",
    chinese ? "全局选项：" : "Global options:",
    "  -h, --help     " + (chinese ? "显示总帮助或命令级帮助。" : "Show general or command-specific help."),
    "  -v, --version  " + (chinese ? "显示版本。" : "Show version."),
    "",
    chinese ? "示例：" : "Examples:",
    "  guardian help update",
    "  guardian update \"修复登录流程\" --summary \"完成修复\" --verification \"npm test\"",
    "  guardian verify",
    "  guardian-cmd list",
    "",
  );
  return output.join("\n");
}

function formatCommandList(language = "zh-CN") {
  const chinese = language === "zh-CN";
  return COMMAND_SPECS
    .filter((spec) => !spec.hidden)
    .map((spec) => `${spec.key}\t${local(spec.description, chinese)}`)
    .join("\n") + "\n";
}

function publicCommandCatalog(language = "zh-CN") {
  const chinese = language === "zh-CN";
  return COMMAND_SPECS.filter((spec) => !spec.hidden).map((spec) => ({
    command: spec.key,
    usage: [...spec.usage],
    description: local(spec.description, chinese),
    mutates: spec.mutates,
    options: spec.options.map((definition) => ({
      names: definition.names.map((name) => `--${name}`),
      takesValue: definition.value,
      description: local(definition.description, chinese),
    })),
  }));
}

function local(value, chinese) {
  return chinese ? value.zh : value.en;
}

function closest(input, candidates) {
  if (!input || candidates.length === 0) return "";
  const ranked = candidates.map((candidate) => ({ candidate, distance: editDistance(input, candidate) }))
    .sort((left, right) => left.distance - right.distance || left.candidate.localeCompare(right.candidate));
  const best = ranked[0];
  const threshold = Math.max(2, Math.floor(String(input).length / 3));
  return best.distance <= threshold ? best.candidate : "";
}

function editDistance(left, right) {
  const a = String(left);
  const b = String(right);
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

module.exports = {
  COMMAND_MAP,
  COMMAND_SPECS,
  closest,
  editDistance,
  formatCommandList,
  formatHelp,
  normalizeArgv,
  publicCommandCatalog,
  resolveHelpRequest,
  resolveInvocation,
  unknownCommandError,
  validateInvocation,
};
