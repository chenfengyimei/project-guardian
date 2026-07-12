"use strict";

const path = require("node:path");
const { containsLikelySecret } = require("./guardian-bridge");

const COMMAND_CONFIRMATION = "RUN_COMMAND";
const INSTALL_ADAPTERS = new Set([
  "generic",
  "codex",
  "cursor",
  "copilot",
  "windsurf",
  "cline",
  "continue",
  "claude",
  "gemini",
  "vscode",
  "vscode-copilot",
  "all",
]);

const COMMAND_DEFINITIONS = [
  readCommand("help", "Help 帮助", ["help"], "查看 Guardian CLI 帮助和全部命令。"),
  readCommand("version", "Version 版本", ["--version"], "查看当前 Project Guardian 版本。"),
  readCommand("doctor", "Doctor 体检", ["doctor"], "检查记忆文件、AI 规则、配置和 Git 变更状态。"),
  readCommand("check", "Check 变更关联", ["check"], "检查代码变更是否带有对应项目记忆更新。"),
  readCommand("validate-docs", "Validate Docs", ["validate-docs"], "检查项目记忆文档是否仍是空模板或低质量内容。"),
  readCommand("scan-secrets", "Scan Secrets", ["scan-secrets"], "扫描项目记忆中疑似密码、token、私钥等敏感信息。"),
  readCommand("verify", "Verify 全量检查", ["verify"], "运行 doctor、check、validate-docs、复审和安全扫描。"),
  readCommand("reviews", "Reviews 列表", ["reviews"], "列出所有已登记的决策复审。"),
  readCommand("reviews-due", "Reviews Due", ["reviews", "due"], "检查已到期但还未完成的决策复审。"),
  readCommand("conflicts", "Conflicts 冲突", ["conflicts"], "查看 Git 合并冲突和记忆文件冲突处理建议。"),
  readCommand("adapters-doctor", "Adapters Doctor", ["adapters", "doctor"], "检查各 AI IDE 适配器文件是否已安装。"),
  linkedCommand("init", "Init 初始化", "init", "使用插件初始化页面运行 guardian init。", "guardian init --language zh-CN"),
  linkedCommand("append-memory", "Append Memory", "append", "使用追加记忆页面按模板补充核心项目记忆。", "guardian append-memory --file STATE --template state-progress"),
  linkedCommand("brief", "Brief 读取计划", "brief", "使用读取计划页面生成预算友好的记忆读取计划。", "guardian brief \"任务\" --mode auto --limit 3"),
  linkedCommand("query", "Query 知识查询", "query", "使用知识查询页面查询项目记忆、源码和最近 Git 历史。", "guardian query \"问题\" --limit 3"),
  writeCommand("update", "Update 更新记忆", "追加 AI 协助变更记录，并刷新状态记忆。", "guardian update \"任务摘要\"", [
    textField("summary", "任务摘要", "例如：修复登录验证码校验"),
    textAreaField("changeSummary", "变更总结，可选", "改了什么以及为什么改"),
    textAreaField("reason", "业务原因，可选", "对应的需求、缺陷或规则"),
    textAreaField("verification", "验证方式，可选", "运行了哪些测试或人工检查"),
    textAreaField("risks", "风险，可选", "兼容性、数据、UI 或部署风险"),
    textAreaField("sensitiveData", "敏感信息检查，可选", "例如：已检查，未写入真实密钥"),
    textAreaField("nextStep", "下一步，可选", "下一个开发者需要做什么"),
  ], buildUpdateArgs),
  writeCommand("repair-memory", "Repair Memory", "同步决策索引并修复变更日志顺序。", "guardian repair-memory --write", [], () => ["repair-memory", "--write"]),
  writeCommand("handover", "Handover 生成交接", "根据当前记忆和项目文件重新生成交接指南。", "guardian handover", [], () => ["handover"]),
  writeCommand("decision-add", "Decision Add", "新增结构化决策记录。", "guardian decision add --title ... --context ... --decision ...", [
    textField("title", "标题", "例如：采用本地命令目录"),
    textField("date", "日期，可选", "YYYY-MM-DD"),
    textAreaField("context", "背景", "为什么需要这个决策"),
    textAreaField("decision", "决策", "最终决定是什么"),
    textAreaField("alternatives", "备选方案，可选", "考虑过哪些方案"),
    textField("files", "影响文件，可选", "例如：Run/server.js, Run/public/app.js"),
    textField("relatedChange", "关联变更，可选", "例如：Run CLI command catalog"),
    textAreaField("verification", "验证方式", "如何确认这个决策有效"),
    textAreaField("risks", "风险，可选", "这个决策可能带来的风险"),
    textField("reviewAfter", "复审日期，可选", "YYYY-MM-DD"),
    textAreaField("followUp", "后续动作，可选", "后续需要继续做什么"),
  ], buildDecisionAddArgs),
  writeCommand("reviews-complete", "Reviews Complete", "标记某个决策复审已完成。", "guardian reviews complete memory/decisions/example.md --summary ... --verification ...", [
    textField("file", "复审文件", "memory/decisions/example.md"),
    textAreaField("summary", "复审结论", "本次复审的结论"),
    textAreaField("verification", "验证方式", "检查了哪些文件、测试或风险"),
    textField("reviewer", "复审人，可选", "AI reviewer"),
  ], buildReviewCompleteArgs),
  writeCommand("install-adapters", "Install Adapters", "安装 AI IDE 规则适配器。", "guardian install-adapters --adapter all", [
    textField("adapter", "适配器", "all 或 cursor,copilot,windsurf"),
  ], (body) => ["install-adapters", "--adapter", validateAdapterList(body.adapter || "all")]),
  writeCommand("install-hooks", "Install Hooks", "安装本地 Git pre-commit 检查 hook。", "guardian install-hooks", [], () => ["install-hooks"]),
  writeCommand("install-ci", "Install CI", "生成 Gitee Go Project Guardian 工作流模板。", "guardian install-ci", [], () => ["install-ci"]),
  terminalCommand("mcp", "MCP Server", "启动 stdio MCP server，需要在终端或 AI IDE 配置中运行。", "guardian mcp"),
];

