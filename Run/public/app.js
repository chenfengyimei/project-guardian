"use strict";

const commandKindLabels = {
  read: "只读",
  write: "写入",
  linked: "专用模块",
  terminal: "终端",
};

const commandGroupOrder = [
  {
    id: "linked",
    title: "专用模块",
    description: "已有独立页面承载的高频功能，点击后直接跳转到对应模块。",
  },
  {
    id: "read",
    title: "只读检查",
    description: "只查看状态、校验结果或诊断信息，不会写入项目文件。",
  },
  {
    id: "write",
    title: "写入维护",
    description: "会修改记忆、规则、Hook 或 CI 文件，运行前必须输入确认词。",
  },
  {
    id: "terminal",
    title: "终端服务",
    description: "需要在终端或 AI IDE 配置中持续运行的服务命令。",
  },
];

const OPERATION_LOG_KEY = "projectGuardianOperationLog";
const RUN_TOKEN_KEY = "projectGuardianRunToken";
const MAX_OPERATION_LOG_ITEMS = 50;

const fallbackAppendTemplate = {
  id: "custom-note",
  target: "*",
  label: "自定义完整记录",
  description: "模板列表暂未加载或没有专用模板时，仍可用完整记录补充项目记忆。",
  fields: [
    {
      name: "content",
      label: "完整记录内容",
      placeholder: "写清楚发生了什么、为什么重要、如何验证、下一步是什么。",
      required: true,
      maxLength: 8000,
      type: "textarea",
      pattern: "",
    },
  ],
};

const viewTitles = {
  overview: ["状态概览", "插件状态概览"],
  memory: ["核心记忆", "核心记忆文件"],
  init: ["插件初始化", "初始化 Project Guardian"],
  append: ["追加记忆", "手动追加项目记忆"],
  brief: ["读取计划", "生成记忆读取计划"],
  query: ["知识查询", "查询本地项目知识"],
  mcp: ["MCP 系统", "MCP 系统配置"],
  reviews: ["决策复审", "决策文件复审状态"],
  commands: ["命令操作", "运行命令与查看输出"],
};

const state = {
  actions: [],
  features: {
    memoryRead: false,
    initProject: false,
    appendMemory: false,
  },
  confirmations: {
    init: "RUN_INIT",
    appendMemory: "APPEND_MEMORY",
  },
  memoryFiles: [],
  memoryAppendTemplates: [],
  commands: [],
  mcp: null,
  selectedMemory: "",
  currentView: "overview",
  sidebarCollapsed: false,
  activeCommand: null,
  commandSearch: "",
  operationLog: [],
  serverAuditLog: [],
  serverAuditIntegrity: null,
};

const nodes = typeof document === "undefined" ? {} : {
  appShell: document.querySelector("#appShell"),
  sidebarToggle: document.querySelector("#sidebarToggle"),
  navButtons: document.querySelectorAll(".nav-button"),
  views: document.querySelectorAll(".view"),
  viewEyebrow: document.querySelector("#viewEyebrow"),
  viewTitle: document.querySelector("#viewTitle"),
  serverBadge: document.querySelector("#serverBadge"),
  projectRoot: document.querySelector("#projectRoot"),
  nodeVersion: document.querySelector("#nodeVersion"),
  guardianState: document.querySelector("#guardianState"),
  memoryCount: document.querySelector("#memoryCount"),
  actionCount: document.querySelector("#actionCount"),
  memoryFiles: document.querySelector("#memoryFiles"),
  memoryViewerTitle: document.querySelector("#memoryViewerTitle"),
  memoryViewer: document.querySelector("#memoryViewer"),
  reloadMemory: document.querySelector("#reloadMemory"),
  commandSearch: document.querySelector("#commandSearch"),
  commandButtons: document.querySelector("#commandButtons"),
  output: document.querySelector("#output"),
  queryOutput: document.querySelector("#queryOutput"),
  briefOutput: document.querySelector("#briefOutput"),
  operationLog: document.querySelector("#operationLog"),
  serverAuditLog: document.querySelector("#serverAuditLog"),
  reloadServerAuditLog: document.querySelector("#reloadServerAuditLog"),
  mcpConfigState: document.querySelector("#mcpConfigState"),
  mcpGlobalCommand: document.querySelector("#mcpGlobalCommand"),
  mcpLocalCommand: document.querySelector("#mcpLocalCommand"),
  mcpProtocol: document.querySelector("#mcpProtocol"),
  mcpReadOnly: document.querySelector("#mcpReadOnly"),
  mcpAllowedTools: document.querySelector("#mcpAllowedTools"),
  mcpEnabledCount: document.querySelector("#mcpEnabledCount"),
  mcpConfigIssues: document.querySelector("#mcpConfigIssues"),
  mcpTools: document.querySelector("#mcpTools"),
  mcpToolForm: document.querySelector("#mcpToolForm"),
  reviewList: document.querySelector("#reviewList"),
  reviewViewer: document.querySelector("#reviewViewer"),
  reviewViewerTitle: document.querySelector("#reviewViewerTitle"),
  reviewViewerPath: document.querySelector("#reviewViewerPath"),
  mcpToolSelect: document.querySelector("#mcpToolSelect"),
  mcpToolFields: document.querySelector("#mcpToolFields"),
  mcpToolConfirmLabel: document.querySelector("#mcpToolConfirmLabel"),
  mcpToolConfirm: document.querySelector("#mcpToolConfirm"),
  mcpToolSubmit: document.querySelector("#mcpToolSubmit"),
  mcpToolOutput: document.querySelector("#mcpToolOutput"),
  clearMcpOutput: document.querySelector("#clearMcpOutput"),
  refreshStatus: document.querySelector("#refreshStatus"),
  clearOutput: document.querySelector("#clearOutput"),
  clearQueryOutput: document.querySelector("#clearQueryOutput"),
  clearBriefOutput: document.querySelector("#clearBriefOutput"),
  clearOperationLog: document.querySelector("#clearOperationLog"),
  initForm: document.querySelector("#initForm"),
  appendMemoryForm: document.querySelector("#appendMemoryForm"),
  appendMemoryName: document.querySelector("#appendMemoryName"),
  appendTemplate: document.querySelector("#appendTemplate"),
  appendTemplateHint: document.querySelector("#appendTemplateHint"),
  appendTemplateFields: document.querySelector("#appendTemplateFields"),
  appendConfirm: document.querySelector("#appendConfirm"),
  initConfirm: document.querySelector("#initConfirm"),
  briefForm: document.querySelector("#briefForm"),
  queryForm: document.querySelector("#queryForm"),
  commandModal: document.querySelector("#commandModal"),
  commandModalForm: document.querySelector("#commandModalForm"),
  commandModalClose: document.querySelector("#commandModalClose"),
  commandModalKind: document.querySelector("#commandModalKind"),
  commandModalTitle: document.querySelector("#commandModalTitle"),
  commandModalDescription: document.querySelector("#commandModalDescription"),
  commandModalLine: document.querySelector("#commandModalLine"),
  commandModalDiffPanel: document.querySelector("#commandModalDiffPanel"),
  commandModalDiff: document.querySelector("#commandModalDiff"),
  commandModalRefreshDiff: document.querySelector("#commandModalRefreshDiff"),
  commandModalFields: document.querySelector("#commandModalFields"),
  commandModalConfirmLabel: document.querySelector("#commandModalConfirmLabel"),
  commandModalConfirm: document.querySelector("#commandModalConfirm"),
};

