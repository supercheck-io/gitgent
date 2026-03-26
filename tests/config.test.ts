import {
  DEFAULT_OPENROUTER_MODEL,
  buildExecutionTarget,
  defaultModelForProvider,
  formatExecutionTarget,
  isApiKeyProvider,
  isOAuthProvider,
  loadConfig,
  requiredKeyEnvNames,
} from "../src/config.js";
import {
  assertSafeHttpUrl,
  resolveWorkspacePath,
} from "../src/extensions/safety.js";
import { createGitgentBuiltInTools } from "../src/agent-runtime.js";
import { createProviderFallbackModel } from "../src/agent-runtime.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("config", () => {
  it("defaults to OpenRouter when no provider is configured", () => {
    delete process.env.GITGENT_PROVIDER;
    delete process.env.GITGENT_MODEL;
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_MODEL;

    const config = loadConfig();

    expect(config.llmProvider).toBe("openrouter");
    expect(config.llmModel).toBe(DEFAULT_OPENROUTER_MODEL);
  });

  it("requires an explicit model for providers without curated defaults (non-OpenRouter)", () => {
    process.env.GITGENT_PROVIDER = "openai";
    delete process.env.GITGENT_MODEL;

    const config = loadConfig();

    expect(config.llmModel).toBe("gpt-4.1");
    expect(buildExecutionTarget(config)).not.toBeNull();
  });

  it("returns empty model for unknown providers without explicit model", () => {
    process.env.GITGENT_PROVIDER = "unknown-provider";
    delete process.env.GITGENT_MODEL;

    const config = loadConfig();

    expect(config.llmModel).toBe("");
    expect(buildExecutionTarget(config)).toBeNull();
  });

  it("provides default models for major providers", () => {
    expect(defaultModelForProvider("openai")).toBe("gpt-4.1");
    expect(defaultModelForProvider("anthropic")).toBe("claude-sonnet-4-20250514");
    expect(defaultModelForProvider("google")).toBe("gemini-2.5-flash");
    expect(defaultModelForProvider("groq")).toBe("llama-3.3-70b-versatile");
    expect(defaultModelForProvider("xai")).toBe("grok-3");
    expect(defaultModelForProvider("mistral")).toBe("mistral-large-latest");
    expect(defaultModelForProvider("unknown")).toBe("");
  });

  it("reports provider-specific credential sources", () => {
    expect(requiredKeyEnvNames("openai")).toEqual(["OPENAI_API_KEY"]);
    expect(requiredKeyEnvNames("openrouter")).toEqual(["OPENROUTER_API_KEY"]);
    expect(isApiKeyProvider("openai")).toBe(true);
    expect(isOAuthProvider("openai-codex")).toBe(true);
  });

  it("formats execution targets without duplicating provider prefixes", () => {
    expect(formatExecutionTarget({
      provider: "openrouter",
      model: "minimax/minimax-m2.7",
    })).toBe("openrouter/minimax/minimax-m2.7");
    expect(formatExecutionTarget({
      provider: "openai",
      model: "gpt-4.1",
    })).toBe("openai/gpt-4.1");
  });
});

describe("built-in tools", () => {
  it("includes the file discovery tools expected by skills", () => {
    const toolNames = createGitgentBuiltInTools(process.cwd()).map((tool) => tool.name);

    expect(toolNames).toEqual([
      "read",
      "bash",
      "edit",
      "write",
      "grep",
      "find",
      "ls",
    ]);
  });
});

describe("provider fallback models", () => {
  it("creates fallback models for known providers", () => {
    const openai = createProviderFallbackModel("openai", "gpt-4.1");
    expect(openai).not.toBeNull();
    expect(openai!.provider).toBe("openai");
    expect(openai!.baseUrl).toBe("https://api.openai.com/v1");

    const anthropic = createProviderFallbackModel("anthropic", "claude-sonnet-4");
    expect(anthropic).not.toBeNull();
    expect(anthropic!.provider).toBe("anthropic");

    const google = createProviderFallbackModel("google", "gemini-2.5-flash");
    expect(google).not.toBeNull();
    expect(google!.provider).toBe("google");
  });

  it("returns null for unknown providers", () => {
    const unknown = createProviderFallbackModel("unknown-provider", "some-model");
    expect(unknown).toBeNull();
  });
});

describe("safety helpers", () => {
  it("rejects paths outside the repo root", () => {
    expect(() => resolveWorkspacePath("../outside.txt")).toThrow(/escapes repository root/i);
  });

  it("blocks local network URLs", async () => {
    await expect(assertSafeHttpUrl("http://localhost:3000")).rejects.toThrow(/blocked hostname/i);
    await expect(assertSafeHttpUrl("file:///tmp/test.txt")).rejects.toThrow(/unsupported url protocol/i);
  });
});
