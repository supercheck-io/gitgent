describe("git-commit sanitization", () => {
  // Import the module to test the sanitization function
  // Since sanitizeGitRefSegment is not exported, we test it indirectly 
  // by verifying the tool exists and has the correct shape
  it("gitCommitArtifactsTool has expected shape", async () => {
    const { gitCommitArtifactsTool } = await import("../src/extensions/git-commit.js");
    expect(gitCommitArtifactsTool.name).toBe("git_commit_artifacts");
    expect(gitCommitArtifactsTool.parameters).toBeDefined();
    expect(typeof gitCommitArtifactsTool.execute).toBe("function");
  });
});

describe("web-tools", () => {
  it("webFetchTool has expected shape", async () => {
    const { webFetchTool } = await import("../src/extensions/web-tools.js");
    expect(webFetchTool.name).toBe("web_fetch");
    expect(typeof webFetchTool.execute).toBe("function");
  });

  it("webSearchTool has expected shape", async () => {
    const { webSearchTool } = await import("../src/extensions/web-tools.js");
    expect(webSearchTool.name).toBe("web_search");
    expect(typeof webSearchTool.execute).toBe("function");
  });
});

describe("github-tools", () => {
  it("githubApiTool rejects missing GITHUB_TOKEN", async () => {
    const originalToken = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;

    try {
      const { githubApiTool } = await import("../src/extensions/github-tools.js");
      const result = await githubApiTool.execute("test-id", { endpoint: "/repos/test/test" }, undefined, undefined, {} as never);
      expect(result.content[0]).toHaveProperty("text");
      expect((result.content[0] as { text: string }).text).toContain("GITHUB_TOKEN not configured");
    } finally {
      if (originalToken) {
        process.env.GITHUB_TOKEN = originalToken;
      }
    }
  });

  it("githubApiTool allows valid compare endpoints", async () => {
    const originalToken = process.env.GITHUB_TOKEN;
    const originalFetch = global.fetch;
    process.env.GITHUB_TOKEN = "test-token";
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => '{"ok":true}',
    })) as unknown as typeof fetch;

    try {
      const { githubApiTool } = await import("../src/extensions/github-tools.js");
      const result = await githubApiTool.execute("test-id", {
        endpoint: "/repos/test/test/compare/main...feature",
      }, undefined, undefined, {} as never);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/test/test/compare/main...feature",
        expect.objectContaining({ method: "GET" }),
      );
      expect((result.content[0] as { text: string }).text).toContain('"ok":true');
    } finally {
      global.fetch = originalFetch;
      if (originalToken) {
        process.env.GITHUB_TOKEN = originalToken;
      } else {
        delete process.env.GITHUB_TOKEN;
      }
    }
  });

  it("githubApiTool rejects path traversal segments", async () => {
    const originalToken = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = "test-token";

    try {
      const { githubApiTool } = await import("../src/extensions/github-tools.js");
      const result = await githubApiTool.execute("test-id", {
        endpoint: "/repos/test/../secrets",
      }, undefined, undefined, {} as never);

      expect((result.content[0] as { text: string }).text).toContain("invalid path segments");
    } finally {
      if (originalToken) {
        process.env.GITHUB_TOKEN = originalToken;
      } else {
        delete process.env.GITHUB_TOKEN;
      }
    }
  });
});

describe("artifact-tools", () => {
  it("all artifact tools have expected names", async () => {
    const { artifactExcelTool, artifactPptxTool, artifactDocxTool } = await import("../src/extensions/artifact-tools.js");
    expect(artifactExcelTool.name).toBe("artifact_excel");
    expect(artifactPptxTool.name).toBe("artifact_pptx");
    expect(artifactDocxTool.name).toBe("artifact_docx");
  });
});

describe("tool index", () => {
  it("exports all 18 tools", async () => {
    const { gitgentTools } = await import("../src/extensions/index.js");
    expect(gitgentTools).toHaveLength(18);

    const names = gitgentTools.map((t: { name: string }) => t.name);
    expect(names).toContain("web_search");
    expect(names).toContain("web_fetch");
    expect(names).toContain("browser_navigate");
    expect(names).toContain("browser_screenshot");
    expect(names).toContain("browser_click");
    expect(names).toContain("browser_type");
    expect(names).toContain("artifact_excel");
    expect(names).toContain("artifact_pptx");
    expect(names).toContain("artifact_docx");
    expect(names).toContain("github_create_issue");
    expect(names).toContain("github_create_pr");
    expect(names).toContain("github_api");
    expect(names).toContain("memory_read");
    expect(names).toContain("memory_write");
    expect(names).toContain("memory_list");
    expect(names).toContain("memory_search");
    expect(names).toContain("memory_delete");
    expect(names).toContain("git_commit_artifacts");
  });
});