if (typeof document !== "undefined") {
  captureRunTokenFromUrl();
  state.operationLog = loadOperationLog();
  setSidebarCollapsed(localStorage.getItem("projectGuardianSidebar") === "collapsed");
  renderOperationLog();
  renderServerAuditLog();
  nodes.sidebarToggle.addEventListener("click", () => {
    setSidebarCollapsed(!state.sidebarCollapsed);
  });
  nodes.navButtons.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  nodes.refreshStatus.addEventListener("click", loadStatus);
  nodes.reloadMemory.addEventListener("click", async () => {
    if (state.selectedMemory) await loadMemoryFile(state.selectedMemory);
  });
  nodes.clearOutput.addEventListener("click", () => {
    nodes.output.textContent = "等待操作...";
  });
  nodes.clearQueryOutput.addEventListener("click", () => {
    nodes.queryOutput.textContent = "等待查询...";
  });
  nodes.clearBriefOutput.addEventListener("click", () => {
    nodes.briefOutput.textContent = "等待读取计划...";
  });
  nodes.clearOperationLog.addEventListener("click", () => {
    state.operationLog = [];
    saveOperationLog();
    renderOperationLog();
  });
  if (nodes.reloadServerAuditLog) nodes.reloadServerAuditLog.addEventListener("click", loadServerAuditLog);
  if (nodes.clearMcpOutput) {
    nodes.clearMcpOutput.addEventListener("click", () => {
      nodes.mcpToolOutput.textContent = "等待 MCP 工具调用...";
    });
  }
  if (nodes.mcpToolSelect) nodes.mcpToolSelect.addEventListener("change", renderMcpToolFields);
  if (nodes.mcpToolForm) nodes.mcpToolForm.addEventListener("submit", handleMcpToolSubmit);
  nodes.commandSearch.addEventListener("input", () => {
    state.commandSearch = nodes.commandSearch.value;
    renderCommandButtons();
  });
  nodes.appendMemoryName.addEventListener("change", renderAppendTemplateOptions);
  nodes.appendTemplate.addEventListener("change", renderAppendTemplateFields);
  nodes.commandModalClose.addEventListener("click", closeCommandModal);
  nodes.commandModalRefreshDiff.addEventListener("click", loadDiffPreview);
  nodes.commandModal.querySelector("[data-modal-cancel]").addEventListener("click", closeCommandModal);
  nodes.commandModal.addEventListener("click", (event) => {
    if (event.target === nodes.commandModal) closeCommandModal();
  });
  nodes.commandModalForm.addEventListener("submit", handleCommandModalSubmit);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !nodes.commandModal.hidden) closeCommandModal();
  });
  nodes.initForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      language: document.querySelector("#initLanguage").value,
      adapter: document.querySelector("#initAdapter").value,
      confirm: nodes.initConfirm.value,
    };
    const result = await postAndRender("/api/init", payload, "guardian init");
    if (result && result.ok) {
      nodes.initConfirm.value = "";
      await loadStatus();
    }
  });
  nodes.appendMemoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      name: nodes.appendMemoryName.value,
      templateId: nodes.appendTemplate.value,
      fields: collectNamedFields(nodes.appendTemplateFields),
      confirm: nodes.appendConfirm.value,
    };

    setBusy(true);
    setOutputPending(nodes.output, "等待操作...", "写入中...");
    try {
      const result = await postJson("/api/memory/append", payload);
      recordOperation("append-memory", true, result.path || "");
      appendOutput("追加记忆", true, `已写入 ${result.path}，当前大小 ${result.size} bytes。`, "", nodes.output, "等待操作...", "写入中...");
      clearFields(nodes.appendTemplateFields);
      nodes.appendConfirm.value = "";
      await loadStatus();
      await loadServerAuditLog();
      await loadMemoryFile(result.name);
      showView("memory");
    } catch (error) {
      recordOperation("append-memory", false, error.message);
      appendOutput("追加记忆", false, "", error.message, nodes.output, "等待操作...", "写入中...");
    } finally {
      setBusy(false);
    }
  });
  nodes.briefForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      question: document.querySelector("#briefQuestion").value,
      mode: document.querySelector("#briefMode").value,
      limit: Number(document.querySelector("#briefLimit").value),
    };
    await postAndRender("/api/brief", payload, "guardian brief", {
      outputNode: nodes.briefOutput,
      emptyText: "等待读取计划...",
      pendingText: "生成中...",
      nextView: "brief",
    });
  });
  nodes.queryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      question: document.querySelector("#queryQuestion").value,
      limit: Number(document.querySelector("#queryLimit").value),
    };
    await postAndRender("/api/query", payload, "guardian query", {
      outputNode: nodes.queryOutput,
      emptyText: "等待查询...",
      nextView: "query",
    });
  });
}

