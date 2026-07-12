"use strict";

const { SUPPORTED_ADAPTERS, ADAPTER_ALIASES } = require("./adapters");

function validateAdapters(raw) {
  if (raw == null) return [];
  try {
    expandAdapterNames(raw, []);
    return [];
  } catch (error) {
    return [error.message];
  }
}

function expandAdapterNames(raw, fallback) {
  const values = Array.isArray(raw) ? raw : String(raw).split(",");
  const requested = values.map((value) => canonicalAdapter(String(value).trim())).filter(Boolean);
  const selected = requested.length > 0 ? requested : fallback;
  const expanded = selected.includes("all") ? SUPPORTED_ADAPTERS : selected;
  const unknown = expanded.filter((adapter) => !SUPPORTED_ADAPTERS.includes(adapter));
  if (unknown.length > 0) {
    const supported = [...SUPPORTED_ADAPTERS, ...Object.keys(ADAPTER_ALIASES), "all"];
    throw new Error(`unknown adapter: ${unknown.join(", ")}. Use one of: ${supported.join(", ")}`);
  }
  return [...new Set(expanded)];
}

function canonicalAdapter(value) {
  return ADAPTER_ALIASES[value] || value;
}

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

module.exports = {
  canonicalAdapter,
  expandAdapterNames,
  validateAdapters,
};
