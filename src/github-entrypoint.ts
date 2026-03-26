/**
 * GitHub Actions entrypoint — reads prompt from issue/comment events
 * and runs the PI agent, posting results back as issue comments.
 *
 * Triggers:
 * - Issue created with "gitgent" label (from templates)
 * - Comment starting with "/gitgent" (slash command)
 *
 * Responses posted by github-actions[bot] using GITHUB_TOKEN.
 */

import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createAgentSession,
  SessionManager,
  SettingsManager,
} from "@mariozechner/pi-coding-agent";
import {
  DEFAULT_OPENROUTER_MODEL,
  buildSessionSettings,
  formatExecutionTarget,
  loadConfig,
  buildExecutionTarget,
  isApiKeyProvider,
  isOAuthProvider,
  requiredKeyEnvNames,
} from "./config.js";
import type { ExecutionTarget } from "./config.js";
import { createGitgentAuthContext, createGitgentBuiltInTools, createOpenRouterFallbackModel, createProviderFallbackModel } from "./agent-runtime.js";
import { gitgentTools } from "./extensions/index.js";
import { writeAutoDailyLog } from "./extensions/memory-tools.js";

import { hooks } from "./hooks.js";

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

interface GitHubEvent {
  action: string;
  issue?: {
    number: number;
    title: string;
    body: string;
    labels: Array<{ name: string }>;
    html_url: string;
  };
  comment?: {
    body: string;
    user: { login: string };
  };
}

const GITHUB_API = "https://api.github.com";

function githubHeaders(): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function postComment(issueNumber: number, body: string): Promise<void> {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return;

  const res = await fetch(`${GITHUB_API}/repos/${repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    headers: githubHeaders(),
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    console.error(`⚠️ postComment failed: ${res.status} ${res.statusText}`);
  }
}

function workflowRunLink(repo: string): string {
  return `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;
}

function formatKeyNamesForText(provider: string): string {
  return requiredKeyEnvNames(provider).map((name) => `\`${name}\``).join(" or ");
}

function formatKeyNamesForList(provider: string): string[] {
  return requiredKeyEnvNames(provider).map((name) => `- \`${name}\``);
}

async function postPhaseComment(
  issueNumber: number,
  title: string,
  lines: string[],
): Promise<void> {
  const repo = process.env.GITHUB_REPOSITORY || "";

  // Keep in-flight work visible as open; completed runs close explicitly.
  await setIssueState(issueNumber, "open");
  const body = [
    `## ${title}`,
    "",
    ...lines,
    "",
    "___",
    `_[View workflow run](${workflowRunLink(repo)})_`,
  ].filter(Boolean).join("\n");

  await postComment(issueNumber, body);
}

async function setIssueState(
  issueNumber: number,
  state: "open" | "closed",
): Promise<void> {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return;

  const res = await fetch(`${GITHUB_API}/repos/${repo}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: githubHeaders(),
    body: JSON.stringify({ state }),
  });

  if (!res.ok) {
    console.error(`⚠️ setIssueState(${state}) failed: ${res.status} ${res.statusText}`);
  }
}

async function addLabels(issueNumber: number, labels: string[]): Promise<void> {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return;

  await fetch(`${GITHUB_API}/repos/${repo}/issues/${issueNumber}/labels`, {
    method: "POST",
    headers: githubHeaders(),
    body: JSON.stringify({ labels }),
  });
}

async function removeLabel(issueNumber: number, label: string): Promise<void> {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return;

  await fetch(
    `${GITHUB_API}/repos/${repo}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`,
    { method: "DELETE", headers: githubHeaders() },
  ).catch(() => {});
}

// ---------------------------------------------------------------------------
// Artifact listing — generates clickable links for the completion comment
// ---------------------------------------------------------------------------

/**
 * List files in the issue-specific artifacts directory.
 * Only shows artifacts from this issue — not from other runs.
 */
function listArtifacts(
  issueDir: string,
  repo: string,
  issueNumber: number,
  defaultBranch: string,
): string[] {
  if (!existsSync(issueDir)) return [];

  const files: string[] = [];
  const repoArtifactPath = `artifacts/issue-${issueNumber}`;

  const scan = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const relPath = prefix ? `${prefix}/${entry}` : entry;
      const st = statSync(fullPath);
      if (st.isDirectory()) {
        scan(fullPath, relPath);
      } else if (st.size > 0) {
        const sizeStr = st.size > 1024 * 1024
          ? `${(st.size / (1024 * 1024)).toFixed(1)} MB`
          : st.size > 1024
            ? `${(st.size / 1024).toFixed(1)} KB`
            : `${st.size} B`;
        const link = `https://github.com/${repo}/blob/${defaultBranch}/${repoArtifactPath}/${relPath}`;
        files.push(`- [📄 \`${relPath}\`](${link}) (${sizeStr})`);
      }
    }
  };
  scan(issueDir, "");
  return files;
}

