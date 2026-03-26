---
name: marketing
description: Perform competitor analysis, market research, and generate actionable marketing reports with structured comparisons.
---

# Marketing Analysis Skill

Analyze competitors, market positioning, and content strategy to produce actionable marketing insights.

## Workflow

### Step 1 — Research Competitors

- Use `web_search` to find competitor websites, recent news, product announcements, and pricing pages.
- Search for industry reports, market share data, and analyst commentary.

### Step 2 — Deep Analysis

- Use `web_fetch` to extract detailed content from competitor pages (features, pricing, messaging).
- Use `browser_navigate` + `browser_screenshot` to capture competitor website designs and key pages.
- Analyze their content strategy: blog frequency, topics, social media presence.

### Step 3 — Comparative Analysis

- Build a feature-by-feature comparison matrix.
- Identify positioning differences: target audience, value propositions, differentiators.
- Find content gaps and opportunities.

### Step 4 — Generate Artifacts

- `artifact_pptx` → Competitive landscape presentation with key slides.
- `artifact_excel` → Structured comparison spreadsheet with all competitor data.
- Write a detailed Markdown analysis report to the output directory.
- Ensure these files exist in the output directory before finishing:
  - `marketing-analysis.md` (Markdown report)
  - `competitor-matrix.csv` (structured comparison data)

### Step 5 — Save Memory

- Use `memory_write` type="summary" with competitor names, key findings, and strategic recommendations.

## Output Structure

| Section | Content |
|---------|---------|
| Market Overview | Industry context, trends, market size |
| Competitor Profiles | Per-competitor: description, strengths, weaknesses |
| Feature Comparison | Matrix comparing features across competitors |
| Pricing Analysis | Pricing models, tiers, value comparison |
| Content & Messaging | Positioning, tone, key messages, content strategy |
| Opportunities | Gaps, underserved segments, differentiation options |
| Recommendations | Prioritized action items with rationale |

## Important Notes

- Present data in tables for easy scanning.
- Include screenshots of competitor websites when relevant.
- Note the date of all data — competitor info changes frequently.
- Distinguish between publicly available information and inferences.
