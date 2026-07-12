"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const AUDIT_DIR = ".project-guardian";
const AUDIT_LOG_FILE = "run-audit.jsonl";
const HASH_ALGORITHM = "sha256";
const GENESIS_HASH = "GENESIS";
const MAX_AUDIT_EVENTS = 200;
const MAX_AUDIT_DETAIL = 240;

function appendAuditEvent(context, event) {
  try {
    fs.mkdirSync(path.join(context.projectRoot, AUDIT_DIR), { recursive: true });
    const previous = lastAuditHash(context);
    const next = sanitizeAuditEvent(event);
    next.sequence = previous.sequence + 1;
    next.previousHash = previous.hash;
    next.hashAlgorithm = HASH_ALGORITHM;
    next.hash = hashAuditEvent(next);
    fs.appendFileSync(auditLogPath(context), `${JSON.stringify(next)}\n`, "utf8");
    context._lastAuditFailed = false;
    return true;
  } catch (error) {
    context._lastAuditFailed = true;
    context._lastAuditError = error.message;
    if (event.kind === "write" || event.kind === "security") {
      console.error(`Audit log write failed for write/security operation: ${error.message}`);
    }
    return false;
  }
}

function readAuditLogPayload(context, rawLimit) {
  const limit = validateAuditLimit(rawLimit);
  const file = auditLogPath(context);
  const payload = {
    ok: true,
    path: auditLogRelativePath(),
    exists: fs.existsSync(file),
    tamperEvident: true,
    integrity: {
      ok: true,
      checked: 0,
      legacy: 0,
      issues: [],
    },
    entries: [],
  };
  if (!payload.exists) {
    if (context._lastAuditFailed || context._auditHadEvents) {
      payload.integrity.ok = false;
      payload.integrity.issues.push("Audit log file is missing but audit events were previously recorded.");
    }
    return payload;
  }
  context._auditHadEvents = true;

  const lines = readAuditLines(file);
  const parsed = lines.map(parseAuditLine).filter(Boolean);
  payload.integrity = verifyAuditEntries(parsed);
  payload.entries = parsed.slice(-limit).reverse();
  return payload;
}

function verifyAuditEntries(entries) {
  const result = {
    ok: true,
    checked: 0,
    legacy: 0,
    issues: [],
  };
  let previousHash = GENESIS_HASH;
  let seenHashed = false;

  entries.forEach((entry, index) => {
    if (!entry.hash || !entry.hashAlgorithm) {
      result.legacy += 1;
      return;
    }
    result.checked += 1;
    if (entry.hashAlgorithm !== HASH_ALGORITHM) {
      result.issues.push(`line ${index + 1}: unsupported hash algorithm ${entry.hashAlgorithm}`);
    }
    if (seenHashed && entry.previousHash !== previousHash) {
      result.issues.push(`line ${index + 1}: previous hash does not match`);
    }
    if (!seenHashed && entry.previousHash !== GENESIS_HASH) {
      result.issues.push(`line ${index + 1}: first hashed entry must start from ${GENESIS_HASH}`);
    }
    const expected = hashAuditEvent(entry);
    if (entry.hash !== expected) {
      result.issues.push(`line ${index + 1}: event hash does not match`);
    }
    previousHash = entry.hash;
    seenHashed = true;
  });
  result.ok = result.issues.length === 0;
  return result;
}

function isRunAuthRequired() {
  return Boolean(runAuthToken());
}

function isAuthorizedApiRequest(req, requestUrl) {
  const token = runAuthToken();
  if (!token) return true;
  const headerToken = String(req.headers["x-guardian-run-token"] || "").trim();
  if (constantTimeEquals(headerToken, token)) return true;
  const authorization = String(req.headers.authorization || "").trim();
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  if (bearer && constantTimeEquals(bearer[1].trim(), token)) return true;
  const queryToken = requestUrl && requestUrl.searchParams ? requestUrl.searchParams.get("token") : null;
  if (queryToken && constantTimeEquals(queryToken, token)) return true;
  return false;
}