function collectArtifactSignatures(issueDir: string): Map<string, string> {
  const signatures = new Map<string, string>();
  if (!existsSync(issueDir)) return signatures;

  const scan = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const relPath = prefix ? `${prefix}/${entry}` : entry;
      const st = statSync(fullPath);
      if (st.isDirectory()) {
        scan(fullPath, relPath);
      } else if (st.size > 0) {
        signatures.set(relPath, `${st.size}:${Math.floor(st.mtimeMs)}`);
      }
    }
  };

  scan(issueDir, "");
  return signatures;
}

function listNewOrChangedArtifacts(
  issueDir: string,
  repo: string,
  issueNumber: number,
  defaultBranch: string,
  baseline: Map<string, string>,
): string[] {
  if (!existsSync(issueDir)) return [];

  const files: string[] = [];
  const repoArtifactPath = `artifacts/issue-${issueNumber}`;

  const scan = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const relPath = prefix ? `${prefix}/${entry}` : entry;
      const st = statSync(fullPath);

      if (st.isDirectory()) {
        scan(fullPath, relPath);
        continue;
      }

      if (st.size <= 0) continue;

      const sig = `${st.size}:${Math.floor(st.mtimeMs)}`;
      const baselineSig = baseline.get(relPath);
      const isNewOrChanged = !baselineSig || baselineSig !== sig;
      if (!isNewOrChanged) continue;

      const sizeStr = st.size > 1024 * 1024
        ? `${(st.size / (1024 * 1024)).toFixed(1)} MB`
        : st.size > 1024
          ? `${(st.size / 1024).toFixed(1)} KB`
          : `${st.size} B`;
      const link = `https://github.com/${repo}/blob/${defaultBranch}/${repoArtifactPath}/${relPath}`;
      files.push(`- [📄 \`${relPath}\`](${link}) (${sizeStr})`);
    }
  };

  scan(issueDir, "");
  return files;
}

interface RuntimeDiagnostics {
  toolCallCount: number;
  autoRetryCount: number;
  retryMessages: string[];
  assistantPreview: string;
  recoveryAttempted: boolean;
  recoveryProducedArtifacts: boolean;
}

function writeFailureDiagnosticsArtifact(
  issueDir: string,
  issueNumber: number,
  skill: string | null,
  prompt: string,
  target: ExecutionTarget,
  lastError: string,
  runtimeDiagnostics: RuntimeDiagnostics,
): string | null {
  const fileName = "failure-diagnostics.md";
  const fullPath = join(issueDir, fileName);
  const formattedTarget = formatExecutionTarget(target);

  const content = [
    "# Gitgent Failure Diagnostics",
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Issue: #${issueNumber}`,
    skill ? `- Skill: ${skill}` : "- Skill: none",
    "",
    "## Execution Target",
    "",
    `- \`${formattedTarget}\``,
    "",
    "## Last Error",
    "",
    "```",
    (lastError || "No explicit error captured.").slice(0, 2000),
    "```",
    "",
    "## Runtime Signals",
    "",
    `- Tool calls: ${runtimeDiagnostics.toolCallCount}`,
    `- Auto-retries: ${runtimeDiagnostics.autoRetryCount}`,
    `- Recovery attempt executed: ${runtimeDiagnostics.recoveryAttempted ? "yes" : "no"}`,
    `- Recovery produced artifacts: ${runtimeDiagnostics.recoveryProducedArtifacts ? "yes" : "no"}`,
    ...(runtimeDiagnostics.retryMessages.length > 0
      ? [
        "",
        "### Retry Details",
        "",
        ...runtimeDiagnostics.retryMessages.map((line) => `- ${line}`),
      ]
      : []),
    ...(runtimeDiagnostics.assistantPreview
      ? [
        "",
        "### Assistant Output Preview",
        "",
        "```text",
        runtimeDiagnostics.assistantPreview.slice(0, 2000),
        "```",
      ]
      : []),
    "",
    "## Prompt Snapshot",
    "",
    "```markdown",
    prompt.slice(0, 4000),
    "```",
    "",
    "## Suggested Next Steps",
    "",
    `1. Verify credentials and quota for \`${formattedTarget}\`${isApiKeyProvider(target.provider) ? ` (${formatKeyNamesForText(target.provider)})` : ""}.`,
    "2. Re-run with `/gitgent` and a narrower, concrete request.",
    `3. Confirm \`GITGENT_PROVIDER\` and \`GITGENT_MODEL\` match an available PI model. Default OpenRouter target: \`${DEFAULT_OPENROUTER_MODEL}\`.`,
    "4. Inspect workflow logs and adjust prompt constraints if tool calling failed.",
  ].join("\n");

  try {
    writeFileSync(fullPath, content, "utf-8");
    return fileName;
  } catch (error) {
    console.error(`⚠️ Failed to write diagnostics artifact: ${error}`);
    return null;
  }
}