async function loadStatus() {
  setBadge("加载中", false);
  try {
    const payload = await requestJson("/api/status");
    state.actions = payload.actions || [];
    state.commands = payload.commands || [];
    state.features = payload.features || {};
    state.confirmations = payload.confirmations || state.confirmations;
    state.memoryFiles = payload.memoryFiles || [];
    state.memoryAppendTemplates = payload.memoryAppendTemplates || [];
    state.mcp = payload.mcp || null;
    nodes.projectRoot.textContent = payload.projectRoot || "-";
    nodes.nodeVersion.textContent = payload.nodeVersion || "-";
    nodes.guardianState.textContent = payload.guardianAvailable ? "已找到 CLI" : "未找到 CLI";
    nodes.memoryCount.textContent = `${state.memoryFiles.filter((file) => file.exists).length}/${state.memoryFiles.length}`;
    nodes.actionCount.textContent = String(state.actions.length);
    nodes.initConfirm.placeholder = `输入 ${state.confirmations.init}`;
    nodes.appendConfirm.placeholder = `输入 ${state.confirmations.appendMemory}`;
    setBadge(payload.guardianAvailable ? "可用" : "缺少 CLI", !payload.guardianAvailable);
    renderCompatibilityWarning(payload);
    setWriteFormAvailability();
    renderMemoryFiles(state.memoryFiles);
    renderMemorySelect(state.memoryFiles);
    renderAppendTemplateOptions();
    renderCommandButtons();
    renderMcpStatus(state.mcp);
    await loadServerAuditLog();
  } catch (error) {
    setBadge("连接失败", true);
    appendOutput("status", false, "", error.message);
  }
}

function setSidebarCollapsed(collapsed) {
  state.sidebarCollapsed = Boolean(collapsed);
  nodes.appShell.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  nodes.sidebarToggle.textContent = state.sidebarCollapsed ? "展开" : "收起";
  nodes.sidebarToggle.title = state.sidebarCollapsed ? "展开侧边栏" : "收起侧边栏";
  nodes.sidebarToggle.setAttribute("aria-expanded", String(!state.sidebarCollapsed));
  localStorage.setItem("projectGuardianSidebar", state.sidebarCollapsed ? "collapsed" : "expanded");
}

function showView(viewName) {
  const nextView = viewTitles[viewName] ? viewName : "overview";
  state.currentView = nextView;
  nodes.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === nextView);
  });
  nodes.views.forEach((view) => {
    view.classList.toggle("active", view.id === `view-${nextView}`);
  });
  const [eyebrow, title] = viewTitles[nextView];
  nodes.viewEyebrow.textContent = eyebrow;
  nodes.viewTitle.textContent = title;
  if (nextView === 'reviews') loadReviews();
}

function renderCompatibilityWarning(payload) {
  if (payload.features && payload.features.memoryRead) return;
  nodes.memoryViewerTitle.textContent = "需要重启 Run 服务";
  nodes.memoryViewer.textContent = [
    "当前页面已经加载了新版前端，但后台 Run server 仍是旧版本，暂时不能读取记忆文件。",
    "",
    "请在启动 Run 的终端里按 Ctrl+C 停止服务，然后重新运行：",
    "",
    "npm run ui",
    "",
    "或者：",
    "",
    "node Run/server.js",
  ].join("\n");
}

function renderMcpStatus(mcp) {
  if (!nodes.mcpTools) return;
  const data = mcp || {};
  const commands = data.commands || {};
  const tools = Array.isArray(data.tools) ? data.tools : [];
  const allowedTools = Array.isArray(data.allowedTools) ? data.allowedTools : [];
  const configIssues = Array.isArray(data.configIssues) ? data.configIssues : [];
  const configValid = data.configValid !== false;

  nodes.mcpConfigState.textContent = configValid ? "配置有效" : "配置异常";
  nodes.mcpConfigState.classList.toggle("bad", !configValid);
  nodes.mcpGlobalCommand.textContent = commands.global || "guardian mcp";
  nodes.mcpLocalCommand.textContent = commands.local || "未找到本地脚本";
  nodes.mcpProtocol.textContent = data.protocolVersion || "-";
  nodes.mcpReadOnly.textContent = mcpReadOnlyText(data);
  nodes.mcpAllowedTools.textContent = allowedTools.length ? allowedTools.join(", ") : "全部工具";
  nodes.mcpEnabledCount.textContent = `${Number(data.enabledTools || 0)}/${Number(data.totalTools || tools.length)}`;
  nodes.mcpConfigIssues.textContent = configIssues.length
    ? configIssues.map((issue) => `- ${issue}`).join("\n")
    : "MCP 配置有效。";
  renderMcpTools(tools);
  renderMcpToolSelect(tools);
}

function mcpReadOnlyText(data) {
  if (!data) return "-";
  if (data.envReadOnly) return "只读（环境变量）";
  if (data.readOnly) return "只读（配置）";
  return data.effectiveReadOnly ? "只读" : "按配置开放写入工具";
}

