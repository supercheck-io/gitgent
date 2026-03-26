import {
  createGitgentBuiltInTools,
  createOpenRouterFallbackModel,
  createProviderFallbackModel,
} from "../src/agent-runtime.js";

describe("createOpenRouterFallbackModel", () => {
  it("returns a model with openrouter provider and OpenAI-compatible API", () => {
    const model = createOpenRouterFallbackModel("minimax/minimax-m2.7");

    expect(model.id).toBe("minimax/minimax-m2.7");
    expect(model.provider).toBe("openrouter");
    expect(model.baseUrl).toBe("https://openrouter.ai/api/v1");
    expect(model.api).toBe("openai-completions");
    expect(model.contextWindow).toBeGreaterThan(0);
    expect(model.maxTokens).toBeGreaterThan(0);
  });

  it("preserves the exact model ID passed in", () => {
    const model = createOpenRouterFallbackModel("anthropic/claude-3.5-sonnet");
    expect(model.id).toBe("anthropic/claude-3.5-sonnet");
    expect(model.name).toBe("anthropic/claude-3.5-sonnet");
  });
});

describe("createProviderFallbackModel", () => {
  it("returns a model for known providers", () => {
    const openaiModel = createProviderFallbackModel("openai", "gpt-4.1");
    expect(openaiModel).not.toBeNull();
    expect(openaiModel!.provider).toBe("openai");
    expect(openaiModel!.baseUrl).toBe("https://api.openai.com/v1");
    expect(openaiModel!.api).toBe("openai-completions");

    const anthropicModel = createProviderFallbackModel("anthropic", "claude-sonnet-4-20250514");
    expect(anthropicModel).not.toBeNull();
    expect(anthropicModel!.provider).toBe("anthropic");
    expect(anthropicModel!.api).toBe("anthropic");

    const googleModel = createProviderFallbackModel("google", "gemini-2.5-flash");
    expect(googleModel).not.toBeNull();
    expect(googleModel!.api).toBe("google");
  });

  it("returns null for unknown providers", () => {
    expect(createProviderFallbackModel("unknown", "some-model")).toBeNull();
    expect(createProviderFallbackModel("", "model")).toBeNull();
  });

  it("uses correct base URLs for each provider", () => {
    const expected: Record<string, string> = {
      openai: "https://api.openai.com/v1",
      groq: "https://api.groq.com/openai/v1",
      mistral: "https://api.mistral.ai/v1",
      xai: "https://api.x.ai/v1",
    };

    for (const [provider, url] of Object.entries(expected)) {
      const model = createProviderFallbackModel(provider, "test-model");
      expect(model).not.toBeNull();
      expect(model!.baseUrl).toBe(url);
    }
  });

  it("model has required fields for PI SDK consumption", () => {
    const model = createProviderFallbackModel("openai", "gpt-4o");
    expect(model).toMatchObject({
      id: "gpt-4o",
      name: "gpt-4o",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    });
  });
});

describe("createGitgentBuiltInTools", () => {
  it("returns all 7 expected built-in tools", () => {
    const tools = createGitgentBuiltInTools(process.cwd());
    expect(tools).toHaveLength(7);

    const names = tools.map((t) => t.name);
    expect(names).toEqual(["read", "bash", "edit", "write", "grep", "find", "ls"]);
  });

  it("each tool has a name and is a valid tool shape", () => {
    const tools = createGitgentBuiltInTools(process.cwd());
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(typeof tool.name).toBe("string");
    }
  });
});
