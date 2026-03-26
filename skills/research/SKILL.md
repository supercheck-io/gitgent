---
name: research
description: Conduct web research on a topic and produce comprehensive, well-sourced reports.
---

# Research Skill

Deep research on a given topic, synthesizing multiple sources into a structured, well-cited report.

## Workflow

### Step 1 — Initial Search

- Use `web_search` with 3-5 varied queries to cover different angles of the topic.
- Prioritize authoritative sources: academic papers, official documentation, reputable publications.

### Step 2 — Deep Dive

- Use `web_fetch` to read the top 5-10 most relevant sources in full.
- For JavaScript-heavy sites, use `browser_navigate` to load and extract content.
- Take structured notes: key facts, quotes, data points, and source URLs.

### Step 3 — Cross-Reference

- Search for contrasting viewpoints, critiques, and recent developments.
- Verify claims across multiple sources before including them.
- Note any conflicting information and present both sides.

### Step 4 — Generate Artifacts

- Write a comprehensive Markdown report to the output directory.
- `artifact_docx` → Formatted Word version of the report (if requested).
- `artifact_excel` → Any tabular data collected during research.
- Ensure these files exist in the output directory before finishing:
  - `research-report.md` (Markdown report)

### Step 5 — Save Memory

- Use `memory_write` type="summary" with topic, key findings, and top sources.

## Output Structure

| Section | Content |
|---------|---------|
| Executive Summary | 2-3 paragraph overview of findings |
| Background | Context and history of the topic |
| Key Findings | Numbered findings with supporting evidence |
| Analysis | Interpretation, implications, and connections |
| Conclusion | Summary and forward-looking perspective |
| Sources | Numbered list of all sources with URLs |

## Important Notes

- Every factual claim must cite its source URL.
- Distinguish between facts, expert opinions, and your own analysis.
- Note the date of sources — prefer recent information.
- If the topic is evolving rapidly, flag any information that may be outdated.
- If web_search returns limited results, try alternative query phrasings and use web_fetch on known authoritative sites.
- Always write the report to the output directory before finishing — do not just reply with text.