function renderMcpTools(tools) {
  nodes.mcpTools.innerHTML = "";
  if (!tools.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "没有可显示的 MCP 工具。";
    nodes.mcpTools.appendChild(empty);
    return;
  }
  for (const tool of tools) {
    const card = document.createElement("article");
    card.className = `mcp-tool ${tool.enabled ? "enabled" : "disabled"}`;
    const required = Array.isArray(tool.required) && tool.required.length ? tool.required.join(", ") : "无";
    const properties = Array.isArray(tool.properties) && tool.properties.length ? tool.properties.join(", ") : "无";
    card.innerHTML = [
      '<div class="mcp-tool-head">',
      `<strong>${escapeHtml(tool.name)}</strong>`,
      '<span class="tool-badges">',
      `<span class="chip ${tool.enabled ? "ok" : "disabled"}">${tool.enabled ? "启用" : "禁用"}</span>`,
      `<span class="chip ${tool.write ? "write" : "read"}">${tool.write ? "写入" : "只读"}</span>`,
      "</span>",
      "</div>",
      `<p class="muted">${escapeHtml(tool.description || "")}</p>`,
      `<p><span>必填</span><code>${escapeHtml(required)}</code></p>`,
      `<p><span>参数</span><code>${escapeHtml(properties)}</code></p>`,
    ].join("");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = tool.enabled ? "使用" : "已禁用";
    button.disabled = !tool.enabled;
    button.addEventListener("click", () => {
      nodes.mcpToolSelect.value = tool.name;
      renderMcpToolFields();
      nodes.mcpToolSelect.focus();
    });
    card.appendChild(button);
    nodes.mcpTools.appendChild(card);
  }
}

function renderMcpToolSelect(tools) {
  if (!nodes.mcpToolSelect) return;
  const previous = nodes.mcpToolSelect.value;
  nodes.mcpToolSelect.innerHTML = "";
  for (const tool of tools) {
    const option = document.createElement("option");
    option.value = tool.name;
    option.textContent = `${tool.name}${tool.write ? " - 写入" : " - 只读"}${tool.enabled ? "" : " - 禁用"}`;
    option.disabled = !tool.enabled;
    nodes.mcpToolSelect.appendChild(option);
  }
  const hasPrevious = tools.some((tool) => tool.name === previous && tool.enabled);
  const firstEnabled = tools.find((tool) => tool.enabled);
  if (hasPrevious) nodes.mcpToolSelect.value = previous;
  else if (firstEnabled) nodes.mcpToolSelect.value = firstEnabled.name;
  renderMcpToolFields();
}

function selectedMcpTool() {
  const tools = state.mcp && Array.isArray(state.mcp.tools) ? state.mcp.tools : [];
  return tools.find((tool) => tool.name === nodes.mcpToolSelect.value) || null;
}

function renderMcpToolFields() {
  if (!nodes.mcpToolFields) return;
  const tool = selectedMcpTool();
  nodes.mcpToolFields.innerHTML = "";
  nodes.mcpToolConfirm.value = "";
  const canCall = Boolean(tool && tool.enabled && state.features.mcpToolCall);
  nodes.mcpToolSubmit.disabled = !canCall;
  nodes.mcpToolConfirmLabel.hidden = !(tool && tool.write);
  nodes.mcpToolConfirm.required = Boolean(tool && tool.write);
  nodes.mcpToolConfirm.placeholder = `输入 ${state.confirmations.mcpTool || "RUN_MCP"}`;
  if (!tool) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "没有可调用的 MCP 工具。";
    nodes.mcpToolFields.appendChild(empty);
    return;
  }
  for (const field of tool.fields || []) nodes.mcpToolFields.appendChild(renderFieldControl(field));
  if (!(tool.fields || []).length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "该工具不需要参数。";
    nodes.mcpToolFields.appendChild(empty);
  }
}

function renderMemoryFiles(files) {
  nodes.memoryFiles.innerHTML = "";
  for (const file of files) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `memory-item ${file.exists ? "ok" : "missing"} ${file.name === state.selectedMemory ? "active" : ""}`;
    button.dataset.disabled = file.exists && state.features.memoryRead ? "false" : "true";
    button.disabled = !file.exists || !state.features.memoryRead;
    button.innerHTML = `<strong>${escapeHtml(file.name)} ${file.exists ? "存在" : "缺失"}</strong><span>${escapeHtml(file.path)}</span>`;
    button.addEventListener("click", async () => {
      await loadMemoryFile(file.name);
    });
    nodes.memoryFiles.appendChild(button);
  }
}

function renderMemorySelect(files) {
  const previous = nodes.appendMemoryName.value;
  nodes.appendMemoryName.innerHTML = "";
  for (const file of files) {
    const option = document.createElement("option");
    option.value = file.name;
    option.textContent = `${file.name} - ${file.path}`;
    option.disabled = !file.exists || !state.features.appendMemory;
    nodes.appendMemoryName.appendChild(option);
  }
  if (previous && files.some((file) => file.name === previous && file.exists)) {
    nodes.appendMemoryName.value = previous;
  }
  renderAppendTemplateOptions();
}

function renderAppendTemplateOptions() {
  const memoryName = nodes.appendMemoryName.value;
  const previous = nodes.appendTemplate.value;
  const templates = templatesForMemory(memoryName);
  nodes.appendTemplate.innerHTML = "";
  for (const template of templates) {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.label;
    nodes.appendTemplate.appendChild(option);
  }
  if (previous && templates.some((template) => template.id === previous)) nodes.appendTemplate.value = previous;
  renderAppendTemplateFields();
}

function templatesForMemory(memoryName) {
  return templatesForMemoryFromList(memoryName, state.memoryAppendTemplates);
}

function templatesForMemoryFromList(memoryName, templates) {
  const normalized = normalizeMemoryTarget(memoryName);
  const matched = (Array.isArray(templates) ? templates : []).filter((template) => {
    const target = normalizeMemoryTarget(template.target);
    return target === normalized || target === "*";
  });
  if (!matched.some((template) => template.id === fallbackAppendTemplate.id)) {
    matched.push(fallbackAppendTemplate);
  }
  return matched;
}

function normalizeMemoryTarget(value) {
  const normalized = String(value || "").trim().toUpperCase().replace(/[-\s]+/g, "_");
  const aliases = {
    CONTEXT: "PROJECT_CONTEXT",
    PROJECT: "PROJECT_CONTEXT",
    CHANGELOG: "AI_CHANGELOG",
    AI_LOG: "AI_CHANGELOG",
    HAND_OFF: "HANDOVER",
  };
  return aliases[normalized] || normalized;
}

