---
name: content-writing
description: Generate professional content — blog posts, articles, social media threads, newsletters, and landing page copy. Adapts tone and style to the target audience.
---

# Content Writing Skill

Generate high-quality content tailored to the specified audience, platform, and brand voice.

## Workflow

### Step 1 — Understand Requirements

- Parse content type, topic, target audience, tone, and length from the prompt.
- If brand guidelines are attached, read them from `attachments/` and follow them.

### Step 2 — Research

- Use `web_search` and `web_fetch` to gather current information, data points, statistics, and expert perspectives on the topic.
- Find relevant examples of high-performing content in the same category.
- Note trending angles and keywords for SEO relevance.

### Step 3 — Write

Follow platform-specific best practices:

| Content Type | Guidelines |
|-------------|-----------|
| Blog post | 800-2000 words. Hook intro, scannable headers, actionable takeaways, CTA. |
| Twitter/X thread | 5-15 posts. Strong hook, numbered for readability, final CTA. |
| LinkedIn post | Professional tone, 200-500 words, engagement question at end. |
| Newsletter | Subject line + preview text, scannable sections, single CTA. |
| Landing page | Headline, subhead, benefits (not features), social proof, CTA. |
| Article | 1000-3000 words. Thesis-driven, well-structured, conclusion. |

### Step 4 — Generate Artifacts

- Write Markdown to the output directory as the primary deliverable.
- `artifact_docx` → Formatted Word version for editing.
- Include: headline/title, meta description (for SEO), word count, and the full content.
- Ensure these files exist in the output directory before finishing:
  - `content-draft.md` (Markdown content)

### Step 5 — Save Memory

- Use `memory_write` type="summary" with content type, topic, key points, and word count.

## Important Notes

- Adapt tone strictly to the specified audience — don't default to generic corporate voice.
- Include a meta description (155 chars max) for any web-published content.
- If writing a thread, each post should stand alone while contributing to the narrative.
- Cite sources for any statistics or claims used.
