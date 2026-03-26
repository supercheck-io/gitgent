---
name: data-analysis
description: Analyze structured data from CSV, Excel, JSON files, or web sources. Generate insights, visualizations, and summary reports.
---

# Data Analysis Skill

Analyze datasets and produce insight reports with structured findings, tables, and actionable recommendations.

## Workflow

### Step 1 — Acquire Data

- **If attachments exist**: Read files from the `attachments/` directory using the `read` tool. Supported formats: CSV, Excel (.xlsx), JSON, TSV.
- **If NO attachments exist**: Use `web_search` and `web_fetch` to find relevant datasets, APIs, or data from authoritative sources (e.g., financial portals, government databases, public APIs). Use `bash` with `curl` or `python` to download and parse data if needed.
- **If a URL is provided**: Use `web_fetch` or `browser_navigate` to retrieve the data.

### Step 2 — Explore and Validate

- Identify columns, data types, row counts, and missing values.
- Check for outliers, duplicates, and data quality issues.
- Summarize the dataset structure before proceeding.

### Step 3 — Analyze

- Perform the analysis requested: trends, comparisons, rankings, anomalies, correlations, aggregations.
- Calculate key statistics: mean, median, min, max, standard deviation, percentiles.
- Create derived metrics when useful (growth rates, ratios, moving averages).

### Step 4 — Generate Artifacts

- `artifact_excel` → Save to the output directory with analyzed data, summary sheets, and formatted tables.
- Write a Markdown report to the output directory with: data overview, key metrics, trend analysis, findings, and recommendations.
- Include clear descriptions of charts and visualizations that should be created from the data.
- Ensure these files exist in the output directory before finishing:
  - `analysis-report.md` (Markdown report)
  - `analysis-data.csv` (structured data export)

### Step 5 — Save Memory

- Use `memory_write` type="summary" with dataset description, key findings, and data sources used.

## Output Structure

| Section | Content |
|---------|---------|
| Data Overview | Source, size, columns, date range, quality notes |
| Key Metrics | Top-line numbers with context |
| Trend Analysis | Patterns over time, growth rates, seasonality |
| Comparative Analysis | Rankings, benchmarks, peer comparisons |
| Anomalies | Outliers, unexpected values, data gaps |
| Recommendations | Actionable insights based on the data |

## Important Notes

- Always cite data sources with URLs or file references.
- When working with financial data, note the currency, time zone, and market.
- If data is insufficient for the requested analysis, state what's missing and analyze what's available.
- Prefer tables and structured data over prose for quantitative findings.
- For large CSV/Excel files, use `bash` with `head`, `wc -l`, or `python` to preview structure before full analysis.
- When web data is needed, try multiple queries and verify numbers across sources before reporting them.