function renderAppendTemplateFields() {
  const template = templatesForMemory(nodes.appendMemoryName.value).find((item) => item.id === nodes.appendTemplate.value);
  nodes.appendTemplateFields.innerHTML = "";
  if (!template) {
    nodes.appendTemplateHint.textContent = "当前记忆文件没有可用模板。";
    return;
  }
  nodes.appendTemplateHint.textContent = template.description || "选择模板后，只填写对应关键信息。";
  for (const field of template.fields || []) nodes.appendTemplateFields.appendChild(renderFieldControl(field));
}

async function loadMemoryFile(name) {
  if (!state.features.memoryRead) {
    renderCompatibilityWarning({ features: state.features });
    appendOutput("读取记忆", false, "", "Run server 版本较旧，请重启服务后再试。");
    return;
  }
  setBusy(true);
  state.selectedMemory = name;
  nodes.memoryViewerTitle.textContent = `${name} 内容预览`;
  renderPlainMemory("读取中...");
  try {
    const result = await requestJson(`/api/memory?name=${encodeURIComponent(name)}`);
    if (!result.exists) {
      renderPlainMemory(`${result.path} 不存在。可以先运行 guardian init。`);
    } else if (result.tooLarge) {
      renderPlainMemory(`${result.path} 文件过大，已超过网页预览上限。`);
    } else {
      renderMarkdownMemory(result.content || "(空文件)");
    }
    renderMemoryFiles(state.memoryFiles);
  } catch (error) {
    renderPlainMemory(error.message);
    appendOutput("读取记忆", false, "", error.message);
  } finally {
    setBusy(false);
  }
}

function setWriteFormAvailability() {
  const initButton = nodes.initForm.querySelector("button[type='submit']");
  const appendButton = nodes.appendMemoryForm.querySelector("button[type='submit']");
  initButton.dataset.disabled = state.features.initProject ? "false" : "true";
  appendButton.dataset.disabled = state.features.appendMemory ? "false" : "true";
  initButton.disabled = !state.features.initProject;
  appendButton.disabled = !state.features.appendMemory;
}

function renderCommandButtons() {
  nodes.commandButtons.innerHTML = "";
  const commands = state.commands.length
    ? state.commands
    : state.actions.map((action) => ({ id: action, label: action, kind: "read", fields: [], command: `guardian ${action}` }));
  const filteredCommands = filterCommandsForSearch(commands, state.commandSearch);
  const groups = commandGroupsForDisplay(filteredCommands);
  if (groups.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "没有匹配的命令。";
    nodes.commandButtons.appendChild(empty);
    return;
  }
  for (const group of groups) {
    const section = document.createElement("section");
    section.className = `command-group command-group-${group.id}`;
    section.innerHTML = [
      '<div class="command-group-head">',
      "<div>",
      `<h4>${escapeHtml(group.title)}</h4>`,
      `<p class="muted">${escapeHtml(group.description)}</p>`,
      "</div>",
      `<span>${group.commands.length} 个</span>`,
      "</div>",
    ].join("");

    const grid = document.createElement("div");
    grid.className = "command-grid";
    for (const command of group.commands) {
      grid.appendChild(renderCommandCard(command));
    }
    section.appendChild(grid);
    nodes.commandButtons.appendChild(section);
  }
}

function filterCommandsForSearch(commands, query) {
  const keyword = String(query || "").trim().toLowerCase();
  if (!keyword) return commands;
  return commands.filter((command) => commandSearchText(command).includes(keyword));
}

function commandSearchText(command) {
  return [
    command.id,
    command.label,
    command.kind,
    command.command,
    command.description,
    command.view,
    ...(command.fields || []).flatMap((field) => [field.name, field.label, field.placeholder, field.description]),
  ].filter(Boolean).join(" ").toLowerCase();
}

function commandGroupsForDisplay(commands) {
  const grouped = new Map(commandGroupOrder.map((group) => [group.id, { ...group, commands: [] }]));
  for (const command of commands) {
    const key = grouped.has(command.kind) ? command.kind : "read";
    grouped.get(key).commands.push(command);
  }
  return commandGroupOrder
    .map((group) => grouped.get(group.id))
    .filter((group) => group.commands.length > 0);
}

function renderCommandCard(command) {
  const card = document.createElement("article");
  card.className = `command-card command-${command.kind}`;

  const head = document.createElement("div");
  head.className = "command-card-head";
  head.innerHTML = [
    `<strong>${escapeHtml(command.label || command.id)}</strong>`,
    `<span>${escapeHtml(commandKindLabels[command.kind] || command.kind)}</span>`,
  ].join("");
  card.appendChild(head);

  const description = document.createElement("p");
  description.className = "muted";
  description.textContent = command.description || "";
  card.appendChild(description);

  const commandLine = document.createElement("code");
  commandLine.className = "command-line";
  commandLine.textContent = command.command || `guardian ${command.id}`;
  card.appendChild(commandLine);

  const fields = Array.isArray(command.fields) ? command.fields : [];

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = commandButtonText(command);
  if (command.kind === "terminal") {
    button.disabled = true;
    button.dataset.disabled = "true";
  } else if (command.kind === "linked") {
    button.addEventListener("click", () => showView(command.view));
  } else {
    button.addEventListener("click", async () => {
      if (command.kind === "write" || fields.length) {
        openCommandModal(command);
        return;
      }
      await postAndRender("/api/command", { action: command.id }, command.command || `guardian ${command.id}`);
    });
  }
  card.appendChild(button);
  return card;
}

function renderFieldControl(field) {
  const label = document.createElement("label");
  const suffix = field.required ? " *" : "";
  label.textContent = `${field.label || field.name}${suffix}`;
  let control;
  if (field.type === "textarea") {
    control = document.createElement("textarea");
    control.rows = 4;
  } else if (field.type === "select") {
    control = document.createElement("select");
    for (const optionValue of field.options || []) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      control.appendChild(option);
    }
    control.value = field.value || "";
  } else if (field.type === "number") {
    control = document.createElement("input");
    control.type = "number";
    if (Number.isFinite(field.minimum)) control.min = String(field.minimum);
    if (Number.isFinite(field.maximum)) control.max = String(field.maximum);
  } else {
    control = document.createElement("input");
    control.type = "text";
  }
  control.name = field.name;
  control.placeholder = field.placeholder || "";
  if (field.maxLength) control.maxLength = field.maxLength;
  if (field.pattern) control.pattern = field.pattern;
  if (field.required) control.required = true;
  control.setAttribute("aria-label", field.label || field.name);
  label.appendChild(control);
  return label;
}

