import {
  createAgentSession,
  SessionManager,
  SettingsManager,
} from "@mariozechner/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import {
  buildExecutionTarget,
  buildSessionSettings,
  formatExecutionTarget,
  isApiKeyProvider,
  loadConfig,
  requiredKeyEnvNames,
} from "./config.js";
import { createGitgentAuthContext, createGitgentBuiltInTools, createOpenRouterFallbackModel, createProviderFallbackModel } from "./agent-runtime.js";
import { gitgentTools } from "./extensions/index.js";
import { hooks } from "./hooks.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    console.log("Usage:");
    console.log('  npx tsx src/main.ts --prompt "Do something"');
    process.exit(args.includes("--help") ? 0 : 1);
  }

  const promptIdx = args.indexOf("--prompt");
  let prompt = "";
  if (promptIdx !== -1 && args[promptIdx + 1]) {
    prompt = args[promptIdx + 1];
  } else if (args.length === 1 && existsSync(args[0])) {
    prompt = readFileSync(args[0], "utf-8").trim();
  } else {
    console.error('Missing prompt. Use --prompt "Do something" or pass a prompt file path.');
    process.exit(1);
  }

  if (!prompt) {
    console.error("Prompt is empty.");
    process.exit(1);
  }

  const config = loadConfig();
  const executionTarget = buildExecutionTarget(config);
  if (!executionTarget) {
    console.error(
      `❌ Missing model configuration for provider "${config.llmProvider}". Set GITGENT_MODEL.`,
    );
    process.exit(1);
  }
  const formattedExecutionTarget = formatExecutionTarget(executionTarget);

  console.log(`🤖 Provider: ${executionTarget.provider} | Model: ${executionTarget.model}`);
  console.log(`📁 Repo root: ${config.repoRoot}`);
  console.log(`⏱️  Timeout: ${config.maxRuntimeMinutes}m`);

  const { authStorage, modelRegistry } = createGitgentAuthContext(
    executionTarget.provider,
    executionTarget.runtimeApiKey,
  );

  const model = modelRegistry.find(executionTarget.provider, executionTarget.model);

  let resolvedModel = model;
  if (!model) {
    if (executionTarget.provider === "openrouter") {
      resolvedModel = createOpenRouterFallbackModel(executionTarget.model);
    } else {
      resolvedModel = createProviderFallbackModel(executionTarget.provider, executionTarget.model) ?? undefined;
    }
  }

  if (!resolvedModel) {
    console.error(`❌ Model "${formattedExecutionTarget}" not found and no fallback available for provider "${executionTarget.provider}".`);
    console.error("   Run: npx pi --list-models to see available models.");
    process.exit(1);
  }

  if (!model) {
    console.log(`⚠️  Model not in PI registry — using ${executionTarget.provider} fallback for "${executionTarget.model}".`);
  }

  if (isApiKeyProvider(executionTarget.provider)) {
    const resolvedKey = await modelRegistry.getApiKey(resolvedModel);
    if (!resolvedKey) {
      const keyNames = requiredKeyEnvNames(executionTarget.provider).join(" or ");
      console.error(
        `❌ Missing API key for ${formattedExecutionTarget}. Set ${keyNames}.`,
      );
      process.exit(1);
    }
  }

  const { session } = await createAgentSession({
    cwd: config.repoRoot,
    model: resolvedModel,
    thinkingLevel: "medium",
    authStorage,
    modelRegistry,
    sessionManager: SessionManager.inMemory(),
    settingsManager: SettingsManager.inMemory(buildSessionSettings()),
    tools: createGitgentBuiltInTools(config.repoRoot),
    customTools: gitgentTools,
  });

  const timeout = config.maxRuntimeMinutes * 60 * 1000;
  const timer = setTimeout(() => {
    console.error(`⏰ Timeout (${config.maxRuntimeMinutes}m). Aborting.`);
    session.abort();
  }, timeout);

  console.log("\n🚀 Starting agent...\n");
  await hooks.emit({ event: "run:start", model: formattedExecutionTarget });

  try {
    await session.prompt(prompt);
    await hooks.emit({ event: "run:complete", model: formattedExecutionTarget });
    console.log("\n✅ Agent run completed.");
  } catch (error) {
    await hooks.emit({ event: "run:failed", error: error instanceof Error ? error.message : String(error) });
    console.error(
      `\n❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }
}

main().catch((error) => {
  console.error(`Fatal: ${error}`);
  process.exit(1);
});
