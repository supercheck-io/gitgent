---
name: news-briefing
description: Monitor news and developments on specified topics. Search multiple sources, summarize key stories, and produce a structured briefing report. Ideal for scheduled recurring runs.
---

# News Briefing Skill

Monitor news on specified topics and produce a concise, well-sourced briefing report. Designed for both one-off and recurring scheduled runs.

## Workflow

### Step 1 — Parse Topics and Scope

- Extract the topics, industry, and geographic focus from the prompt.
- Identify time window: last 24 hours (daily), last 7 days (weekly), or custom.
- If this is a recurring run, use `memory_search` to find previous briefings and avoid repeating stories.

### Step 2 — Search for News

- Use `web_search` with 3–5 queries per topic to cover breaking news, analysis, and opinions.
- Target news sources: major outlets, industry publications, official announcements, press releases.
- Use `web_fetch` to extract full article content from the most relevant results.
- For paywalled or JavaScript-heavy sites, use `browser_navigate` to load and extract content.

### Step 3 — Curate and Organize

- Filter out duplicate stories, press release spam, and low-quality sources.
- Group stories by topic or theme.
- Assess impact level for each story: 🔴 High Impact, 🟡 Notable, 🔵 Worth Watching.
- Cross-reference claims across multiple sources.

### Step 4 — Generate Artifacts

- Write a structured Markdown briefing to the output directory.
- `artifact_excel` → Structured news tracker with all stories, sources, dates, and impact levels.
- Ensure these files exist in the output directory before finishing:
  - `news-briefing.md` (Markdown briefing report)
  - `news-tracker.csv` (structured story list)

### Step 5 — Save Memory

- Use `memory_write` type="summary" with topics covered, story count, and top headlines.
- For recurring runs, this memory helps the next run avoid duplicating coverage.

## Output Structure

| Section | Content |
|---------|---------|
| Headlines | Top 3–5 stories with one-line summaries |
| Detailed Coverage | Per-story: headline, source, date, summary, and why it matters |
| Trends | Patterns, recurring themes, or emerging shifts |
| On the Radar | Stories to watch — early signals, upcoming events, pending decisions |
| Sources | Numbered list of all sources with URLs and publication dates |

## Important Notes

- Every story must cite its source URL and publication date.
- Prefer stories from the last 24 hours for daily briefs, last 7 days for weekly.
- If previous briefings exist in memory, explicitly note what's new vs. ongoing.
- When sources conflict, present both sides and note the disagreement.
- If search results are thin for a topic, say so — don't pad with irrelevant stories.
- Always write the briefing to the output directory before finishing — do not just reply with text.