function commandButtonText(command) {
  if (command.kind === "linked") return "打开模块";
  if (command.kind === "write") return "填写参数";
  if (command.kind === "terminal") return "需终端运行";
  return "运行";
}

function openCommandModal(command) {
  state.activeCommand = command;
  nodes.commandModalKind.textContent = commandKindLabels[command.kind] || "命令操作";
  nodes.commandModalTitle.textContent = command.label || command.id;
  nodes.commandModalDescription.textContent = command.description || "";
  nodes.commandModalLine.textContent = command.command || `guardian ${command.id}`;
  nodes.commandModalFields.innerHTML = "";
  for (const field of command.fields || []) nodes.commandModalFields.appendChild(renderFieldControl(field));
  const needsConfirmation = command.kind === "write";
  nodes.commandModalConfirmLabel.hidden = !needsConfirmation;
  nodes.commandModalConfirm.required = needsConfirmation;
  nodes.commandModalConfirm.value = "";
  nodes.commandModalConfirm.placeholder = `输入 ${command.confirmation || state.confirmations.command || "RUN_COMMAND"}`;
  nodes.commandModalDiffPanel.hidden = command.kind !== "write";
  nodes.commandModalDiff.textContent = "等待读取 diff...";
  nodes.commandModal.hidden = false;
  if (command.kind === "write") loadDiffPreview();
  const firstInput = nodes.commandModal.querySelector("input:not([type='hidden']), textarea, select");
  if (firstInput) firstInput.focus();
}

function closeCommandModal() {
  nodes.commandModal.hidden = true;
  state.activeCommand = null;
  nodes.commandModalForm.reset();
  nodes.commandModalFields.innerHTML = "";
  nodes.commandModalDiffPanel.hidden = true;
  nodes.commandModalDiff.textContent = "等待读取 diff...";
}

async function handleCommandModalSubmit(event) {
  event.preventDefault();
  const command = state.activeCommand;
  if (!command) return;
  const payload = { action: command.id, ...collectNamedFields(nodes.commandModalFields) };
  if (command.kind === "write") payload.confirm = nodes.commandModalConfirm.value;
  const result = await postAndRender("/api/command", payload, command.command || `guardian ${command.id}`);
  if (result) closeCommandModal();
}

async function handleMcpToolSubmit(event) {
  event.preventDefault();
  const tool = selectedMcpTool();
  if (!tool || !tool.enabled) return;
  const payload = {
    name: tool.name,
    arguments: collectMcpArguments(tool),
  };
  if (tool.write) payload.confirm = nodes.mcpToolConfirm.value;
  await postAndRender("/api/mcp/call", payload, `MCP ${tool.name}`, {
    outputNode: nodes.mcpToolOutput,
    emptyText: "等待 MCP 工具调用...",
    nextView: "mcp",
  });
}

function collectMcpArguments(tool) {
  const fields = new Map((tool.fields || []).map((field) => [field.name, field]));
  const values = {};
  nodes.mcpToolFields.querySelectorAll("input[name], textarea[name], select[name]").forEach((control) => {
    const field = fields.get(control.name) || {};
    if (!control.value && !field.required) return;
    values[control.name] = field.type === "number" ? Number(control.value) : control.value;
  });
  return values;
}

function collectNamedFields(container) {
  const values = {};
  container.querySelectorAll("input[name], textarea[name], select[name]").forEach((control) => {
    values[control.name] = control.value;
  });
  return values;
}

function clearFields(container) {
  container.querySelectorAll("input[name], textarea[name], select[name]").forEach((control) => {
    control.value = "";
  });
}

async function postAndRender(route, payload, label, options = {}) {
  const outputNode = options.outputNode || nodes.output;
  const emptyText = options.emptyText || "等待操作...";
  const pendingText = options.pendingText || "运行中...";
  setBusy(true);
  setOutputPending(outputNode, emptyText, pendingText);
  try {
    const result = await postJson(route, payload);
    appendOutput(label, result.ok, result.stdout || "", result.stderr || "", outputNode, emptyText, pendingText);
    recordOperation(label, result.ok, result.stderr || result.stdout || "");
    await loadServerAuditLog();
    if (options.nextView) showView(options.nextView);
    else showView("commands");
    return result;
  } catch (error) {
    appendOutput(label, false, "", error.message, outputNode, emptyText, pendingText);
    recordOperation(label, false, error.message);
    await loadServerAuditLog();
    return null;
  } finally {
    setBusy(false);
  }
}

async function loadDiffPreview() {
  if (!nodes.commandModalDiffPanel || nodes.commandModalDiffPanel.hidden) return null;
  nodes.commandModalDiff.textContent = "读取中...";
  try {
    const payload = await requestJson("/api/diff-preview");
    nodes.commandModalDiff.textContent = formatDiffPreview(payload);
    return payload;
  } catch (error) {
    nodes.commandModalDiff.textContent = `读取 diff 失败：${error.message}`;
    return null;
  }
}

function formatDiffPreview(payload) {
  if (!payload || !payload.gitAvailable) {
    return ["当前目录没有可用的 Git diff 预览。", payload && payload.stderr ? payload.stderr : ""].filter(Boolean).join("\n");
  }
  const lines = [
    "Git status:",
    payload.status || "(clean)",
    "",
    "Unstaged diff --stat:",
    payload.unstagedStat || "(none)",
    "",
    "Staged diff --stat:",
    payload.stagedStat || "(none)",
  ];
  if (payload.stderr) lines.push("", "Warnings:", payload.stderr);
  return lines.join("\n");
}

