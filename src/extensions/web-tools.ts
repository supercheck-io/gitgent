/**
 * Web tools — web_search and web_fetch.
 *
 * web_search: Guides the agent to use its model's built-in search
 *   capabilities or web_fetch for specific URLs. Modern LLMs (Claude,
 *   GPT, Gemini, etc.) have native web search built in.
 *
 * web_fetch: Always available — fetches any URL and extracts text.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { assertSafeHttpUrl } from "./safety.js";

const WebSearchParams = Type.Object({
  query: Type.String({ description: "Search query" }),
});

const WebFetchParams = Type.Object({
  url: Type.String({ description: "URL to fetch" }),
  max_length: Type.Optional(
    Type.Number({ description: "Max content length in chars (default: 10000)" }),
  ),
});

export const webSearchTool: ToolDefinition<typeof WebSearchParams> = {
  name: "web_search",
  label: "Web Search",
  description:
    "Search the web for information. Uses the model's built-in search capabilities.",
  parameters: WebSearchParams,
  async execute(_id, args: Static<typeof WebSearchParams>) {
    return {
      content: [
        {
          type: "text" as const,
          text: [
            `Searching for: ${args.query}`,
            "",
            "Use your built-in web search capability to find this information.",
            "If you need content from a specific URL, use the web_fetch tool.",
          ].join("\n"),
        },
      ],
      details: {},
    };
  },
};

export const webFetchTool: ToolDefinition<typeof WebFetchParams> = {
  name: "web_fetch",
  label: "Web Fetch",
  description:
    "Fetch content from a URL and extract readable text. Always available (no API key needed).",
  parameters: WebFetchParams,
  async execute(_id, args: Static<typeof WebFetchParams>) {
    const { url, max_length } = args;
    const maxLength = Math.max(1, Math.min(max_length ?? 10_000, 5_000_000));

    try {
      const safeUrl = await assertSafeHttpUrl(url);
      const response = await fetch(safeUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Gitgent/1.0; +https://github.com/gitgent)",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      // Limit response size to prevent memory exhaustion (5 MB)
      const contentLength = response.headers.get("content-length");
      if (contentLength && Number.parseInt(contentLength, 10) > 5 * 1024 * 1024) {
        throw new Error("Response too large (>5 MB)");
      }

      let text = await response.text();

      // Basic HTML to text
      text = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, "/")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/\s+/g, " ")
        .trim();

      if (text.length > maxLength) {
        text = text.slice(0, maxLength) + "\n\n[Content truncated]";
      }

      return {
        content: [{ type: "text" as const, text }],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};
