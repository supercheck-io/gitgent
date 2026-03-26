---
name: website-builder
description: Build static websites from Markdown, HTML, or existing artifacts. Generate pages ready for GitHub Pages deployment with clean navigation and responsive design.
---

# Website Builder Skill

Build static websites from content provided in the issue or from existing artifacts. Output is ready for GitHub Pages deployment.

## Multi-Site Architecture

Each website-builder run creates its pages under `docs/issue-<number>/` so that multiple tasks can coexist on the same GitHub Pages site. The root `docs/index.html` is an auto-generated landing page that links to every sub-site.

```
docs/
  index.html              ← landing page (auto-generated, links to all sub-sites)
  issue-5/
    index.html             ← site built by issue #5
    about.html
  issue-12/
    index.html             ← site built by issue #12
```

Each sub-site is available at its own URL:
- Root: `https://<user>.github.io/<repo>/`
- Issue #5: `https://<user>.github.io/<repo>/issue-5/`
- Issue #12: `https://<user>.github.io/<repo>/issue-12/`

## Workflow

### Step 1 — Understand Requirements

- Parse the site purpose, content sources, and design preferences from the prompt.
- Check for existing artifacts in `artifacts/` that should be published (reports, data, etc.).
- Determine the issue number from the output directory path (e.g., `artifacts/issue-7/` → issue 7).

### Step 2 — Plan Site Structure

- Define the page hierarchy: home, content pages, navigation.
- Choose a layout approach: single-page (for simple content) or multi-page (for structured sites).
- Plan responsive design — all sites must work on mobile and desktop.

### Step 3 — Build Pages

Generate clean, self-contained HTML pages following these standards:

| Requirement | Implementation |
|-------------|---------------|
| No external dependencies | Inline all CSS; no CDN links, no JavaScript frameworks |
| Responsive design | Use CSS flexbox/grid and media queries |
| Accessibility | Semantic HTML (`nav`, `main`, `article`, `footer`), alt text, proper heading hierarchy |
| Performance | Minimal markup, no unused styles, compressed inline images only when essential |
| Navigation | Consistent nav bar or sidebar across all pages |
| SEO basics | `<title>`, `<meta description>`, Open Graph tags |

Use `bash` and `write` tools to create HTML files. For converting Markdown to HTML:
- Use `bash` with a simple sed/awk script or Python's `markdown` library if available.
- Keep formatting simple — clean typography, readable line lengths, good spacing.

### Step 4 — Generate Artifacts

1. Write all HTML, CSS, and asset files to `docs/issue-<number>/`.
2. Create `docs/issue-<number>/index.html` as the sub-site entry point.
3. If multiple pages exist, generate a navigation structure linking them.
4. **Update the landing page** — regenerate `docs/index.html` by scanning all existing `docs/issue-*/` directories and building a clean index with links to each sub-site. Use `bash` with `ls -d docs/issue-*/ 2>/dev/null` to discover existing sub-sites.
5. Ensure these files exist in the output directory before finishing:
   - `website-report.md` (build summary with page list and deployment instructions)

### Step 5 — Save Memory

- Use `memory_write` type="summary" with site structure, page count, and deployment notes.

## Landing Page Template

The `docs/index.html` landing page should:
- List all sub-sites with their issue number and a brief title (read from each sub-site's `<title>` tag if possible, otherwise use "Issue #N").
- Use a clean, minimal design consistent with the Design Guidelines below.
- Include a "Powered by Gitgent" footer.
- Auto-update on every website-builder run — always regenerate from the current `docs/issue-*/` contents.

## GitHub Pages Deployment Guide (included in website-report.md)

The generated `website-report.md` must include these deployment instructions:

1. **Enable GitHub Pages** — Go to **Settings → Pages → Source** → select **Deploy from a branch**.
2. **Set the branch and folder** — Choose `main` branch and `/docs` folder.
3. **Access the site** — After a few minutes, the landing page will be live at `https://<username>.github.io/<repo>/`.
4. **Sub-site URL** — This task's pages are at `https://<username>.github.io/<repo>/issue-<number>/`.

## Design Guidelines

- Use a clean, modern color palette — default to a neutral scheme unless specified.
- Typography: use system font stacks (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- Max content width: 720–900px centered, with comfortable padding.
- Code blocks: use a monospace font with subtle background shading.
- Tables: clean borders, alternating row colors, horizontal scroll on mobile.

## Important Notes

- All sites must be fully self-contained — no external CDN dependencies, no JavaScript required for core content.
- Generate valid HTML5 (`<!DOCTYPE html>`, proper `<head>`, charset, viewport meta).
- Test navigation links — ensure all internal links point to correct relative paths.
- Internal links within a sub-site should use relative paths (e.g., `about.html`, not `/issue-5/about.html`).
- The link back to the landing page from a sub-site should use `../index.html`.
- If the content includes data tables, make them responsive (horizontal scroll wrapper).
- If converting existing Markdown artifacts, preserve all content — don't summarize or truncate.
- Include a "Generated by Gitgent" footer with the generation date.
