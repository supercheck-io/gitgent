import { getEnvApiKey, getProviders } from "@mariozechner/pi-ai";

export const DEFAULT_PROVIDER = "openrouter" as const;
export const DEFAULT_OPENROUTER_MODEL = "minimax/minimax-m2.7" as const;

const DEFAULT_MODELS: Record<string, string> = {
  openrouter: DEFAULT_OPENROUTER_MODEL,
  openai: "gpt-4.1",
  anthropic: "claude-sonnet-4-20250514",
  google: "gemini-2.5-flash",
  xai: "grok-3",
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-large-latest",
} as const;

const API_KEY_ENV_NAMES = {
  anthropic: ["ANTHROPIC_API_KEY"],
  "azure-openai-responses": ["AZURE_OPENAI_API_KEY"],
  cerebras: ["CEREBRAS_API_KEY"],
  google: ["GEMINI_API_KEY"],
  groq: ["GROQ_API_KEY"],
  huggingface: ["HF_TOKEN"],
  "kimi-coding": ["KIMI_API_KEY"],
  minimax: ["MINIMAX_API_KEY"],
  "minimax-cn": ["MINIMAX_CN_API_KEY"],
  mistral: ["MISTRAL_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  opencode: ["OPENCODE_API_KEY"],
  openrouter: ["OPENROUTER_API_KEY"],
  "vercel-ai-gateway": ["AI_GATEWAY_API_KEY"],
  xai: ["XAI_API_KEY"],
  zai: ["ZAI_API_KEY"],
} as const;

/** Known PI providers — used to detect OAuth-only providers (those without API key env vars). */
const KNOWN_PROVIDER_IDS = new Set<string>(getProviders());

function parseProvider(rawValue: string | undefined): string {
  const value = (rawValue || "").trim();
  return value || DEFAULT_PROVIDER;
}

export function defaultModelForProvider(provider: string): string {
  return DEFAULT_MODELS[provider] || "";
}

function parseModel(rawValue: string | undefined, provider: string): string {
  const value = (rawValue || "").trim();
  return value || defaultModelForProvider(provider);
}

export interface GitgentConfig {
  llmProvider: string;
  llmModel: string;
  runtimeApiKey: string;
  githubToken: string;
  maxRuntimeMinutes: number;
  repoRoot: string;
  defaultBranch: string;
}

export interface ExecutionTarget {
  provider: string;
  model: string;
  runtimeApiKey: string;
}

export function formatExecutionTarget(target: Pick<ExecutionTarget, "provider" | "model">): string {
  return target.model.startsWith(`${target.provider}/`)
    ? target.model
    : `${target.provider}/${target.model}`;
}

export function requiredKeyEnvNames(provider: string): string[] {
  const envNames = API_KEY_ENV_NAMES[provider as keyof typeof API_KEY_ENV_NAMES];
  return envNames ? [...envNames] : [];
}

export function isOAuthProvider(provider: string): boolean {
  return KNOWN_PROVIDER_IDS.has(provider) && !isApiKeyProvider(provider);
}

export function isApiKeyProvider(provider: string): boolean {
  return requiredKeyEnvNames(provider).length > 0;
}

function parseRuntimeMinutes(rawValue: string | undefined): number {
  const parsed = Number.parseInt(rawValue || "30", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return parsed;
}

export function buildSessionSettings() {
  return {
    compaction: { enabled: true },
    retry: { enabled: true, maxRetries: 3, baseDelayMs: 2000, maxDelayMs: 60000 },
  };
}

export function loadConfig(): GitgentConfig {
  const llmProvider = parseProvider(process.env.GITGENT_PROVIDER || process.env.LLM_PROVIDER);
  const llmModel = parseModel(process.env.GITGENT_MODEL || process.env.LLM_MODEL, llmProvider);

  return {
    llmProvider,
    llmModel,
    runtimeApiKey: resolveApiKey(llmProvider),
    githubToken: process.env.GITHUB_TOKEN || "",
    maxRuntimeMinutes: parseRuntimeMinutes(process.env.MAX_RUNTIME_MINUTES),
    repoRoot: process.env.GITGENT_REPO_ROOT || process.cwd(),
    defaultBranch: process.env.GITGENT_DEFAULT_BRANCH || "main",
  };
}

export function resolveApiKey(provider: string): string {
  try {
    return getEnvApiKey(provider as never) || "";
  } catch {
    return "";
  }
}

export function buildExecutionTarget(config: GitgentConfig): ExecutionTarget | null {
  if (!config.llmModel) return null;

  return {
    provider: config.llmProvider,
    model: config.llmModel,
    runtimeApiKey: config.runtimeApiKey,
  };
}