function recordOperation(label, ok, detail) {
  if (!nodes.operationLog) return;
  const summary = String(detail || "").replace(/\s+/g, " ").trim().slice(0, 180);
  state.operationLog = [{
    time: new Date().toLocaleString(),
    label,
    ok: Boolean(ok),
    summary,
  }, ...state.operationLog].slice(0, MAX_OPERATION_LOG_ITEMS);
  saveOperationLog();
  renderOperationLog();
}

function renderOperationLog() {
  if (!nodes.operationLog) return;
  if (!state.operationLog.length) {
    nodes.operationLog.textContent = "暂无操作";
    return;
  }
  nodes.operationLog.innerHTML = state.operationLog.map((item) => [
    `<article class="operation-item ${item.ok ? "ok" : "failed"}">`,
    `<strong>${escapeHtml(item.label)} ${item.ok ? "OK" : "FAILED"}</strong>`,
    `<span>${escapeHtml(item.time)}</span>`,
    item.summary ? `<p>${escapeHtml(item.summary)}</p>` : "",
    "</article>",
  ].join("")).join("");
}

async function loadServerAuditLog() {
  if (!nodes.serverAuditLog) return;
  if (!state.features.serverAuditLog) {
    nodes.serverAuditLog.textContent = "\u91cd\u542f Run \u670d\u52a1\u540e\u53ef\u67e5\u770b\u670d\u52a1\u7aef\u5ba1\u8ba1\u65e5\u5fd7\u3002";
    return;
  }
  try {
    const payload = await requestJson("/api/audit-log?limit=30");
    state.serverAuditLog = payload.entries || [];
    state.serverAuditIntegrity = payload.integrity || null;
    renderServerAuditLog(payload.path);
  } catch (error) {
    nodes.serverAuditLog.textContent = `\u8bfb\u53d6\u670d\u52a1\u7aef\u5ba1\u8ba1\u5931\u8d25\uff1a${error.message}`;
  }
}

function renderServerAuditLog(logPath) {
  if (!nodes.serverAuditLog) return;
  if (!state.serverAuditLog.length) {
    nodes.serverAuditLog.textContent = logPath
      ? `\u6682\u65e0\u670d\u52a1\u7aef\u5ba1\u8ba1\u8bb0\u5f55\u3002\u65e5\u5fd7\u6587\u4ef6\uff1a${logPath}`
      : "\u6682\u65e0\u670d\u52a1\u7aef\u5ba1\u8ba1\u8bb0\u5f55";
    return;
  }
  const integrity = state.serverAuditIntegrity;
  const integrityCard = integrity ? [
    `<article class="operation-item ${integrity.ok ? "ok" : "failed"}">`,
    `<strong>${integrity.ok ? "\u5ba1\u8ba1\u94fe\u6821\u9a8c OK" : "\u5ba1\u8ba1\u94fe\u6821\u9a8c FAILED"}</strong>`,
    `<p>${escapeHtml(auditIntegritySummary(integrity))}</p>`,
    "</article>",
  ].join("") : "";
  nodes.serverAuditLog.innerHTML = integrityCard + state.serverAuditLog.map((item) => [
    `<article class="operation-item ${item.ok ? "ok" : "failed"}">`,
    `<strong>${escapeHtml(item.action || "-")} ${item.ok ? "OK" : "FAILED"}</strong>`,
    `<span>${escapeHtml(formatAuditTime(item.timestamp))}</span>`,
    `<p>${escapeHtml(auditSummary(item))}</p>`,
    "</article>",
  ].join("")).join("");
}

function auditIntegritySummary(integrity) {
  const parts = [
    `checked ${Number(integrity.checked || 0)}`,
    `legacy ${Number(integrity.legacy || 0)}`,
  ];
  if (Array.isArray(integrity.issues) && integrity.issues.length) parts.push(integrity.issues.join("; "));
  return parts.join(" | ");
}

function auditSummary(item) {
  const parts = [
    item.route,
    item.kind,
    Number.isInteger(item.status) ? `status ${item.status}` : "",
    item.durationMs ? `${item.durationMs}ms` : "",
    item.timedOut ? "timed out" : "",
    item.memoryPath ? `memory ${item.memoryPath}` : "",
    item.args && item.args.length ? item.args.join(" ") : "",
    item.error ? `error ${item.error}` : "",
  ];
  return parts.filter(Boolean).join(" | ");
}

function formatAuditTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || "-") : date.toLocaleString();
}

function loadOperationLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OPERATION_LOG_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, MAX_OPERATION_LOG_ITEMS) : [];
  } catch (_) {
    return [];
  }
}

