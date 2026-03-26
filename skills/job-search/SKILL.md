---
name: job-search
description: Search for job listings matching specified criteria, extract details, and generate structured reports with recommendations.
---

# Job Search Skill

Search for job listings on the web, extract structured details, and generate a comprehensive report with top picks.

## Workflow

### Step 0 — Validate Inputs

- Read Job Title, Location, Experience Level, Keywords, and Resume/Context from the issue body.
- If Job Title is missing, infer it from Keywords and Resume/Context (for example: SRE, DevOps Engineer, Test Automation Engineer).
- If multiple fields are missing, choose reasonable defaults and continue (do not ask follow-up questions).

### Step 1 — Search

- Use `web_search` with queries combining: job title, location, keywords, experience level.
- Search across multiple sources: LinkedIn, Indeed, Glassdoor, company career pages, niche job boards.
- Run 3-5 varied search queries to maximize coverage.

### Step 2 — Extract Details

- Use `web_fetch` to extract content from promising job listing URLs.
- For JavaScript-heavy job boards (LinkedIn, Greenhouse), use `browser_navigate` to load pages.
- Extract: title, company, location, salary range, posting date, requirements, and application URL.

### Step 3 — Evaluate and Rank

- Score each listing based on match to the specified criteria.
- Note salary ranges, benefits, and company reputation where available.
- Flag remote-friendly, visa-sponsoring, or other notable attributes.

### Step 4 — Generate Artifacts

- `artifact_excel` → Structured spreadsheet with all listings, sortable by match score.
- Write a Markdown summary to the output directory with top 10 picks and why they're recommended.
- Ensure these files exist in the issue artifact folder before finishing:
- `jobs-report.md` (Markdown summary)
- `jobs-table.csv` (structured listing table)

### Step 5 — Save Memory

- Use `memory_write` type="summary" with search criteria, number of results, and top recommendations.

## Output Structure

**Excel columns**: Title, Company, Location, Salary Range, URL, Posted Date, Remote?, Match Score, Notes

**Markdown report sections**:

| Section | Content |
|---------|---------|
| Search Summary | Criteria used, sources searched, total results |
| Top Picks | Ranked list with description and match rationale |
| Market Insights | Salary trends, demand indicators, common requirements |
| Application Tips | Tailored advice based on the listings found |

## Important Notes

- Always include direct application URLs.
- If salary isn't listed, note "Not disclosed" rather than guessing.
- If attachments include a resume, tailor recommendations to the candidate's experience.
- Prefer listings posted within the last 30 days.
- If live search tools are unavailable, still create best-effort fallback artifacts with clearly marked assumptions and manual search links.