const COMMANDS = new Map(COMMAND_DEFINITIONS.map((command) => [command.id, command]));

class CommandValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

function commandBadRequest(message) {
  return new CommandValidationError(message);
}

function readCommand(id, label, args, description) {
  return {
    id,
    label,
    kind: "read",
    command: `guardian ${args.join(" ")}`,
    description,
    args,
    fields: [],
  };
}

function linkedCommand(id, label, view, description, command) {
  return {
    id,
    label,
    kind: "linked",
    view,
    command,
    description,
    fields: [],
  };
}

function writeCommand(id, label, description, command, fields, buildArgs) {
  return {
    id,
    label,
    kind: "write",
    command,
    description,
    confirmation: COMMAND_CONFIRMATION,
    fields,
    buildArgs,
  };
}

function terminalCommand(id, label, description, command) {
  return {
    id,
    label,
    kind: "terminal",
    command,
    description,
    fields: [],
  };
}

function textField(name, label, placeholder) {
  return { name, label, type: "text", placeholder };
}

function textAreaField(name, label, placeholder) {
  return { name, label, type: "textarea", placeholder };
}

function buildUpdateArgs(body) {
  const args = ["update", validateTextField(body.summary, "Task summary", 500)];
  addOptionalArg(args, "--summary", body.changeSummary, 4000);
  addOptionalArg(args, "--reason", body.reason, 4000);
  addOptionalArg(args, "--verification", body.verification, 4000);
  addOptionalArg(args, "--risks", body.risks, 4000);
  addOptionalArg(args, "--sensitive-data", body.sensitiveData, 2000);
  addOptionalArg(args, "--next-step", body.nextStep, 4000);
  return args;
}

function addOptionalArg(args, flag, value, maxLength) {
  const text = String(value || "").trim();
  if (text) args.push(flag, validateTextField(text, flag, maxLength));
}

function publicCommandDefinition(command) {
  return {
    id: command.id,
    label: command.label,
    kind: command.kind,
    command: command.command,
    description: command.description,
    view: command.view || null,
    confirmation: command.confirmation || null,
    fields: command.fields || [],
  };
}

