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
};

const nodes = {
  serverBadge: document.querySelector("#serverBadge"),
  projectRoot: document.querySelector("#projectRoot"),
  nodeVersion: document.querySelector("#nodeVersion"),
  guardianState: document.querySelector("#guardianState"),
  memoryFiles: document.querySelector("#memoryFiles"),
  commandButtons: document.querySelector("#commandButtons"),
  output: document.querySelector("#output"),
  refreshStatus: document.querySelector("#refreshStatus"),
  clearOutput: document.querySelector("#clearOutput"),
  briefForm: document.querySelector("#briefForm"),
  queryForm: document.querySelector("#queryForm"),
};

nodes.refreshStatus.addEventListener("click", loadStatus);
nodes.clearOutput.addEventListener("click", () => {
  nodes.output.textContent = "等待操作...";
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
    nodes.projectRoot.textContent = payload.projectRoot || "-";
    nodes.nodeVersion.textContent = payload.nodeVersion || "-";
    nodes.guardianState.textContent = payload.guardianAvailable ? "已找到 CLI" : "未找到 CLI";
    setBadge(payload.guardianAvailable ? "可用" : "缺少 CLI", !payload.guardianAvailable);
    renderMemoryFiles(payload.memoryFiles || []);
    renderCommandButtons();
  } catch (error) {
    setBadge("连接失败", true);
    appendOutput("status", false, "", error.message);
  }
}

function renderMemoryFiles(files) {
  nodes.memoryFiles.innerHTML = "";
  for (const file of files) {
    const item = document.createElement("div");
    item.className = `memory-item ${file.exists ? "ok" : "missing"}`;
    item.innerHTML = `<strong>${escapeHtml(file.name)} ${file.exists ? "存在" : "缺失"}</strong><span>${escapeHtml(file.path)}</span>`;
    nodes.memoryFiles.appendChild(item);
  }
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
    const result = await requestJson(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    appendOutput(label, result.ok, result.stdout || "", result.stderr || "");
  } catch (error) {
    appendOutput(label, false, "", error.message);
  } finally {
    setBusy(false);
  }
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
    button.disabled = busy;
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
