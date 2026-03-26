/**
 * Browser tools — Playwright browser automation.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { assertSafeHttpUrl, displayWorkspacePath, resolveWorkspacePath } from "./safety.js";

const NavigateParams = Type.Object({
  url: Type.String({ description: "URL to navigate to" }),
  wait_for: Type.Optional(
    Type.String({
      description: 'Wait strategy: "load", "domcontentloaded", "networkidle"',
    }),
  ),
});

const ScreenshotParams = Type.Object({
  path: Type.String({ description: "File path to save screenshot (PNG)" }),
  full_page: Type.Optional(
    Type.Boolean({ description: "Capture full scrollable page" }),
  ),
});

const ClickParams = Type.Object({
  selector: Type.String({ description: "CSS selector to click" }),
});

const TypeParams = Type.Object({
  selector: Type.String({ description: "CSS selector of input" }),
  text: Type.String({ description: "Text to type" }),
});

// Lazy browser singleton with cleanup on process exit
let browserPromise: Promise<{
  browser: import("playwright").Browser;
  page: import("playwright").Page;
}> | null = null;

let cleanupRegistered = false;

async function ensureBrowser() {
  if (browserPromise) return browserPromise;

  // Assign the promise immediately to prevent concurrent launches
  browserPromise = (async () => {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    if (!cleanupRegistered) {
      cleanupRegistered = true;
      const cleanup = () => { browser.close().catch(() => {}); };
      process.on("exit", cleanup);
      process.on("SIGINT", () => { cleanup(); process.exit(130); });
      process.on("SIGTERM", () => { cleanup(); process.exit(143); });
    }

    return { browser, page };
  })();

  // If launch fails, clear the singleton so next call retries
  browserPromise.catch(() => { browserPromise = null; });

  return browserPromise;
}

export const browserNavigateTool: ToolDefinition<typeof NavigateParams> = {
  name: "browser_navigate",
  label: "Browser Navigate",
  description: "Navigate to a URL. Returns page title and text content.",
  parameters: NavigateParams,
  async execute(_id, args: Static<typeof NavigateParams>) {
    try {
      const { page } = await ensureBrowser();
      const safeUrl = await assertSafeHttpUrl(args.url);
      const waitUntil = (args.wait_for || "load") as
        | "load"
        | "domcontentloaded"
        | "networkidle";
      await page.goto(safeUrl.toString(), { waitUntil, timeout: 30_000 });
      const title = await page.title();
      const text = await page.innerText("body").catch(() => "");
      const truncated =
        text.length > 5000 ? text.slice(0, 5000) + "\n[truncated]" : text;

      return {
        content: [
          {
            type: "text" as const,
            text: `Page: ${title}\nURL: ${page.url()}\n\n${truncated}`,
          },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Navigation failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};

export const browserScreenshotTool: ToolDefinition<typeof ScreenshotParams> = {
  name: "browser_screenshot",
  label: "Browser Screenshot",
  description: "Take a screenshot of the current browser page.",
  parameters: ScreenshotParams,
  async execute(_id, args: Static<typeof ScreenshotParams>) {
    try {
      const { page } = await ensureBrowser();
      const outputPath = resolveWorkspacePath(args.path);
      await page.screenshot({
        path: outputPath,
        fullPage: args.full_page ?? false,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `Screenshot saved: ${displayWorkspacePath(outputPath)}`,
          },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Screenshot failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};

export const browserClickTool: ToolDefinition<typeof ClickParams> = {
  name: "browser_click",
  label: "Browser Click",
  description: "Click on an element in the browser page.",
  parameters: ClickParams,
  async execute(_id, args: Static<typeof ClickParams>) {
    try {
      const { page } = await ensureBrowser();
      await page.click(args.selector, { timeout: 10_000 });
      return {
        content: [
          { type: "text" as const, text: `Clicked: ${args.selector}` },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Click failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};

export const browserTypeTool: ToolDefinition<typeof TypeParams> = {
  name: "browser_type",
  label: "Browser Type",
  description: "Type text into an input element.",
  parameters: TypeParams,
  async execute(_id, args: Static<typeof TypeParams>) {
    try {
      const { page } = await ensureBrowser();
      await page.fill(args.selector, args.text);
      return {
        content: [
          { type: "text" as const, text: `Typed into ${args.selector}` },
        ],
        details: {},
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Type failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        details: {},
      };
    }
  },
};