function validateTextField(value, label, maxLength) {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!text) throw commandBadRequest(`${label} is required.`);
  if (text.length > maxLength) throw commandBadRequest(`${label} must be ${maxLength} characters or fewer.`);
  if (containsLikelySecret(text)) {
    throw commandBadRequest(`${label} looks like it may contain a password, token, API key, or other secret.`);
  }
  return text;
}

function validateOptionalTextField(value, label, maxLength) {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";
  if (text.length > maxLength) throw commandBadRequest(`${label} must be ${maxLength} characters or fewer.`);
  if (containsLikelySecret(text)) {
    throw commandBadRequest(`${label} looks like it may contain a password, token, API key, or other secret.`);
  }
  return text;
}

function validateOptionalDate(value, label) {
  const date = validateOptionalTextField(value, label, 20);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw commandBadRequest(`${label} must use YYYY-MM-DD.`);
  }
  return date;
}

function validateRelativeCliPath(value, label) {
  const text = validateTextField(value, label, 260).replace(/\\/g, "/");
  if (path.isAbsolute(text) || text.split("/").includes("..")) {
    throw commandBadRequest(`${label} must be a relative path inside the project.`);
  }
  return text;
}

function validateAdapterList(value) {
  const adapters = String(value || "all")
    .split(",")
    .map((adapter) => adapter.trim().toLowerCase())
    .filter(Boolean);
  const selected = adapters.length ? adapters : ["all"];
  if (selected.includes("all") && selected.length > 1) {
    throw commandBadRequest("Adapter all cannot be combined with other adapters.");
  }
  const unknown = selected.filter((adapter) => !INSTALL_ADAPTERS.has(adapter));
  if (unknown.length) {
    throw commandBadRequest(`Adapter must be one of: ${Array.from(INSTALL_ADAPTERS).join(", ")}.`);
  }
  return Array.from(new Set(selected)).join(",");
}

function buildDecisionAddArgs(body) {
  const args = [
    "decision",
    "add",
    "--title",
    validateTextField(body.title, "Decision title", 120),
    "--context",
    validateTextField(body.context, "Decision context", 1200),
    "--decision",
    validateTextField(body.decision, "Decision", 1200),
    "--verification",
    validateTextField(body.verification, "Verification", 800),
  ];
  const date = validateOptionalDate(body.date, "Decision date");
  if (date) args.push("--date", date);
  pushOptionalArg(args, "--alternatives", validateOptionalTextField(body.alternatives, "Alternatives", 1000));
  pushOptionalArg(args, "--files", validateOptionalTextField(body.files, "Affected files", 800));
  pushOptionalArg(args, "--related-change", validateOptionalTextField(body.relatedChange, "Related change", 500));
  pushOptionalArg(args, "--risks", validateOptionalTextField(body.risks, "Risks", 1000));
  const reviewAfter = validateOptionalDate(body.reviewAfter, "Review after");
  if (reviewAfter) args.push("--review-after", reviewAfter);
  pushOptionalArg(args, "--follow-up", validateOptionalTextField(body.followUp, "Follow-up", 1000));
  return args;
}

function buildReviewCompleteArgs(body) {
  const args = [
    "reviews",
    "complete",
    validateRelativeCliPath(body.file, "Review file"),
    "--summary",
    validateTextField(body.summary, "Review summary", 1000),
    "--verification",
    validateTextField(body.verification, "Review verification", 1000),
  ];
  const reviewer = validateOptionalTextField(body.reviewer, "Reviewer", 120);
  if (reviewer) args.push("--reviewer", reviewer);
  return args;
}

function pushOptionalArg(args, flag, value) {
  if (value) args.push(flag, value);
}

module.exports = {
  COMMAND_CONFIRMATION,
  COMMAND_DEFINITIONS,
  COMMANDS,
  CommandValidationError,
  INSTALL_ADAPTERS,
  buildDecisionAddArgs,
  buildReviewCompleteArgs,
  publicCommandDefinition,
  validateAdapterList,
};
