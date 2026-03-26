import {
  AuthStorage,
  createCodingTools,
  createFindTool,
  createGrepTool,
  createLsTool,
  ModelRegistry,
} from "@mariozechner/pi-coding-agent";
import type { Model, Api } from "@mariozechner/pi-ai";

export function createGitgentBuiltInTools(
  cwd: string,
): ReturnType<typeof createCodingTools> {
  return [
    ...createCodingTools(cwd),
    createGrepTool(cwd),
    createFindTool(cwd),
    createLsTool(cwd),
  ];
}

export function createGitgentAuthContext(
  provider: string,
  runtimeApiKey: string,
) {
  const authStorage = AuthStorage.create();
  if (runtimeApiKey) {
    authStorage.setRuntimeApiKey(provider, runtimeApiKey);
  }

  const modelRegistry = new ModelRegistry(authStorage);
  return { authStorage, modelRegistry };
}

/**
 * Build a Model object for an OpenRouter model not found in the PI SDK registry.
 * OpenRouter uses the OpenAI-compatible completions API.
 */
export function createOpenRouterFallbackModel(modelId: string): Model<Api> {
  return {
    id: modelId,
    name: modelId,
    api: "openai-completions" as Api,
    provider: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    reasoning: false,
    input: ["text"] as ("text" | "image")[],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 16_384,
  };
}

/** Provider-specific base URLs used when building fallback models. */
const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  groq: "https://api.groq.com/openai/v1",
  mistral: "https://api.mistral.ai/v1",
  xai: "https://api.x.ai/v1",
};

/** Provider-specific API types. */
const PROVIDER_API_TYPES: Record<string, Api> = {
  openai: "openai-completions" as Api,
  anthropic: "anthropic" as Api,
  google: "google" as Api,
  groq: "openai-completions" as Api,
  mistral: "openai-completions" as Api,
  xai: "openai-completions" as Api,
};

/**
 * Build a fallback Model object for providers whose models are not in the
 * PI SDK registry. Falls back to OpenAI-compatible API shape when the
 * provider is unknown.
 */
export function createProviderFallbackModel(provider: string, modelId: string): Model<Api> | null {
  const baseUrl = PROVIDER_BASE_URLS[provider];
  const api = PROVIDER_API_TYPES[provider];
  if (!baseUrl || !api) return null;

  return {
    id: modelId,
    name: modelId,
    api,
    provider,
    baseUrl,
    reasoning: false,
    input: ["text"] as ("text" | "image")[],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 16_384,
  };
}
