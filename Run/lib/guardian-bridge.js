"use strict";

/**
 * Bridge layer between Run visual layer and plugin internal modules.
 * Run/server.js and Run/lib/commands.js should import from here
 * instead of directly requiring plugin internals.
 */

const {
  MEMORY_FILE_CONFIG,
  buildManualMemoryContent,
  buildManualMemoryEntry,
  memoryFilesForConfig,
  publicMemoryAppendTemplates,
  resolveMemoryTarget: resolveConfiguredMemoryTarget,
} = require("../../plugins/project-guardian/scripts/lib/manual-memory");

const { loadConfig } = require("../../plugins/project-guardian/scripts/lib/config");

const { executeMcpTool, publicMcpStatus, TaskQueue } = require("../../plugins/project-guardian/scripts/lib/mcp");

const {
  getDecisionFiles,
  getReviewItems,
  reviewItem,
  runReviewValidation,
} = require("../../plugins/project-guardian/scripts/lib/reviews");

const { containsLikelySecret } = require("../../plugins/project-guardian/scripts/lib/shared");

module.exports = {
  // manual-memory
  MEMORY_FILE_CONFIG,
  buildManualMemoryContent,
  buildManualMemoryEntry,
  memoryFilesForConfig,
  publicMemoryAppendTemplates,
  resolveConfiguredMemoryTarget,
  // config
  loadConfig,
  // mcp
  executeMcpTool,
  publicMcpStatus,
  TaskQueue,
  // reviews
  getDecisionFiles,
  getReviewItems,
  reviewItem,
  runReviewValidation,
  // shared
  containsLikelySecret,
};
