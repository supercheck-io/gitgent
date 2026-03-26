/**
 * GitHub API tools.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

function resolveGithubApiUrl(baseUrl: string, endpoint: string): string {
  if (!endpoint.startsWith("/")) {
    throw new Error("GitHub API endpoint must be a relative path starting with '/'.");
  }

  const rawPath = endpoint.split(/[?#]/, 1)[0];
  const decodedSegments = rawPath.split("/").map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      throw new Error("GitHub API endpoint contains invalid encoding.");
    }
  });

  if (decodedSegments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("GitHub API endpoint contains invalid path segments.");
  }

  const apiBaseUrl = new URL(baseUrl);
  const url = new URL(endpoint, apiBaseUrl);
  if (url.origin !== apiBaseUrl.origin) {
    throw new Error("GitHub API endpoint must stay within the configured API host.");
  }

  return url.toString();
}

async function githubApi(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");

  const baseUrl = process.env.GITHUB_API_URL || "https://api.github.com";
  const url = resolveGithubApiUrl(baseUrl, endpoint);

  return fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
}

const CreateIssueParams = Type.Object({
  repo: Type.String({ description: 'Repository "owner/repo"' }),
  title: Type.String({ description: "Issue title" }),
  body: Type.Optional(Type.String({ description: "Issue body (Markdown)" })),
  labels: Type.Optional(
    Type.Array(Type.String(), { description: "Labels to apply" }),
  ),
});

const CreatePrParams = Type.Object({
  repo: Type.String({ description: 'Repository "owner/repo"' }),
  title: Type.String({ description: "PR title" }),
  head: Type.String({ description: "Source branch" }),
  base: Type.Optional(Type.String({ description: 'Target branch (default: "main")' })),
  body: Type.Optional(Type.String({ description: "PR body (Markdown)" })),
});

const GenericApiParams = Type.Object({
  endpoint: Type.String({ description: 'API endpoint, e.g. "/repos/owner/repo"' }),
  method: Type.Optional(Type.String({ description: 'HTTP method (default: "GET")' })),
  body: Type.Optional(Type.String({ description: "JSON request body for POST/PUT/PATCH" })),
});

export const githubCreateIssueTool: ToolDefinition<typeof CreateIssueParams> = {
  name: "github_create_issue",
  label: "Create GitHub Issue",
  description: "Create an issue in a GitHub repository.",
  parameters: CreateIssueParams,
  async execute(_id, args: Static<typeof CreateIssueParams>) {
    try {
      const response = await githubApi(`/repos/${args.repo}/issues`, {
        method: "POST",
        body: JSON.stringify({
          title: args.title,
          body: args.body || "",
          labels: args.labels || [],
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
      }

      const issue = (await response.json()) as { html_url: string };
      return {
        content: [
          { type: "text" as const, text: `Issue created: ${issue.html_url}` },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Issue creation failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};

export const githubCreatePrTool: ToolDefinition<typeof CreatePrParams> = {
  name: "github_create_pr",
  label: "Create Pull Request",
  description: "Create a pull request in a GitHub repository.",
  parameters: CreatePrParams,
  async execute(_id, args: Static<typeof CreatePrParams>) {
    try {
      const defaultBranch = process.env.GITGENT_DEFAULT_BRANCH || "main";
      const response = await githubApi(`/repos/${args.repo}/pulls`, {
        method: "POST",
        body: JSON.stringify({
          title: args.title,
          body: args.body || "",
          head: args.head,
          base: args.base || defaultBranch,
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
      }

      const pr = (await response.json()) as { html_url: string };
      return {
        content: [
          { type: "text" as const, text: `PR created: ${pr.html_url}` },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `PR creation failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};

export const githubApiTool: ToolDefinition<typeof GenericApiParams> = {
  name: "github_api",
  label: "GitHub API",
  description: "Make a generic GitHub REST API call.",
  parameters: GenericApiParams,
  async execute(_id, args: Static<typeof GenericApiParams>) {
    try {
      if (args.body) {
        try {
          JSON.parse(args.body);
        } catch {
          return {
            content: [{ type: "text" as const, text: "Invalid JSON in body parameter." }],
            details: {},
          };
        }
      }

      const response = await githubApi(args.endpoint, {
        method: args.method || "GET",
        body: args.body || undefined,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`GitHub API ${response.status}: ${text}`);
      }

      const truncated =
        text.length > 10_000 ? text.slice(0, 10_000) + "\n[truncated]" : text;
      return {
        content: [{ type: "text" as const, text: truncated }],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `GitHub API failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};
