"use strict";

const commandKindLabels = {
  read: "只读",
  write: "写入",
  linked: "专用模块",
  terminal: "终端",
};

const viewTitles = {
  overview: ["状态概览", "插件状态概览"],
  memory: ["核心记忆", "核心记忆文件"],
  init: ["插件初始化", "初始化 Project Guardian"],
  append: ["追加记忆", "手动追加项目记忆"],
  brief: ["读取计划", "生成记忆读取计划"],
  query: ["知识查询", "查询本地项目知识"],
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
  selectedMemory: "",
  currentView: "overview",
  sidebarCollapsed: false,
  activeCommand: null,
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
  commandButtons: document.querySelector("#commandButtons"),
  output: document.querySelector("#output"),
  queryOutput: document.querySelector("#queryOutput"),
  refreshStatus: document.querySelector("#refreshStatus"),
  clearOutput: document.querySelector("#clearOutput"),
  clearQueryOutput: document.querySelector("#clearQueryOutput"),
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
  commandModalFields: document.querySelector("#commandModalFields"),
  commandModalConfirmLabel: document.querySelector("#commandModalConfirmLabel"),
  commandModalConfirm: document.querySelector("#commandModalConfirm"),
};

if (typeof document !== "undefined") {
  setSidebarCollapsed(localStorage.getItem("projectGuardianSidebar") === "collapsed");
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
  nodes.appendMemoryName.addEventListener("change", renderAppendTemplateOptions);
  nodes.appendTemplate.addEventListener("change", renderAppendTemplateFields);
  nodes.commandModalClose.addEventListener("click", closeCommandModal);
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
      appendOutput("追加记忆", true, `已写入 ${result.path}，当前大小 ${result.size} bytes。`, "", nodes.output, "等待操作...", "写入中...");
      clearFields(nodes.appendTemplateFields);
      nodes.appendConfirm.value = "";
      await loadStatus();
      await loadMemoryFile(result.name);
      showView("memory");
    } catch (error) {
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
    await postAndRender("/api/brief", payload, "guardian brief");
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
  const normalized = String(memoryName || "").toUpperCase();
  return state.memoryAppendTemplates.filter((template) => template.target === normalized || template.target === "*");
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
  for (const command of commands) {
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
    nodes.commandButtons.appendChild(card);
  }
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
  nodes.commandModal.hidden = false;
  const firstInput = nodes.commandModal.querySelector("input:not([type='hidden']), textarea, select");
  if (firstInput) firstInput.focus();
}

function closeCommandModal() {
  nodes.commandModal.hidden = true;
  state.activeCommand = null;
  nodes.commandModalForm.reset();
  nodes.commandModalFields.innerHTML = "";
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
    if (options.nextView) showView(options.nextView);
    else showView("commands");
    return result;
  } catch (error) {
    appendOutput(label, false, "", error.message, outputNode, emptyText, pendingText);
    return null;
  } finally {
    setBusy(false);
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
  const response = await fetch(route, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
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
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line || "");
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
    renderMarkdown,
    renderTable,
    parseTableRow,
    setOutputPending,
  };
}

if (typeof document !== "undefined") loadStatus();
