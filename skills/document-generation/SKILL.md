---
name: document-generation
description: Create professional documents — business proposals, technical specifications, project plans, and formal reports with proper structure and formatting.
---

# Document Generation Skill

Generate professional, structured documents ready for business use, with proper formatting and clear organization.

## Workflow

### Step 1 — Understand Scope

- Parse document type, subject, target audience, and desired length from the prompt.
- Identify the document's purpose: persuade, inform, plan, or report.
- If reference materials are attached, read them from `attachments/`.

### Step 2 — Research

- Use `web_search` and `web_fetch` for supporting data, industry benchmarks, comparable examples, and references.
- Gather statistics and quotes that strengthen the document.

### Step 3 — Draft

Structure content following professional standards for the document type:

| Document Type | Structure |
|--------------|-----------|
| Proposal | Executive summary, problem statement, proposed solution, timeline, budget, terms |
| Technical Spec | Overview, architecture, requirements, API contracts, data models, testing plan |
| Project Plan | Objectives, scope, milestones, deliverables, timeline, resources, risks, dependencies |
| Report | Executive summary, methodology, findings, analysis, recommendations, appendices |
| Business Plan | Vision, market analysis, strategy, financial projections, team, milestones |

### Step 4 — Generate Artifacts

- `artifact_docx` → Primary formatted Word document.
- Write Markdown version to the output directory for easy review.
- `artifact_pptx` → Companion presentation if requested or appropriate.
- `artifact_excel` → Supporting data tables if the document includes quantitative analysis.
- Ensure these files exist in the output directory before finishing:
  - `generated-document.md` (Markdown version)

### Step 5 — Save Memory

- Use `memory_write` type="summary" with document type, subject, and key sections.

## Formatting Standards

- Use consistent heading hierarchy (H1 for title, H2 for sections, H3 for subsections).
- Include a table of contents outline for documents longer than 3 pages.
- Use tables for structured comparisons and data.
- Number sections for formal documents (1.0, 1.1, 1.2...).
- Include title page information: title, author, date, version.

## Important Notes

- Match the formality level to the audience — executive vs. technical vs. general.
- Include actionable next steps or recommendations where appropriate.
- If the document references external data, cite sources.
- Keep paragraphs concise — aim for 3-5 sentences each.
