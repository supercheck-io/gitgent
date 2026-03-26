/**
 * Memory tools — read/write/list for Git-versioned agent memory.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, unlinkSync, renameSync } from "node:fs";
import { join, resolve, relative, dirname } from "node:path";
import { tmpdir } from "node:os";
import { Type, type Static } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

/** Maximum size for a single memory file (512 KB). */
const MAX_MEMORY_FILE_BYTES = 512 * 1024;

/** Maximum total memory directory size (10 MB). */
const MAX_MEMORY_DIR_BYTES = 10 * 1024 * 1024;

function getMemoryDir(): string {
  return process.env.GITGENT_MEMORY_DIR || join(process.env.GITGENT_REPO_ROOT || process.cwd(), "memory");
}

/**
 * Validate that a resolved path stays within the memory directory.
 * Prevents path traversal attacks (e.g., "../../etc/passwd").
 */
function safePath(subPath: string): string {
  const dir = getMemoryDir();
  const resolved = resolve(dir, subPath);
  const rel = relative(dir, resolved);
  if (rel.startsWith("..") || resolve(resolved) !== resolved) {
    throw new Error(`Path traversal blocked: "${subPath}" escapes memory directory`);
  }
  return resolved;
}

/**
 * Atomic write — write to a temp file then rename, preventing partial writes
 * from corrupting memory on crash or concurrent access.
 */