const SKILL_DELIVERABLES: Record<string, string[]> = {
  "research": ["research-report.md"],
  "marketing": ["marketing-analysis.md", "competitor-matrix.csv"],
  "data-analysis": ["analysis-report.md", "analysis-data.csv"],
  "document-generation": ["generated-document.md"],
  "content-writing": ["content-draft.md"],
  "news-briefing": ["news-briefing.md", "news-tracker.csv"],
  "website-builder": ["website-report.md"],
  "job-search": ["jobs-report.md", "jobs-table.csv"],
};

function getSkillDeliverables(skill: string | null): string[] {
  if (!skill) return [];
  return SKILL_DELIVERABLES[skill] || [];
}

// ---------------------------------------------------------------------------
// Attachment scanning — files downloaded by workflow step via `gh` CLI
// ---------------------------------------------------------------------------

/**
 * Scan the attachments/ directory for files downloaded by the workflow.
 * Attachments are pre-downloaded by the GitHub Actions workflow step using
 * `gh` CLI, which handles GitHub session auth that GITHUB_TOKEN cannot.
 */
function scanAttachments(attachDir: string): string[] {
  if (!existsSync(attachDir)) return [];

  const files = readdirSync(attachDir)
    .map((f) => join(attachDir, f))
    .filter((f) => {
      const st = statSync(f);
      return st.isFile() && st.size > 0;
    });

  return files;
}

// ---------------------------------------------------------------------------
// Prompt extraction
// ---------------------------------------------------------------------------

function extractSkillFromLabels(labels: Array<{ name: string }>): string | null {
  const skillLabel = labels.find((l) => l.name.startsWith("skill:"));
  if (!skillLabel) return null;

  const skill = skillLabel.name.replace("skill:", "");

  // Validate skill name to prevent path traversal via crafted labels
  if (!/^[a-z0-9][a-z0-9-]*$/.test(skill)) {
    console.warn(`⚠️ Invalid skill name "${skill}" — must be lowercase alphanumeric with hyphens.`);
    return null;
  }

  const repoRoot = process.env.GITGENT_REPO_ROOT || process.cwd();
  const skillPath = join(repoRoot, "skills", skill, "SKILL.md");

  if (!existsSync(skillPath)) {
    console.warn(`⚠️ Skill label "${skill}" found but skills/${skill}/SKILL.md does not exist — ignoring.`);
    return null;
  }

  return skill;
}

function hasScheduleLabel(labels: Array<{ name: string }>): boolean {
  return labels.some((l) => l.name.startsWith("schedule:"));
}

