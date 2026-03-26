/**
 * Git commit tool — commits artifacts and memory to the repo.
 */

import { spawnSync } from "node:child_process";
import { Type, type Static } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

function runCommand(
  command: string,
  args: string[],
  cwd: string,
): string {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf-8",
    timeout: 30_000,
  });

  if (result.error) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || result.stdout || "").trim();
    throw new Error(`${command} ${args.join(" ")} failed: ${stderr || `exit ${result.status}`}`);
  }

  return (result.stdout || "").trim();
}

function git(args: string[], cwd: string): string {
  return runCommand("git", args, cwd);
}

function sanitizeGitRefSegment(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-") // strip ~, *, ?, [, ], ^, spaces, etc.
    .replace(/^-+|-+$/g, "")
    .replace(/\.{2,}/g, ".") // no consecutive dots (..)
    .replace(/\/+/g, "-")
    .replace(/@\{/g, "-") // prevent @{ reflog syntax
    .replace(/\.lock$/i, "") // .lock suffix reserved by git
    .replace(/^\.|\.$/, "") // no leading/trailing dots
    .slice(0, 60);

  return sanitized || "agent";
}

const CommitParams = Type.Object({
  message: Type.String({ description: "Commit message" }),
  skill: Type.Optional(
    Type.String({ description: "Skill name (for branch name in PR mode)" }),
  ),
});

export const gitCommitArtifactsTool: ToolDefinition<typeof CommitParams> = {
  name: "git_commit_artifacts",
  label: "Git Commit",
  description:
    "Stage and commit artifacts/ and memory/ changes. Creates PR or direct commit.",
  parameters: CommitParams,
  async execute(_id, args: Static<typeof CommitParams>) {
    const cwd = process.env.GITGENT_REPO_ROOT || process.cwd();
    const commitMode = process.env.COMMIT_MODE || "pr";
    const defaultBranch = process.env.GITGENT_DEFAULT_BRANCH || "main";

    try {
      // Configure git identity if not set
      try {
        git(["config", "user.name"], cwd);
      } catch {
        git(["config", "user.name", "Gitgent Agent"], cwd);
        git(["config", "user.email", "gitgent@users.noreply.github.com"], cwd);
      }

      // Stage artifacts and memory
      git(["add", "artifacts/", "memory/"], cwd);

      const status = git(["status", "--porcelain", "artifacts/", "memory/"], cwd);
      if (!status) {
        return {
          content: [
            { type: "text" as const, text: "No changes to commit." },
          ],
          details: {},
        };
      }

      const fileCount = status.split("\n").filter(Boolean).length;

      if (commitMode === "direct") {
        git(["commit", "-m", args.message], cwd);
        git(["push"], cwd);
        return {
          content: [
            {
              type: "text" as const,
              text: `Committed ${fileCount} file(s) directly.`,
            },
          ],
          details: {},
        };
      }

      // PR mode
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 16);
      const suffix = Math.random().toString(36).slice(2, 8);
      const skill = sanitizeGitRefSegment(args.skill || "agent");
      const branch = `gitgent/${skill}-${timestamp}-${suffix}`;

      git(["checkout", "-b", branch], cwd);
      git(["commit", "-m", args.message], cwd);
      git(["push", "-u", "origin", branch], cwd);

      let prUrl: string;
      try {
        prUrl = runCommand(
          "gh",
          ["pr", "create", "--title", args.message, "--body", "Automated by Gitgent", "--base", defaultBranch],
          cwd,
        );
      } catch {
        prUrl = `Branch pushed: ${branch} (create PR manually)`;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Committed ${fileCount} file(s) to ${branch}.\n${prUrl}`,
          },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Commit failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};