function atomicWriteFileSync(filePath: string, content: string): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const tmpFile = join(dir, `.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    writeFileSync(tmpFile, content, "utf-8");
    renameSync(tmpFile, filePath);
  } catch (error) {
    try { unlinkSync(tmpFile); } catch { /* cleanup best-effort */ }
    throw error;
  }
}

/**
 * Calculate total size of all files in a directory recursively.
 */
function dirSizeBytes(dir: string): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  const scan = (d: string) => {
    for (const entry of readdirSync(d)) {
      const fullPath = join(d, entry);
      const st = statSync(fullPath);
      if (st.isDirectory()) scan(fullPath);
      else total += st.size;
    }
  };
  scan(dir);
  return total;
}

const MemoryReadParams = Type.Object({
  path: Type.String({
    description:
      'Relative path in memory/, e.g. "soul.md" or "summaries/2025-01-01.md"',
  }),
});

const MemoryWriteParams = Type.Object({
  type: Type.String({ description: '"summary" or "daily"' }),
  content: Type.String({ description: "Content to write (Markdown)" }),
  skill: Type.Optional(
    Type.String({ description: "Skill name (used in summary filename)" }),
  ),
});

const MemoryListParams = Type.Object({
  directory: Type.String({
    description:
      'Directory to list: "summaries", "daily", or "" for root. Returns filenames with sizes and dates.',
  }),
});

const MemorySearchParams = Type.Object({
  query: Type.String({
    description: "Text to search for across all memory files (case-insensitive).",
  }),
});

export const memoryReadTool: ToolDefinition<typeof MemoryReadParams> = {
  name: "memory_read",
  label: "Read Memory",
  description:
    "Read a memory file: soul.md, preferences.yaml, summaries/, daily/.",
  parameters: MemoryReadParams,
  async execute(_id, args: Static<typeof MemoryReadParams>) {
    try {
      const filePath = safePath(args.path);
      if (!existsSync(filePath)) {
        return {
          content: [
            { type: "text" as const, text: "" },
          ],
          details: { path: args.path, found: false },
        };
      }
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        return {
          content: [
            { type: "text" as const, text: `"${args.path}" is a directory. Use memory_list instead.` },
          ],
          details: {},
        };
      }
      if (stat.size > MAX_MEMORY_FILE_BYTES) {
        const content = readFileSync(filePath, "utf-8").slice(0, MAX_MEMORY_FILE_BYTES);
        return {
          content: [
            { type: "text" as const, text: content + `\n\n[truncated — file exceeds ${MAX_MEMORY_FILE_BYTES / 1024} KB limit]` },
          ],
          details: { truncated: true, actualSize: stat.size },
        };
      }
      const content = readFileSync(filePath, "utf-8");
      return {
        content: [{ type: "text" as const, text: content }],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Read failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};

export const memoryWriteTool: ToolDefinition<typeof MemoryWriteParams> = {
  name: "memory_write",
  label: "Write Memory",
  description:
    "Write a run summary or daily log. Summaries are timestamped and append-only.",
  parameters: MemoryWriteParams,
  async execute(_id, args: Static<typeof MemoryWriteParams>) {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      let filePath: string;

      // Check total memory directory size before writing
      const currentSize = dirSizeBytes(getMemoryDir());
      const contentBytes = Buffer.byteLength(args.content, "utf-8");
      if (currentSize + contentBytes > MAX_MEMORY_DIR_BYTES) {
        return {
          content: [
            { type: "text" as const, text: `Memory write rejected: total memory would exceed ${MAX_MEMORY_DIR_BYTES / (1024 * 1024)} MB limit. Current: ${(currentSize / 1024).toFixed(1)} KB.` },
          ],
          details: {},
        };
      }

      if (args.type === "summary") {
        const timeStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const skill = args.skill || "general";
        const dir = join(getMemoryDir(), "summaries");
        mkdirSync(dir, { recursive: true });
        filePath = join(dir, `${timeStr}-${skill}.md`);

        if (contentBytes > MAX_MEMORY_FILE_BYTES) {
          return {
            content: [
              { type: "text" as const, text: `Content too large (${(contentBytes / 1024).toFixed(1)} KB). Max per file: ${MAX_MEMORY_FILE_BYTES / 1024} KB.` },
            ],
            details: {},
          };
        }

        atomicWriteFileSync(filePath, args.content);
      } else if (args.type === "daily") {
        const dir = join(getMemoryDir(), "daily");
        mkdirSync(dir, { recursive: true });
        filePath = join(dir, `${dateStr}.md`);
        const existing = existsSync(filePath)
          ? readFileSync(filePath, "utf-8")
          : "";

        const newContent = `${existing}\n## ${now.toISOString().slice(11, 19)}\n\n${args.content}\n`;
        if (Buffer.byteLength(newContent, "utf-8") > MAX_MEMORY_FILE_BYTES) {
          return {
            content: [
              { type: "text" as const, text: `Daily log for ${dateStr} would exceed ${MAX_MEMORY_FILE_BYTES / 1024} KB. Consider starting a new day.` },
            ],
            details: {},
          };
        }

        atomicWriteFileSync(filePath, newContent);
      } else {
        throw new Error(
          `Unknown type: ${args.type}. Use "summary" or "daily".`,
        );
      }

      const displayPath = filePath.replace(getMemoryDir(), "memory").replace(/\/\//g, "/");
      return {
        content: [
          { type: "text" as const, text: `Memory saved: ${displayPath}` },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Write failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};

export const memoryListTool: ToolDefinition<typeof MemoryListParams> = {
  name: "memory_list",
  label: "List Memory",
  description:
    "List files in the memory directory. Use to browse summaries, daily logs, or all memory files.",
  parameters: MemoryListParams,
  async execute(_id, args: Static<typeof MemoryListParams>) {
    try {
      const dir = args.directory ? safePath(args.directory) : getMemoryDir();
      if (!existsSync(dir)) {
        return {
          content: [
            { type: "text" as const, text: `Directory not found: ${args.directory || "/"}` },
          ],
          details: {},
        };
      }

      const entries = readdirSync(dir)
        .filter((f) => f !== ".gitkeep")
        .map((name) => {
          const fullPath = join(dir, name);
          const st = statSync(fullPath);
          const sizeStr = st.size > 1024
            ? `${(st.size / 1024).toFixed(1)} KB`
            : `${st.size} B`;
          const date = st.mtime.toISOString().slice(0, 10);
          const type = st.isDirectory() ? "📁" : "📄";
          return `${type} ${name} (${sizeStr}, ${date})`;
        });

      if (entries.length === 0) {
        return {
          content: [
            { type: "text" as const, text: `No files in memory/${args.directory || ""}` },
          ],
          details: {},
        };
      }

      return {
        content: [
          { type: "text" as const, text: entries.join("\n") },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `List failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};

export const memorySearchTool: ToolDefinition<typeof MemorySearchParams> = {
  name: "memory_search",
  label: "Search Memory",
  description:
    "Search across all memory files for a text query. Returns matching file names and snippets.",
  parameters: MemorySearchParams,
  async execute(_id, args: Static<typeof MemorySearchParams>) {
    try {
      const query = args.query.toLowerCase();
      const results: string[] = [];

      const scanDir = (dir: string, prefix: string) => {
        if (!existsSync(dir)) return;
        for (const entry of readdirSync(dir)) {
          if (entry === ".gitkeep") continue;
          const fullPath = join(dir, entry);
          const relPath = prefix ? `${prefix}/${entry}` : entry;
          const st = statSync(fullPath);
          if (st.isDirectory()) {
            scanDir(fullPath, relPath);
          } else {
            const content = readFileSync(fullPath, "utf-8");
            if (content.toLowerCase().includes(query)) {
              // Extract a short snippet around the match
              const idx = content.toLowerCase().indexOf(query);
              const start = Math.max(0, idx - 40);
              const end = Math.min(content.length, idx + query.length + 40);
              const snippet = content.slice(start, end).replace(/\n/g, " ").trim();
              results.push(`📄 memory/${relPath}: ...${snippet}...`);
            }
          }
        }
      };

      scanDir(getMemoryDir(), "");

      if (results.length === 0) {
        return {
          content: [
            { type: "text" as const, text: `No matches for "${args.query}" in memory.` },
          ],
          details: {},
        };
      }

      return {
        content: [
          { type: "text" as const, text: results.join("\n\n") },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};

const MemoryDeleteParams = Type.Object({
  path: Type.String({
    description:
      'Relative path to delete in memory/, e.g. "summaries/2025-01-01-general.md". Cannot delete soul.md or preferences.yaml.',
  }),
});

/** Protected files that cannot be deleted by the agent. */
const PROTECTED_FILES = new Set(["soul.md", "preferences.yaml"]);

export const memoryDeleteTool: ToolDefinition<typeof MemoryDeleteParams> = {
  name: "memory_delete",
  label: "Delete Memory",
  description:
    "Delete a memory file (summaries or daily logs). Cannot delete soul.md or preferences.yaml.",
  parameters: MemoryDeleteParams,
  async execute(_id, args: Static<typeof MemoryDeleteParams>) {
    try {
      const baseName = args.path.split("/").pop() || args.path;
      if (PROTECTED_FILES.has(baseName) || PROTECTED_FILES.has(args.path)) {
        return {
          content: [
            { type: "text" as const, text: `Cannot delete protected file: ${args.path}` },
          ],
          details: {},
        };
      }

      const filePath = safePath(args.path);
      if (!existsSync(filePath)) {
        return {
          content: [
            { type: "text" as const, text: `File not found: ${args.path}` },
          ],
          details: {},
        };
      }

      const st = statSync(filePath);
      if (st.isDirectory()) {
        return {
          content: [
            { type: "text" as const, text: `Cannot delete directories. Delete individual files instead.` },
          ],
          details: {},
        };
      }

      unlinkSync(filePath);
      return {
        content: [
          { type: "text" as const, text: `Deleted: memory/${args.path}` },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Delete failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};

/**
 * Write an automatic daily log entry. Called by the runtime after each run
 * to ensure the daily/ directory is always populated.
 */
export function writeAutoDailyLog(entry: {
  issueNumber?: number;
  skill?: string | null;
  status: "completed" | "failed" | "no-artifacts";
  model: string;
  duration: string;
  toolCalls: number;
  artifactCount: number;
}): void {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timestamp = now.toISOString().slice(11, 19);
  const dir = join(getMemoryDir(), "daily");
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${dateStr}.md`);

  const existing = existsSync(filePath)
    ? readFileSync(filePath, "utf-8")
    : `# Daily Log — ${dateStr}\n`;

  const lines = [
    `## ${timestamp}`,
    "",
    `- **Status**: ${entry.status}`,
    `- **Model**: ${entry.model}`,
    entry.issueNumber ? `- **Issue**: #${entry.issueNumber}` : null,
    entry.skill ? `- **Skill**: ${entry.skill}` : null,
    `- **Duration**: ${entry.duration}`,
    `- **Tool calls**: ${entry.toolCalls}`,
    `- **Artifacts**: ${entry.artifactCount}`,
  ].filter(Boolean);

  const newContent = `${existing}\n${lines.join("\n")}\n`;

  // Enforce file size limit — truncate old entries if needed
  if (Buffer.byteLength(newContent, "utf-8") > MAX_MEMORY_FILE_BYTES) {
    const truncated = newContent.slice(-MAX_MEMORY_FILE_BYTES);
    atomicWriteFileSync(filePath, `[truncated]\n${truncated}`);
  } else {
    atomicWriteFileSync(filePath, newContent);
  }
}
