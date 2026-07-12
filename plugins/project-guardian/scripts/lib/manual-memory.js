"use strict";

const path = require("node:path");
const { containsLikelySecret } = require("./shared");

const MAX_MANUAL_MEMORY_BYTES = 16 * 1024;

const MEMORY_FILE_CONFIG = [
  { name: "PROJECT_CONTEXT", configKey: "context", fallbackPath: "memory/PROJECT_CONTEXT.md", label: "项目上下文" },
  { name: "STATE", configKey: "state", fallbackPath: "memory/STATE.md", label: "项目状态" },
  { name: "DECISIONS", configKey: "decisions", fallbackPath: "memory/DECISIONS.md", label: "决策记录" },
  { name: "AI_CHANGELOG", configKey: "changelog", fallbackPath: "memory/AI_CHANGELOG.md", label: "AI 变更日志" },
  { name: "HANDOVER", configKey: "handover", fallbackPath: "memory/HANDOVER.md", label: "交接指南" },
];

const MEMORY_APPEND_TEMPLATES = [
  template("context-note", "PROJECT_CONTEXT", "补充项目背景", "记录业务范围、技术背景、依赖或运行约束。", [
    field("scope", "模块/范围", "例如：Run 可视化控制台", true, 160),
    field("business-meaning", "业务含义", "这个背景为什么重要，谁会用到", true, 900, "textarea"),
    field("technical-notes", "技术说明", "涉及哪些技术、入口、依赖或配置", false, 900, "textarea"),
    field("related-files", "相关文件/入口", "例如：Run/server.js, README.md", false, 600),
    field("constraints", "约束/注意", "后续修改时不要忽略什么", false, 900, "textarea"),
  ]),
  template("state-progress", "STATE", "记录当前进展", "记录当前任务状态、验证结果、风险和下一步。", [
    field("task", "任务/事项", "例如：命令参数改为弹窗输入", true, 180),
    field("current-status", "当前状态", "现在完成到哪一步", true, 900, "textarea"),
    field("completed", "已完成", "已经落地的内容", false, 900, "textarea"),
    field("known-issues", "已知问题", "仍然存在的问题或限制", false, 900, "textarea"),
    field("next-step", "下一步", "下一个人应该继续做什么", true, 900, "textarea"),
    field("verification", "验证方式", "运行了哪些测试、检查或人工复核", true, 700, "textarea"),
    field("risks", "风险提醒", "兼容性、数据、安全、UI 或部署风险", false, 900, "textarea"),
  ]),
  template("decision-note", "DECISIONS", "补充决策摘要", "快速记录一条决策摘要；重大决策优先使用 guardian decision add。", [
    field("title", "决策标题", "例如：Run 写入命令使用弹窗确认", true, 160),
    field("context", "背景", "为什么需要做这个决策", true, 900, "textarea"),
    field("decision", "决策", "最终决定是什么", true, 900, "textarea"),
    field("alternatives", "备选方案", "考虑过哪些方案", false, 700, "textarea"),
    field("affected-files", "影响文件/模块", "例如：Run/public/app.js", false, 700),
    field("verification", "验证方式", "如何确认这个决策有效", true, 700, "textarea"),
    field("risks", "风险", "决策可能带来的风险", false, 700, "textarea"),
    field("review-after", "复审日期", "YYYY-MM-DD，可选", false, 20, "text", "^\\d{4}-\\d{2}-\\d{2}$"),
    field("follow-up", "后续动作", "未来需要继续做什么", false, 700, "textarea"),
  ]),
  template("change-log-note", "AI_CHANGELOG", "记录 AI 协助变更", "补充一次 AI 协助修改的关键信息。", [
    field("human-request", "用户需求", "用户希望解决什么问题", true, 700, "textarea"),
    field("ai-summary", "AI 总结", "实际改了什么，为什么这样改", true, 900, "textarea"),
    field("files-changed", "变更文件", "例如：Run/public/app.js, tests/guardian.test.js", true, 900, "textarea"),
    field("business-reason", "业务原因", "这次修改对使用者或流程有什么价值", true, 700, "textarea"),
    field("technical-notes", "技术说明", "关键实现、边界、兼容性", false, 900, "textarea"),
    field("verification", "验证方式", "运行过的命令或人工检查", true, 700, "textarea"),
    field("risks", "风险", "剩余风险或限制", false, 700, "textarea"),
    field("next-step", "下一步", "后续需要做什么", false, 700, "textarea"),
  ]),
  template("handover-note", "HANDOVER", "补充交接说明", "记录新人接手、发布或交接时必须知道的信息。", [
    field("audience", "交接对象", "例如：新实习生、项目负责人、测试同学", true, 160),
    field("summary", "交接摘要", "接手前必须知道的重点", true, 900, "textarea"),
    field("how-to-run", "如何运行/验证", "命令、入口、检查方式", true, 900, "textarea"),
    field("risk-notes", "风险提示", "容易踩坑或不能随便改的地方", true, 900, "textarea"),
    field("next-step", "建议下一步", "接手后第一件事做什么", true, 900, "textarea"),
  ]),
  template("custom-note", "*", "自定义完整记录", "保留自由文本入口，适合模板覆盖不到的补充。", [
    field("content", "完整记录内容", "写清楚发生了什么、为什么重要、如何验证、下一步是什么。", true, 8000, "textarea"),
  ]),
];