function sanitizeAuditEvent(event) {
  return removeUndefined({
    timestamp: new Date().toISOString(),
    action: sanitizeAuditText(event.action, 80),
    route: sanitizeAuditText(event.route, 80),
    kind: sanitizeAuditText(event.kind, 32),
    ok: Boolean(event.ok),
    status: Number.isInteger(event.status) ? event.status : null,
    timedOut: Boolean(event.timedOut),
    durationMs: Number.isInteger(event.durationMs) ? event.durationMs : null,
    args: Array.isArray(event.args) ? event.args.map((item) => sanitizeAuditText(item, 120)).slice(0, 20) : [],
    questionLength: Number.isInteger(event.questionLength) ? event.questionLength : undefined,
    limit: Number.isInteger(event.limit) ? event.limit : undefined,
    mode: event.mode ? sanitizeAuditText(event.mode, 32) : undefined,
    language: event.language ? sanitizeAuditText(event.language, 32) : undefined,
    adapter: event.adapter ? sanitizeAuditText(event.adapter, 32) : undefined,
    memoryName: event.memoryName ? sanitizeAuditText(event.memoryName, 80) : undefined,
    memoryPath: event.memoryPath ? sanitizeAuditText(event.memoryPath, 160) : undefined,
    templateId: event.templateId ? sanitizeAuditText(event.templateId, 80) : undefined,
    fieldNames: Array.isArray(event.fieldNames) ? event.fieldNames.map((item) => sanitizeAuditText(item, 80)).slice(0, 20) : undefined,
    mcpTool: event.mcpTool ? sanitizeAuditText(event.mcpTool, 80) : undefined,
    mcpArgumentNames: Array.isArray(event.mcpArgumentNames) ? event.mcpArgumentNames.map((item) => sanitizeAuditText(item, 80)).slice(0, 20) : undefined,
    confirmationRequired: event.confirmationRequired === undefined ? undefined : Boolean(event.confirmationRequired),
    error: event.error ? sanitizeAuditText(event.error, MAX_AUDIT_DETAIL) : undefined,
  });
}

function summarizeAuditArgs(action, args) {
  if (action === "query") return ["query", "<question>", ...args.slice(2)];
  if (action === "brief") return ["brief", "<question>", ...args.slice(2)];
  return args;
}

function sanitizeAuditText(value, limit) {
  return redactLikelySecret(String(value || "").replace(/\s+/g, " ").trim()).slice(0, limit);
}

function redactLikelySecret(value) {
  return value
    .replace(/\b(password|passwd|secret|token|api[_-]?key|private[_-]?key)\b\s*[:=]\s*["']?[^"'\s]+/gi, "$1=[redacted]")
    .replace(/[A-Za-z0-9+/=_-]{40,}/g, "[redacted-token]");
}

function hashAuditEvent(event) {
  const copy = { ...event };
  delete copy.hash;
  return crypto.createHash(HASH_ALGORITHM).update(JSON.stringify(copy)).digest("hex");
}

function lastAuditHash(context) {
  const file = auditLogPath(context);
  if (!fs.existsSync(file)) return { hash: GENESIS_HASH, sequence: 0 };
  const entries = readAuditLines(file).map(parseAuditLine).filter(Boolean);
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry.hash && Number.isInteger(entry.sequence)) return { hash: entry.hash, sequence: entry.sequence };
  }
  return { hash: GENESIS_HASH, sequence: entries.length };
}

function readAuditLines(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
}

function parseAuditLine(line) {
  try {
    return JSON.parse(line);
  } catch (_) {
    return null;
  }
}

function validateAuditLimit(value) {
  if (value === undefined || value === null || value === "") return 80;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_AUDIT_EVENTS) {
    throw new Error(`Limit must be an integer from 1 to ${MAX_AUDIT_EVENTS}.`);
  }
  return limit;
}

function auditLogPath(context) {
  return path.join(context.projectRoot, AUDIT_DIR, AUDIT_LOG_FILE);
}

function auditLogRelativePath() {
  return path.join(AUDIT_DIR, AUDIT_LOG_FILE).replace(/\\/g, "/");
}

function runAuthToken() {
  return String(process.env.GUARDIAN_RUN_TOKEN || "").trim();
}

function constantTimeEquals(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

module.exports = {
  AUDIT_LOG_FILE,
  AUDIT_DIR,
  appendAuditEvent,
  auditLogPath,
  auditLogRelativePath,
  hashAuditEvent,
  isAuthorizedApiRequest,
  isRunAuthRequired,
  readAuditLogPayload,
  sanitizeAuditEvent,
  summarizeAuditArgs,
  verifyAuditEntries,
  constantTimeEquals,
  redactLikelySecret,
  sanitizeAuditText,
};
