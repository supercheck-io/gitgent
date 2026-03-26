import {
  resolveWorkspacePath,
  displayWorkspacePath,
  assertSafeHttpUrl,
} from "../src/extensions/safety.js";
import { resolve } from "node:path";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("resolveWorkspacePath", () => {
  it("resolves a relative path within the repo root", () => {
    process.env.GITGENT_REPO_ROOT = "/tmp/test-repo";
    const result = resolveWorkspacePath("artifacts/output.md");
    expect(result).toBe(resolve("/tmp/test-repo", "artifacts/output.md"));
  });

  it("blocks path traversal with ../", () => {
    process.env.GITGENT_REPO_ROOT = "/tmp/test-repo";
    expect(() => resolveWorkspacePath("../../etc/passwd")).toThrow(
      "Path escapes repository root",
    );
  });

  it("blocks path traversal with encoded segments", () => {
    process.env.GITGENT_REPO_ROOT = "/tmp/test-repo";
    expect(() => resolveWorkspacePath("../secrets")).toThrow(
      "Path escapes repository root",
    );
  });

  it("allows nested paths within repo", () => {
    process.env.GITGENT_REPO_ROOT = "/tmp/test-repo";
    const result = resolveWorkspacePath("artifacts/issue-1/deep/file.txt");
    expect(result).toBe(
      resolve("/tmp/test-repo", "artifacts/issue-1/deep/file.txt"),
    );
  });
});

describe("displayWorkspacePath", () => {
  it("returns a relative path from the repo root", () => {
    process.env.GITGENT_REPO_ROOT = "/tmp/test-repo";
    const result = displayWorkspacePath("/tmp/test-repo/artifacts/output.md");
    expect(result).toBe("artifacts/output.md");
  });

  it("returns '.' for the repo root itself", () => {
    process.env.GITGENT_REPO_ROOT = "/tmp/test-repo";
    const result = displayWorkspacePath("/tmp/test-repo");
    expect(result).toBe(".");
  });
});

describe("assertSafeHttpUrl", () => {
  it("accepts valid https URLs", async () => {
    const url = await assertSafeHttpUrl("https://example.com/page");
    expect(url.hostname).toBe("example.com");
    expect(url.protocol).toBe("https:");
  });

  it("accepts valid http URLs", async () => {
    const url = await assertSafeHttpUrl("http://example.com/page");
    expect(url.hostname).toBe("example.com");
  });

  it("rejects non-http protocols", async () => {
    await expect(assertSafeHttpUrl("ftp://example.com")).rejects.toThrow(
      "Unsupported URL protocol",
    );
    await expect(assertSafeHttpUrl("file:///etc/passwd")).rejects.toThrow(
      "Unsupported URL protocol",
    );
    await expect(assertSafeHttpUrl("javascript:alert(1)")).rejects.toThrow(
      "Unsupported URL protocol",
    );
  });

  it("rejects invalid URLs", async () => {
    await expect(assertSafeHttpUrl("not-a-url")).rejects.toThrow("Invalid URL");
  });

  it("blocks localhost and loopback addresses", async () => {
    await expect(assertSafeHttpUrl("http://localhost")).rejects.toThrow(
      "Blocked hostname",
    );
    await expect(assertSafeHttpUrl("http://127.0.0.1")).rejects.toThrow(
      "Blocked hostname",
    );
    await expect(assertSafeHttpUrl("http://0.0.0.0")).rejects.toThrow(
      "Blocked hostname",
    );
  });

  it("blocks cloud metadata endpoints", async () => {
    await expect(
      assertSafeHttpUrl("http://169.254.169.254/latest/meta-data"),
    ).rejects.toThrow("Blocked hostname");
    await expect(
      assertSafeHttpUrl("http://metadata.google.internal/computeMetadata/v1"),
    ).rejects.toThrow("Blocked hostname");
  });

  it("blocks .local domains", async () => {
    await expect(assertSafeHttpUrl("http://myhost.local")).rejects.toThrow(
      "Blocked hostname",
    );
  });

  it("blocks IPv6 loopback", async () => {
    await expect(assertSafeHttpUrl("http://[::1]")).rejects.toThrow(
      "Blocked hostname",
    );
    await expect(assertSafeHttpUrl("http://[::]")).rejects.toThrow(
      "Blocked hostname",
    );
  });
});