function template(id, target, label, description, fields) {
  return { id, target, label, description, fields };
}

function field(name, label, placeholder, required, maxLength, type = "text", pattern = "") {
  return { name, label, placeholder, required, maxLength, type, pattern };
}

function publicMemoryAppendTemplates() {
  return MEMORY_APPEND_TEMPLATES.map((item) => ({
    id: item.id,
    target: item.target,
    label: item.label,
    description: item.description,
    fields: item.fields.map((fieldDef) => ({ ...fieldDef })),
  }));
}

function templatesForMemory(name) {
  const normalized = normalizeMemoryName(name);
  return MEMORY_APPEND_TEMPLATES.filter((item) => item.target === normalized || item.target === "*");
}

function defaultTemplateForMemory(name) {
  const [first] = templatesForMemory(name);
  return first ? first.id : "custom-note";
}

function buildManualMemoryContent(name, templateId, fields = {}, rawContent = "") {
  const normalized = normalizeMemoryName(name);
  if (!templateId && rawContent) return validateManualMemoryContent(rawContent);

  const selectedTemplateId = templateId || defaultTemplateForMemory(normalized);
  const selected = templatesForMemory(normalized).find((item) => item.id === selectedTemplateId);
  if (!selected) throw new Error(`Unknown memory append template: ${selectedTemplateId}`);

  const values = validatedTemplateFields(selected, fields);
  return renderTemplateContent(selected.id, values);
}

function validatedTemplateFields(selected, fields) {
  const values = {};
  for (const fieldDef of selected.fields) {
    values[fieldDef.name] = validateMemoryField(
      fieldValue(fields, fieldDef.name),
      fieldDef.label,
      fieldDef.maxLength,
      fieldDef.required,
      fieldDef.pattern,
    );
  }
  return values;
}

function fieldValue(fields, name) {
  if (!fields || typeof fields !== "object") return "";
  return fields[name] == null ? "" : fields[name];
}

function validateMemoryField(value, label, maxLength, required, pattern = "") {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!text) {
    if (required) throw new Error(`${label} is required.`);
    return "";
  }
  if (Buffer.byteLength(text, "utf8") > maxLength) {
    throw new Error(`${label} must be ${maxLength} bytes or fewer.`);
  }
  if (containsLikelySecret(text)) {
    throw new Error(`${label} looks like it may contain a password, token, API key, or other secret.`);
  }
  if (pattern && !(new RegExp(pattern).test(text))) {
    throw new Error(`${label} has an invalid format.`);
  }
  return text;
}

function validateManualMemoryContent(value) {
  const content = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!content) throw new Error("Memory content is required.");
  if (Buffer.byteLength(content, "utf8") > MAX_MANUAL_MEMORY_BYTES) {
    throw new Error(`Memory content must be ${MAX_MANUAL_MEMORY_BYTES} bytes or fewer.`);
  }
  if (containsLikelySecret(content)) {
    throw new Error("Memory content looks like it may contain a password, token, API key, or other secret.");
  }
  return content;
}

