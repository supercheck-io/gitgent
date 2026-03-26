import { writeAutoDailyLog } from "../src/extensions/memory-tools.js";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("memory-tools", () => {
  const testMemoryDir = join(tmpdir(), `gitgent-test-memory-${Date.now()}`);

  it("writeAutoDailyLog creates a daily log file", () => {
    process.env.GITGENT_MEMORY_DIR = testMemoryDir;
    process.env.GITGENT_REPO_ROOT = tmpdir();

    try {
      writeAutoDailyLog({
        issueNumber: 42,
        skill: "research",
        status: "completed",
        model: "openrouter/test-model",
        duration: "2m 30s",
        toolCalls: 5,
        artifactCount: 3,
      });

      const dailyDir = join(testMemoryDir, "daily");
      expect(existsSync(dailyDir)).toBe(true);

      const dateStr = new Date().toISOString().split("T")[0];
      const logFile = join(dailyDir, `${dateStr}.md`);
      expect(existsSync(logFile)).toBe(true);

      const content = readFileSync(logFile, "utf-8");
      expect(content).toContain("**Status**: completed");
      expect(content).toContain("**Model**: openrouter/test-model");
      expect(content).toContain("**Issue**: #42");
      expect(content).toContain("**Skill**: research");
      expect(content).toContain("**Tool calls**: 5");
      expect(content).toContain("**Artifacts**: 3");
    } finally {
      delete process.env.GITGENT_MEMORY_DIR;
      rmSync(testMemoryDir, { recursive: true, force: true });
    }
  });
});