function saveOperationLog() {
  try {
    localStorage.setItem(OPERATION_LOG_KEY, JSON.stringify(state.operationLog.slice(0, MAX_OPERATION_LOG_ITEMS)));
  } catch (_) {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function postJson(route, payload) {
  return requestJson(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function requestJson(route, options) {
  const nextOptions = withRunToken(options);
  const response = await fetch(route, nextOptions);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

function withRunToken(options) {
  const token = runToken();
  if (!token) return options;
  const next = { ...(options || {}) };
  next.headers = { ...(next.headers || {}), "X-Guardian-Run-Token": token };
  return next;
}

function runToken() {
  try {
    return localStorage.getItem(RUN_TOKEN_KEY) || "";
  } catch (_) {
    return "";
  }
}

function captureRunTokenFromUrl() {
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (!token) return;
    localStorage.setItem(RUN_TOKEN_KEY, token);
    url.searchParams.delete("token");
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  } catch (_) {
    // Token persistence is optional and only used when the server requires it.
  }
}

function setOutputPending(outputNode, emptyText, pendingText) {
  if (outputNode.textContent === emptyText || !outputNode.textContent.trim()) {
    outputNode.textContent = pendingText;
  }
}

function appendOutput(label, ok, stdout, stderr, outputNode = nodes.output, emptyText = "等待操作...", pendingText = "运行中...") {
  const time = new Date().toLocaleTimeString();
  const status = ok ? "OK" : "FAILED";
  const text = [
    `\n[${time}] ${label} ${status}`,
    stdout ? `\n${stdout.trimEnd()}` : "",
    stderr ? `\nSTDERR:\n${stderr.trimEnd()}` : "",
  ].join("");

  if (outputNode.textContent === emptyText || outputNode.textContent === pendingText) outputNode.textContent = "";
  outputNode.textContent += `${text}\n`;
  outputNode.scrollTop = outputNode.scrollHeight;
}

function renderPlainMemory(text) {
  nodes.memoryViewer.textContent = text;
}

function renderMarkdownMemory(markdown) {
  nodes.memoryViewer.innerHTML = renderMarkdown(markdown);
}

function renderMarkdown(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let index = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph();
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    if (isTableStart(lines, index)) {
      flushParagraph();
      const table = collectTable(lines, index);
      html.push(renderTable(table.rows));
      index = table.nextIndex;
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      const level = Math.min(heading[1].length + 1, 6);
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(trimmed);
    const ordered = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (unordered || ordered) {
      flushParagraph();
      const orderedList = Boolean(ordered);
      const items = [];
      while (index < lines.length) {
        const itemMatch = orderedList
          ? /^\s*\d+\.\s+(.+)$/.exec(lines[index])
          : /^\s*[-*]\s+(.+)$/.exec(lines[index]);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        index += 1;
      }
      const tag = orderedList ? "ol" : "ul";
      html.push(`<${tag}>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`);
      continue;
    }

    paragraph.push(trimmed);
    index += 1;
  }

  flushParagraph();
  return html.join("\n");
}

function isTableStart(lines, index) {
  return isTableRow(lines[index]) && isTableSeparator(lines[index + 1] || "");
}

function isTableRow(line) {
  return /^\s*\|.+\|\s*$/.test(line || "");
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/.test(line || "");
}

function collectTable(lines, startIndex) {
  const rows = [parseTableRow(lines[startIndex])];
  let index = startIndex + 2;
  while (index < lines.length && isTableRow(lines[index])) {
    rows.push(parseTableRow(lines[index]));
    index += 1;
  }
  return { rows, nextIndex: index };
}

function parseTableRow(line) {
  return String(line || "")
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderTable(rows) {
  const [head = [], ...body] = rows;
  const header = `<thead><tr>${head.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead>`;
  const bodyRows = body
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="table-wrap"><table>${header}<tbody>${bodyRows}</tbody></table></div>`;
}

function renderInline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function setBadge(text, bad) {
  nodes.serverBadge.textContent = text;
  nodes.serverBadge.classList.toggle("bad", Boolean(bad));
}

function setBusy(busy) {
  document.querySelectorAll("button").forEach((button) => {
    const permanentlyDisabled = button.dataset.disabled === "true";
    const reloadWithoutSelection = button === nodes.reloadMemory && !state.selectedMemory;
    button.disabled = Boolean(busy || permanentlyDisabled || reloadWithoutSelection);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (typeof module !== "undefined") {
  module.exports = {
    appendOutput,
    commandGroupsForDisplay,
    filterCommandsForSearch,
    formatDiffPreview,
    renderMarkdown,
    renderTable,
    parseTableRow,
    setOutputPending,
    templatesForMemoryFromList,
  };
}



async function loadReviews() {
  try {
    const data = await requestJson('/api/reviews');
    renderReviewList(data);
  } catch (error) {
    if (nodes.reviewList) nodes.reviewList.innerHTML = '<p class="muted">加载失败: ' + escapeHtml(error.message) + '</p>';
  }
}

function renderReviewList(data) {
  if (!nodes.reviewList) return;
  if (!data || !data.ok || !data.items || data.items.length === 0) {
    nodes.reviewList.innerHTML = '<p class="muted">暂无复审记录</p>';
    return;
  }

  const items = data.items;
  const statusLabels = {
    completed: { label: '已完成', cls: 'review-badge-completed' },
    due: { label: '已到期', cls: 'review-badge-due' },
    scheduled: { label: '待复审', cls: 'review-badge-scheduled' },
  };

  let html = '<div class="review-grid">';
  for (const item of items) {
    const statusInfo = statusLabels[item.status] || { label: item.status, cls: '' };
    const fileName = item.file.split('/').pop();
    html += '<button class="review-item" type="button" data-file="' + escapeHtml(item.file) + '">';
    html += '<strong>' + escapeHtml(item.title) + '</strong>';
    html += '<span class="review-meta filename">' + escapeHtml(fileName) + '</span>';
    if (item.reviewAfter) html += '<span class="review-meta">' + escapeHtml(item.reviewAfter) + '</span>';
    html += '<span class="review-badge ' + statusInfo.cls + '">' + statusInfo.label + '</span>';
    html += '</button>';
  }
  html += '</div>';

  nodes.reviewList.innerHTML = html;

  nodes.reviewList.querySelectorAll('.review-item').forEach(function(btn) {
    btn.addEventListener('click', function() {
      selectReviewFile(btn.dataset.file);
    });
  });
}

async function selectReviewFile(file) {
  if (!nodes.reviewViewer) return;
  nodes.reviewViewer.textContent = '正在加载...';
  nodes.reviewViewerTitle.textContent = file.split('/').pop();
  nodes.reviewViewerPath.textContent = file;

  try {
    const data = await requestJson('/api/review-file?file=' + encodeURIComponent(file));
    if (!data.ok) {
      nodes.reviewViewer.innerHTML = '<p class="muted">' + escapeHtml(data.error || '读取失败') + '</p>';
      return;
    }
    if (data.tooLarge) {
      nodes.reviewViewer.innerHTML = '<p class="muted">文件过大，无法预览（' + data.size + ' 字节）</p>';
      return;
    }
    nodes.reviewViewer.innerHTML = renderMarkdown(data.content || '');
  } catch (error) {
    nodes.reviewViewer.innerHTML = '<p class="muted">加载失败: ' + escapeHtml(error.message) + '</p>';
  }
}

if (typeof document !== "undefined") loadStatus();
