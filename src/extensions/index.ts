/**
 * All custom tools — barrel export.
 */

import { webSearchTool, webFetchTool } from "./web-tools.js";
import {
  browserNavigateTool,
  browserScreenshotTool,
  browserClickTool,
  browserTypeTool,
} from "./browser-tools.js";
import {
  artifactExcelTool,
  artifactPptxTool,
  artifactDocxTool,
} from "./artifact-tools.js";
import {
  githubCreateIssueTool,
  githubCreatePrTool,
  githubApiTool,
} from "./github-tools.js";
import { memoryReadTool, memoryWriteTool, memoryListTool, memorySearchTool, memoryDeleteTool } from "./memory-tools.js";
import { gitCommitArtifactsTool } from "./git-commit.js";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

/**
 * All custom tools as an array, ready for createAgentSession({ customTools }).
 *
 * Type assertion required: each tool has a specific TParams generic, but
 * the SDK's customTools array expects the base ToolDefinition<TSchema>.
 * This is a known contravariance issue with TypeBox generics.
 */
export const gitgentTools = [
  webSearchTool,
  webFetchTool,
  browserNavigateTool,
  browserScreenshotTool,
  browserClickTool,
  browserTypeTool,
  artifactExcelTool,
  artifactPptxTool,
  artifactDocxTool,
  githubCreateIssueTool,
  githubCreatePrTool,
  githubApiTool,
  memoryReadTool,
  memoryWriteTool,
  memoryListTool,
  memorySearchTool,
  memoryDeleteTool,
  gitCommitArtifactsTool,
] as unknown as ToolDefinition[];