function isScheduledRerun(comment: string): boolean {
  return /\[Scheduled run:/.test(comment);
}

function extractPrompt(event: GitHubEvent): {
  prompt: string;
  issueNumber: number;
  skill: string | null;
  trigger: "issue" | "slash-command";
} | null {
  // Case 1: Issue opened with "gitgent" label
  if (event.action === "opened" && event.issue) {
    const hasLabel = event.issue.labels.some(
      (l) => l.name.toLowerCase() === "gitgent",
    );
    if (!hasLabel) return null;

    const skill = extractSkillFromLabels(event.issue.labels);
    const prompt = `${event.issue.title}\n\n${event.issue.body || ""}`.trim();
    return { prompt, issueNumber: event.issue.number, skill, trigger: "issue" };
  }

  // Case 2: Comment with /gitgent slash command
  if (event.action === "created" && event.comment && event.issue) {
    const body = event.comment.body.trim();
    if (!body.startsWith("/gitgent")) return null;

    // Scheduled reruns use the original issue title+body, not the canned comment
    const skill = extractSkillFromLabels(event.issue.labels);
    if (isScheduledRerun(body)) {
      const prompt = `${event.issue.title}\n\n${event.issue.body || ""}`.trim();
      if (!prompt) return null;
      return { prompt, issueNumber: event.issue.number, skill, trigger: "slash-command" };
    }

    const prompt = body.replace(/^\/gitgent\s*/, "").trim();
    if (!prompt) return null;

    return { prompt, issueNumber: event.issue.number, skill, trigger: "slash-command" };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) {
    console.error("❌ GITHUB_EVENT_PATH not set.");
    process.exit(1);
  }

  const event: GitHubEvent = JSON.parse(readFileSync(eventPath, "utf-8"));
  const extracted = extractPrompt(event);

  if (!extracted) {
    console.log("No agent prompt found. Skipping.");
    process.exit(0);
  }

  const { prompt, issueNumber, skill, trigger } = extracted;
  const isIssueTemplateRun = trigger === "issue";
  const promptDemandsFiles = /\b(artifact|file|files|markdown|excel|word|powerpoint|ppt|csv|xlsx|docx)\b/i.test(prompt);
  const expectsArtifacts = isIssueTemplateRun || Boolean(skill) || promptDemandsFiles;
  const skillDeliverables = getSkillDeliverables(skill);
  const repo = process.env.GITHUB_REPOSITORY || "";

  console.log(`📋 Issue #${issueNumber}`);
  console.log(`🔔 Trigger: ${trigger}`);
  console.log(`📝 Prompt: ${prompt.slice(0, 200)}...`);
  if (skill) console.log(`🎯 Skill: ${skill}`);

  // Scan pre-downloaded attachments (downloaded by workflow step via gh CLI)
  const attachDir = join(process.cwd(), "attachments");
  const attachments = scanAttachments(attachDir);
  if (attachments.length > 0) {
    console.log(`📎 Found ${attachments.length} attachment(s) in ${attachDir}`);
    attachments.forEach((f) => console.log(`  📄 ${f}`));
  }

  const config = loadConfig();
  const defaultBranch = config.defaultBranch;

  const executionTarget = buildExecutionTarget(config);

  if (!executionTarget) {
    await postComment(
      issueNumber,
      [
        "## ❌ Gitgent — Missing Model Configuration",
        "",
        `Provider: \`${config.llmProvider}\``,
        "",
        "Set `GITGENT_MODEL` to a valid PI model id for the selected provider.",
        `Example: \`${DEFAULT_OPENROUTER_MODEL}\` for OpenRouter.`,
      ].join("\n"),
    );

    await removeLabel(issueNumber, "in-progress");
    await addLabels(issueNumber, ["failed"]);
    await setIssueState(issueNumber, "open");
    process.exit(1);
  }
  const formattedExecutionTarget = formatExecutionTarget(executionTarget);

  if (isOAuthProvider(executionTarget.provider)) {
    await postComment(
      issueNumber,
      [
        "## ❌ Gitgent — OAuth Providers Are Not Supported In Actions",
        "",
        `Current target: \`${formattedExecutionTarget}\``,
        "",
        "This provider uses PI OAuth or subscription credentials, which is appropriate for interactive local use but not for unattended GitHub Actions runs.",
        "",
        "Recommended for repository automation:",
        "",
        "- Use `GITGENT_PROVIDER=openrouter` (default) with `OPENROUTER_API_KEY`.",
        "- Or use any PI API-key provider with the matching secret.",
        "",
        "If you want to experiment locally with a PI OAuth provider, authenticate first with `npx @mariozechner/pi-ai login <provider>` and run the CLI entrypoint outside Actions.",
      ].join("\n"),
    );

    await removeLabel(issueNumber, "in-progress");
    await addLabels(issueNumber, ["failed"]);
    await setIssueState(issueNumber, "open");
    process.exit(1);
  }

  if (isApiKeyProvider(executionTarget.provider) && !executionTarget.runtimeApiKey) {
    await postComment(
      issueNumber,
      [
        "## ❌ Gitgent — Missing API Key",
        "",
        `Current target: \`${formattedExecutionTarget}\``,
        "",
        "Required secret:",
        "",
        ...formatKeyNamesForList(executionTarget.provider),
        "",
        "Optional variables:",
        "",
        `- \`GITGENT_PROVIDER\` = provider id (default: \`openrouter\`)`,
        `- \`GITGENT_MODEL\` = provider model id (default: \`${DEFAULT_OPENROUTER_MODEL}\`)`,
      ].join("\n"),
    );

    await removeLabel(issueNumber, "in-progress");
    await addLabels(issueNumber, ["failed"]);
    await setIssueState(issueNumber, "open");
    process.exit(1);
  }

  console.log(`🎯 Execution target: ${formattedExecutionTarget}`);
  if (executionTarget.runtimeApiKey) {
    const key = executionTarget.runtimeApiKey;
    console.log(
      `🔑 Resolved API key length: ${key.length}, prefix: ${key.substring(0, 3)}...`,
    );
  } else {
    console.log(`🔑 No API key resolved for this target.`);
  }

  await postPhaseComment(issueNumber, "🫏 Gitgent — Started Working", [
    `Using \`${formattedExecutionTarget}\`.`,
    skill ? `Skill: \`${skill}\`` : "No skill label detected.",
  ]);

  // Create issue-specific artifacts directory
  const issueArtifactsDir = join(config.repoRoot, "artifacts", `issue-${issueNumber}`);
  mkdirSync(issueArtifactsDir, { recursive: true });
  console.log(`📁 Artifacts dir: ${issueArtifactsDir}`);
  const baselineArtifactSignatures = collectArtifactSignatures(issueArtifactsDir);
  console.log(`📚 Baseline artifacts before run: ${baselineArtifactSignatures.size}`);

  // Build enhanced prompt
  let enhancedPrompt = "";
  if (skill) {
    enhancedPrompt += `## Skill: ${skill}\n\n`;
    enhancedPrompt += `**FIRST**: Read the skill instructions from \`skills/${skill}/SKILL.md\` to understand the task approach, required tools, and output format. Follow those instructions closely.\n\n`;
  }
  if (skillDeliverables.length > 0) {
    enhancedPrompt += `**Required deliverables (must exist before finishing):**\n`;
    for (const fileName of skillDeliverables) {
      enhancedPrompt += `- \`artifacts/issue-${issueNumber}/${fileName}\`\n`;
    }
    enhancedPrompt += "\n";
  }
  enhancedPrompt += prompt;
  enhancedPrompt += `\n\n---\n\n## Agent Instructions\n\n`;
  enhancedPrompt += `**Output directory**: Save ALL output files to \`artifacts/issue-${issueNumber}/\`. Do NOT save to the root \`artifacts/\` directory.\n\n`;
  enhancedPrompt += `**Execution rules**:\n`;
  enhancedPrompt += `- You are an automated, non-interactive GitHub Actions agent.\n`;
  enhancedPrompt += `- You MUST use tools to complete the task — do NOT just reply with text.\n`;
  enhancedPrompt += `- Your FIRST action must be a tool call (for example: \`read\`, \`web_search\`, \`web_fetch\`, or \`bash\`).\n`;
  enhancedPrompt += `- If no data files are attached, use \`web_search\` and \`web_fetch\` to find the required information online.\n`;
  enhancedPrompt += `- Use \`bash\` (e.g., curl, python) as an alternative when needed.\n`;
  enhancedPrompt += `- You MUST create artifact files before finishing.\n`;
  enhancedPrompt += `- Do NOT ask follow-up questions — infer reasonable defaults and proceed.\n`;
  enhancedPrompt += `\n**Before finishing checklist** (complete ALL before ending your session):\n`;
  enhancedPrompt += `1. Verify at least one non-empty file exists in \`artifacts/issue-${issueNumber}/\`.\n`;
  enhancedPrompt += `2. Write a run summary using \`memory_write\` with type "summary"${skill ? ` and skill "${skill}"` : ""} containing: key findings, decisions made, and outputs produced.\n`;
  enhancedPrompt += `3. Write a brief daily log using \`memory_write\` with type "daily" summarizing what you did.\n`;

  if (attachments.length > 0) {
    const fileList = attachments.map((f) => `- ${f}`).join("\n");
    enhancedPrompt += `\n\nThe following files were attached to this issue and downloaded to the workspace:\n${fileList}\nPlease read and process these files as part of the task.`;
  }

  let lastError = "";
  let toolCallCount = 0;
  let autoRetryCount = 0;
  const runtimeDiagnostics: RuntimeDiagnostics = {
    toolCallCount: 0,
    autoRetryCount: 0,
    retryMessages: [],
    assistantPreview: "",
    recoveryAttempted: false,
    recoveryProducedArtifacts: false,
  };

  const buildRecoveryPrompt = () => {
    const requiredLines = skillDeliverables.length > 0
      ? skillDeliverables.map((fileName) => `- artifacts/issue-${issueNumber}/${fileName}`).join("\n")
      : `- artifacts/issue-${issueNumber}/result.md`;

    return [
      "Recovery attempt: the previous pass produced no artifacts.",
      "",
      "MANDATORY ACTIONS:",
      "1. Call a tool immediately (read, web_search, web_fetch, or bash).",
      "2. Create the required non-empty files now.",
      `3. Write files only under artifacts/issue-${issueNumber}/.`,
      "",
      "Required files:",
      requiredLines,
      "",
      "If web tools are unavailable, use bash with curl and direct file writes.",
      "Do not ask questions. Finish only after files exist.",
    ].join("\n");
  };

  await postPhaseComment(issueNumber, "🫏 Gitgent — In Progress", [
    `Running with \`${formattedExecutionTarget}\`.`,
    "No provider fallback is enabled for this run.",
  ]);

  // ── Model resolution ────────────────────────────────────────
  console.log(`🔧 Resolving model: ${formattedExecutionTarget}...`);
  const { authStorage, modelRegistry } = createGitgentAuthContext(
    executionTarget.provider,
    executionTarget.runtimeApiKey,
  );
  const model = modelRegistry.find(
    executionTarget.provider,
    executionTarget.model,
  );

  let resolvedModel = model;
  if (!model) {
    if (executionTarget.provider === "openrouter") {
      resolvedModel = createOpenRouterFallbackModel(executionTarget.model);
    } else {
      resolvedModel = createProviderFallbackModel(executionTarget.provider, executionTarget.model) ?? undefined;
    }
  }

  if (!resolvedModel) {
    lastError = `Model "${formattedExecutionTarget}" not found in PI SDK registry and no fallback available for provider "${executionTarget.provider}".`;
  } else {
    if (!model) {
      console.log(`⚠️  Model not in PI registry — using ${executionTarget.provider} fallback for "${executionTarget.model}".`);
    }
    console.log(`✅ Model: ${resolvedModel.name} (api: ${resolvedModel.api}, context: ${resolvedModel.contextWindow})`);

    try {
      const resolvedKey = await modelRegistry.getApiKey(resolvedModel);
      if (isApiKeyProvider(executionTarget.provider) && !resolvedKey) {
        throw new Error(`API key for "${executionTarget.provider}" not resolved.`);
      }
      if (resolvedKey) {
        console.log(`✅ API key resolved (${resolvedKey.length} chars)`);
      }

      const settingsManager = SettingsManager.inMemory(buildSessionSettings());

      const { session } = await createAgentSession({
        cwd: config.repoRoot,
        model: resolvedModel,
        thinkingLevel: "medium",
        authStorage,
        modelRegistry,
        sessionManager: SessionManager.inMemory(),
        settingsManager,
        tools: createGitgentBuiltInTools(config.repoRoot),
        customTools: gitgentTools,
      });

      let textChunks = 0;
      session.subscribe((event) => {
        switch (event.type) {
          case "agent_start":
            console.log("🧠 Agent started processing...");
            break;
          case "agent_end":
            console.log(`🧠 Agent finished. Tools used: ${toolCallCount}`);
            break;
          case "tool_execution_start":
            toolCallCount++;
            console.log(`  🔧 [${toolCallCount}] ${event.toolName}`);
            break;
          case "tool_execution_end":
            console.log(`     ${event.isError ? "❌ Error" : "✅ Done"}`);
            break;
          case "message_update":
            if (event.assistantMessageEvent?.type === "text_delta") {
              textChunks++;
              if (textChunks === 1) console.log("💬 LLM responding with text...");

              if (runtimeDiagnostics.assistantPreview.length < 2000) {
                const remaining = 2000 - runtimeDiagnostics.assistantPreview.length;
                runtimeDiagnostics.assistantPreview += event.assistantMessageEvent.delta.slice(0, remaining);
              }
            }
            break;
          case "auto_retry_start":
            autoRetryCount++;
            runtimeDiagnostics.autoRetryCount = autoRetryCount;
            runtimeDiagnostics.retryMessages.push(
              `attempt ${event.attempt}/${event.maxAttempts}, delay ${event.delayMs}ms, error: ${event.errorMessage}`,
            );
            console.log(
              `🔄 Auto-retrying after error (attempt ${event.attempt}/${event.maxAttempts}, delay ${event.delayMs}ms): ${event.errorMessage}`,
            );
            break;
          case "auto_retry_end":
            if (!event.success && event.finalError) {
              runtimeDiagnostics.retryMessages.push(`retry sequence ended in failure: ${event.finalError}`);
              console.warn(`⚠️ Retry sequence failed: ${event.finalError}`);
            }
            break;
        }
      });

      console.log("🚀 Agent session created. Sending prompt...");
      await hooks.emit({ event: "run:start", issueNumber, skill, model: formattedExecutionTarget });

      const startTime = Date.now();
      const timeout = config.maxRuntimeMinutes * 60 * 1000;
      const timer = setTimeout(() => {
        console.log("⏰ Timeout reached. Aborting...");
        session.abort();
      }, timeout);

      try {
        await session.prompt(enhancedPrompt);

        // List artifacts and only count files generated/updated in THIS run.
        let totalArtifactLines = listArtifacts(
          issueArtifactsDir,
          repo,
          issueNumber,
          defaultBranch,
        );
        let runArtifactLines = listNewOrChangedArtifacts(
          issueArtifactsDir,
          repo,
          issueNumber,
          defaultBranch,
          baselineArtifactSignatures,
        );
        console.log(`📦 Found ${totalArtifactLines.length} total artifact(s) for issue #${issueNumber}`);
        console.log(`🆕 Found ${runArtifactLines.length} new/updated artifact(s) for this run`);

        if (expectsArtifacts && runArtifactLines.length === 0) {
          runtimeDiagnostics.recoveryAttempted = true;
          await postPhaseComment(issueNumber, "🫏 Gitgent — Recovery Attempt", [
            "Initial pass produced no artifacts for an artifact-required run.",
            "Running one bounded recovery pass on the same model.",
          ]);

          console.warn("⚠️ Artifact-required run produced no files. Running bounded recovery pass...");
          await session.prompt(buildRecoveryPrompt());

          totalArtifactLines = listArtifacts(
            issueArtifactsDir,
            repo,
            issueNumber,
            defaultBranch,
          );
          runArtifactLines = listNewOrChangedArtifacts(
            issueArtifactsDir,
            repo,
            issueNumber,
            defaultBranch,
            baselineArtifactSignatures,
          );
          runtimeDiagnostics.recoveryProducedArtifacts = runArtifactLines.length > 0;
          console.log(`♻️ Recovery pass complete. Total artifacts: ${totalArtifactLines.length}`);
          console.log(`♻️ Recovery pass new/updated artifacts: ${runArtifactLines.length}`);
        }

        const duration = Math.round((Date.now() - startTime) / 1000);
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;

        runtimeDiagnostics.toolCallCount = toolCallCount;
        runtimeDiagnostics.autoRetryCount = autoRetryCount;

        console.log(`🏁 Agent completed in ${mins}m ${secs}s (${toolCallCount} tool calls)`);
        await hooks.emit({ event: "run:complete", issueNumber, skill, model: formattedExecutionTarget });

        // Auto-write daily log entry
        writeAutoDailyLog({
          issueNumber,
          skill,
          status: runArtifactLines.length > 0 ? "completed" : "no-artifacts",
          model: formattedExecutionTarget,
          duration: `${mins}m ${secs}s`,
          toolCalls: toolCallCount,
          artifactCount: runArtifactLines.length,
        });

        const noToolCalls = toolCallCount === 0;
        const noArtifacts = runArtifactLines.length === 0;

        if (noToolCalls) {
          console.warn(
            `⚠️ Agent completed in ${duration}s with 0 tool calls using "${executionTarget.model}".`,
          );
        }
        if (autoRetryCount > 0) {
          console.warn(`⚠️ Agent hit ${autoRetryCount} auto-retr${autoRetryCount === 1 ? "y" : "ies"} before completion.`);
        }

        if (noArtifacts && expectsArtifacts) {
          throw new Error(
            `Provider "${formattedExecutionTarget}" produced no artifacts on an artifact-required run.`,
          );
        }

        if (noArtifacts) {
          await postComment(
            issueNumber,
            [
              "## 🫏 Gitgent — Finished, but my saddlebags are empty! (No Artifacts)",
              "",
              `⏱️ **${mins}m ${secs}s** | 🤖 \`${formattedExecutionTarget}\``,
              skill ? `🎯 Skill: \`${skill}\`` : "",
              "",
              "No files were produced for this run.",
              "",
              "___",
              "",
              "💬 **Follow up?** Comment `/gitgent <your request>` to send me back out on the trail.",
              "",
              `_[View workflow run](https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID})_`,
            ]
              .filter(Boolean)
              .join("\n"),
          );

          await removeLabel(issueNumber, "in-progress");
          await addLabels(issueNumber, ["needs-review"]);
          await setIssueState(issueNumber, "open");
          process.exit(0);
        }

        await postComment(
          issueNumber,
          [
            "## 🫏 Gitgent — Hee-Haw! Task Completed!",
            "",
            `⏱️ **${mins}m ${secs}s** | 🤖 \`${formattedExecutionTarget}\``,
            skill ? `🎯 Skill: \`${skill}\`` : "",
            runtimeDiagnostics.recoveryAttempted ? "♻️ Recovery pass was used to produce artifacts." : "",
            "",
            "### 📦 Artifacts in my Saddlebags",
            "",
            ...runArtifactLines,
            "",
            "___",
            "",
            "💬 **Follow up?** Comment `/gitgent <your request>` to give me another task.",
            "",
            `_[View workflow run](https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID})_`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        await removeLabel(issueNumber, "in-progress");
        await addLabels(issueNumber, ["completed"]);

        // Keep scheduled issues open so the scheduler can pick them up again
        const issueLabels = event.issue?.labels || [];
        if (hasScheduleLabel(issueLabels)) {
          await setIssueState(issueNumber, "open");
        } else {
          await setIssueState(issueNumber, "closed");
        }
        process.exit(0);
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      runtimeDiagnostics.toolCallCount = toolCallCount;
      runtimeDiagnostics.autoRetryCount = autoRetryCount;
      console.error(`❌ Execution failed on ${formattedExecutionTarget}: ${lastError}`);
      await hooks.emit({ event: "run:failed", issueNumber, skill, error: lastError });
    }
  }

  runtimeDiagnostics.toolCallCount = toolCallCount;
  runtimeDiagnostics.autoRetryCount = autoRetryCount;

  // Auto-write daily log for failed runs
  writeAutoDailyLog({
    issueNumber,
    skill,
    status: "failed",
    model: formattedExecutionTarget,
    duration: "N/A",
    toolCalls: toolCallCount,
    artifactCount: 0,
  });

  const diagnosticsFile = writeFailureDiagnosticsArtifact(
    issueArtifactsDir,
    issueNumber,
    skill,
    prompt,
    executionTarget,
    lastError || "No explicit error captured.",
    runtimeDiagnostics,
  );

  const diagnosticsLink = diagnosticsFile
    ? `https://github.com/${repo}/blob/${defaultBranch}/artifacts/issue-${issueNumber}/${diagnosticsFile}`
    : "";

  let advice = "";
  if (lastError.includes("401") || lastError.includes("403") || lastError.includes("authentication")) {
    const keyNames = formatKeyNamesForText(executionTarget.provider);
    advice = [
      "",
      `**This is an authentication error** for \`${executionTarget.provider}\`.${keyNames ? ` Check ${keyNames}.` : ""}`,
      "",
      keyNames
        ? `**Fix**: Go to **Settings → Secrets and variables → Actions** and verify ${keyNames}.`
        : "**Fix**: Verify the PI credential source configured for this provider.",
    ].join("\n");
  }

  await postComment(
    issueNumber,
    [
      "## 🫏 Gitgent — Whoops! I stumbled... (Failed)",
      "",
      `Execution target: \`${formattedExecutionTarget}\``,
      "",
      "**Last error**:",
      "```",
      (lastError || "No explicit error captured.").slice(0, 500),
      "```",
      diagnosticsFile ? "### 📎 Diagnostic Artifact" : "",
      diagnosticsFile && diagnosticsLink ? `- [📄 \`${diagnosticsFile}\`](${diagnosticsLink})` : "",
      advice,
      "",
      "___",
      "",
      "💬 **Follow up?** Comment `/gitgent <your request>` to help me get back on my hooves.",
      "",
      `_[View workflow run](https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID})_`,
    ].join("\n"),
  );

  await removeLabel(issueNumber, "in-progress");
  await addLabels(issueNumber, ["failed"]);
  await setIssueState(issueNumber, "open");
  process.exit(1);
}

main().catch(async (error) => {
  console.error(`Fatal: ${error}`);

  // Attempt to notify the issue before exiting
  try {
    const repo = process.env.GITHUB_REPOSITORY;
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (repo && eventPath) {
      const event = JSON.parse(readFileSync(eventPath, "utf-8"));
      const issueNumber = event?.issue?.number;
      if (issueNumber) {
        await postComment(
          issueNumber,
          [
            "## 🫏 Gitgent — Fatal Error",
            "",
            "The agent crashed before it could complete the task.",
            "",
            "```",
            String(error instanceof Error ? error.message : error),
            "```",
            "",
            `_[View workflow run](https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID})_`,
          ].join("\n"),
        );
      }
    }
  } catch {
    // Best-effort — don't let comment failure prevent exit
  }

  process.exit(1);
});