function renderTemplateContent(id, values) {
  switch (id) {
    case "context-note":
      return lines([
        "### 项目背景补充",
        bullet("模块/范围", values.scope),
        bullet("业务含义", values["business-meaning"]),
        bullet("技术说明", fallback(values["technical-notes"])),
        bullet("相关文件/入口", fallback(values["related-files"])),
        bullet("约束/注意", fallback(values.constraints)),
      ]);
    case "state-progress":
      return lines([
        "### 当前状态补充",
        bullet("任务/事项", values.task),
        bullet("当前状态", values["current-status"]),
        bullet("已完成", fallback(values.completed)),
        bullet("已知问题", fallback(values["known-issues"])),
        bullet("下一步", values["next-step"]),
        bullet("验证方式", values.verification),
        bullet("风险提醒", fallback(values.risks)),
      ]);
    case "decision-note":
      return lines([
        "### 决策补充",
        bullet("标题", values.title),
        bullet("背景", values.context),
        bullet("决策", values.decision),
        bullet("备选方案", fallback(values.alternatives)),
        bullet("影响文件/模块", fallback(values["affected-files"])),
        bullet("验证方式", values.verification),
        bullet("风险", fallback(values.risks)),
        bullet("复审时间", fallback(values["review-after"], "未安排。")),
        bullet("后续动作", fallback(values["follow-up"])),
      ]);
    case "change-log-note":
      return lines([
        bullet("用户需求", values["human-request"]),
        bullet("AI 总结", values["ai-summary"]),
        bullet("变更文件", values["files-changed"]),
        bullet("业务原因", values["business-reason"]),
        bullet("技术说明", fallback(values["technical-notes"])),
        bullet("验证方式", values.verification),
        bullet("风险", fallback(values.risks)),
        "- 敏感信息检查：Run/CLI 基础敏感词拦截已通过，提交前仍需运行 guardian verify。",
        bullet("下一步", fallback(values["next-step"])),
      ]);
    case "handover-note":
      return lines([
        "### 交接补充",
        bullet("交接对象", values.audience),
        bullet("交接摘要", values.summary),
        bullet("如何运行/验证", values["how-to-run"]),
        bullet("风险提示", values["risk-notes"]),
        bullet("建议下一步", values["next-step"]),
      ]);
    case "custom-note":
      return values.content;
    default:
      throw new Error(`Unsupported memory append template: ${id}`);
  }
}

function lines(items) {
  return items.filter(Boolean).join("\n");
}

function bullet(label, value) {
  return `- ${label}：${value}`;
}

function fallback(value, text = "暂无记录。") {
  return value || text;
}

function buildManualMemoryEntry(name, content, options = {}) {
  const titlePrefix = options.titlePrefix || "手动记录";
  const source = options.source || "Project Guardian 手动追加。";
  const title = `${titlePrefix} - ${localTimestamp(options.date)}`;
  if (normalizeMemoryName(name) === "AI_CHANGELOG") {
    const indented = content
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n");
    return [
      "",
      "",
      `### ${title}`,
      "",
      "- 用户记录：",
      indented,
      `- 来源：${source}`,
      "- Sensitive data checked: 基础敏感词拦截已通过。",
      "",
    ].join("\n");
  }

  return [
    "",
    "",
    `## ${title}`,
    "",
    `来源：${source}`,
    "",
    content,
    "",
  ].join("\n");
}

function memoryFilesForConfig(configMemoryFiles = {}) {
  return MEMORY_FILE_CONFIG.map((item) => [
    item.name,
    sanitizeMemoryPath(configMemoryFiles[item.configKey], item.fallbackPath),
  ]);
}

function resolveMemoryTarget(projectRoot, configMemoryFiles, name) {
  const normalized = normalizeMemoryName(name);
  const entry = memoryFilesForConfig(configMemoryFiles).find(([memoryName]) => memoryName === normalized);
  if (!entry) throw new Error("Unknown memory file. Use one of the core Project Guardian memory names.");
  return {
    name: entry[0],
    relativePath: entry[1],
    absolutePath: path.join(projectRoot, entry[1]),
  };
}

function sanitizeMemoryPath(value, fallbackPath) {
  const rawPath = typeof value === "string" && value.trim() ? value.trim() : fallbackPath;
  const normalized = rawPath.replace(/\\/g, "/");
  if (path.isAbsolute(normalized) || normalized.split("/").includes("..")) return fallbackPath;
  return normalized;
}

function normalizeMemoryName(name) {
  const normalized = String(name || "").trim().toUpperCase().replace(/[-\s]+/g, "_");
  const aliases = {
    CONTEXT: "PROJECT_CONTEXT",
    PROJECT: "PROJECT_CONTEXT",
    CHANGELOG: "AI_CHANGELOG",
    AI_LOG: "AI_CHANGELOG",
    HAND_OFF: "HANDOVER",
  };
  return aliases[normalized] || normalized;
}

function localTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

module.exports = {
  MAX_MANUAL_MEMORY_BYTES,
  MEMORY_APPEND_TEMPLATES,
  MEMORY_FILE_CONFIG,
  buildManualMemoryContent,
  buildManualMemoryEntry,
  containsLikelySecret,
  defaultTemplateForMemory,
  memoryFilesForConfig,
  normalizeMemoryName,
  publicMemoryAppendTemplates,
  resolveMemoryTarget,
  templatesForMemory,
  validateManualMemoryContent,
};
