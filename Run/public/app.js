"use strict";

const commandLabels = {
  doctor: "Doctor 体检",
  verify: "Verify 全量检查",
  "validate-docs": "Validate Docs",
  reviews: "Reviews 列表",
  "reviews-due": "Reviews Due",
  "scan-secrets": "Scan Secrets",
  "adapters-doctor": "Adapters Doctor",
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
  selectedMemory: "",
};

const nodes = {
  serverBadge: document.querySelector("#serverBadge"),
  projectRoot: document.querySelector("#projectRoot"),
  nodeVersion: document.querySelector("#nodeVersion"),
  guardianState: document.querySelector("#guardianState"),
  memoryFiles: document.querySelector("#memoryFiles"),
  memoryViewerTitle: document.querySelector("#memoryViewerTitle"),
  memoryViewer: document.querySelector("#memoryViewer"),
  reloadMemory: document.querySelector("#reloadMemory"),
  commandButtons: document.querySelector("#commandButtons"),
  output: document.querySelector("#output"),
  refreshStatus: document.querySelector("#refreshStatus"),
  clearOutput: document.querySelector("#clearOutput"),
  initForm: document.querySelector("#initForm"),
  appendMemoryForm: document.querySelector("#appendMemoryForm"),
  appendMemoryName: document.querySelector("#appendMemoryName"),
  appendMemoryContent: document.querySelector("#appendMemoryContent"),
  appendConfirm: document.querySelector("#appendConfirm"),
  initConfirm: document.querySelector("#initConfirm"),
  briefForm: document.querySelector("#briefForm"),
  queryForm: document.querySelector("#queryForm"),
};

nodes.refreshStatus.addEventListener("click", loadStatus);
nodes.reloadMemory.addEventListener("click", async () => {
  if (state.selectedMemory) await loadMemoryFile(state.selectedMemory);
});
nodes.clearOutput.addEventListener("click", () => {
  nodes.output.textContent = "等待操作...";
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
    content: nodes.appendMemoryContent.value,
    confirm: nodes.appendConfirm.value,
  };

  setBusy(true);
  appendOutput("追加记忆", true, "写入中...", "");
  try {
    const result = await postJson("/api/memory/append", payload);
    appendOutput("追加记忆", true, `已写入 ${result.path}，当前大小 ${result.size} bytes。`, "");
    nodes.appendMemoryContent.value = "";
    nodes.appendConfirm.value = "";
    await loadStatus();
    await loadMemoryFile(result.name);
  } catch (error) {
    appendOutput("追加记忆", false, "", error.message);
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
  await postAndRender("/api/query", payload, "guardian query");
});

async function loadStatus() {
  setBadge("加载中", false);
  try {
    const payload = await requestJson("/api/status");
    state.actions = payload.actions || [];
    state.features = payload.features || {};
    state.confirmations = payload.confirmations || state.confirmations;
    state.memoryFiles = payload.memoryFiles || [];
    nodes.projectRoot.textContent = payload.projectRoot || "-";
    nodes.nodeVersion.textContent = payload.nodeVersion || "-";
    nodes.guardianState.textContent = payload.guardianAvailable ? "已找到 CLI" : "未找到 CLI";
    nodes.initConfirm.placeholder = `输入 ${state.confirmations.init}`;
    nodes.appendConfirm.placeholder = `输入 ${state.confirmations.appendMemory}`;
    setBadge(payload.guardianAvailable ? "可用" : "缺少 CLI", !payload.guardianAvailable);
    renderCompatibilityWarning(payload);
    setWriteFormAvailability();
    renderMemoryFiles(state.memoryFiles);
    renderMemorySelect(state.memoryFiles);
    renderCommandButtons();
  } catch (error) {
    setBadge("连接失败", true);
    appendOutput("status", false, "", error.message);
  }
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
  nodes.memoryViewer.textContent = "读取中...";
  try {
    const result = await requestJson(`/api/memory?name=${encodeURIComponent(name)}`);
    if (!result.exists) {
      nodes.memoryViewer.textContent = `${result.path} 不存在。可以先运行 guardian init。`;
    } else if (result.tooLarge) {
      nodes.memoryViewer.textContent = `${result.path} 文件过大，已超过网页预览上限。`;
    } else {
      nodes.memoryViewer.textContent = result.content || "(空文件)";
    }
    renderMemoryFiles(state.memoryFiles);
  } catch (error) {
    nodes.memoryViewer.textContent = error.message;
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
  for (const action of state.actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = commandLabels[action] || action;
    button.addEventListener("click", async () => {
      await postAndRender("/api/command", { action }, `guardian ${action}`);
    });
    nodes.commandButtons.appendChild(button);
  }
}

async function postAndRender(route, payload, label) {
  setBusy(true);
  appendOutput(label, true, "运行中...", "");
  try {
    const result = await postJson(route, payload);
    appendOutput(label, result.ok, result.stdout || "", result.stderr || "");
    return result;
  } catch (error) {
    appendOutput(label, false, "", error.message);
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

function appendOutput(label, ok, stdout, stderr) {
  const time = new Date().toLocaleTimeString();
  const status = ok ? "OK" : "FAILED";
  const text = [
    `\n[${time}] ${label} ${status}`,
    stdout ? `\n${stdout.trimEnd()}` : "",
    stderr ? `\nSTDERR:\n${stderr.trimEnd()}` : "",
  ].join("");

  if (nodes.output.textContent === "等待操作...") nodes.output.textContent = "";
  nodes.output.textContent += `${text}\n`;
  nodes.output.scrollTop = nodes.output.scrollHeight;
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

loadStatus();
