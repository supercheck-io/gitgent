---
name: code-review
description: Review code repositories, pull requests, or individual files for bugs, security vulnerabilities, performance issues, and adherence to best practices.
---

# Code Review Skill

Perform thorough code review with structured, actionable feedback organized by severity.

## Workflow

### Step 1 — Scope Analysis

- Identify which files, directories, or PR to review from the prompt.
- If a PR URL is provided, use `github_api` to fetch the diff and changed files.
- If reviewing a repo, prioritize: entry points, API handlers, authentication, data access layers.

### Step 2 — Read and Analyze Code

- Use the `read` tool to examine target files thoroughly.
- Check each file against the review categories below.
- Track findings with file paths and line numbers.

### Step 3 — Review Categories

| Category | What to Check |
|----------|--------------|
| 🔴 **Bugs** | Null/undefined references, race conditions, off-by-one errors, unhandled exceptions, incorrect logic |
| 🔴 **Security** | SQL injection, XSS, command injection, hardcoded secrets, insecure defaults, missing auth checks, path traversal |
| 🟡 **Performance** | N+1 queries, unnecessary re-renders, memory leaks, missing indexes, unoptimized loops, large bundle imports |
| 🟡 **Error Handling** | Missing try/catch, swallowed errors, uninformative error messages, missing validation |
| 🔵 **Best Practices** | DRY violations, SOLID principles, naming conventions, code organization, dead code |
| 🔵 **Testing** | Missing test coverage, flaky test patterns, untested edge cases |

### Step 4 — Generate Artifacts

- Write a structured review report to the output directory.
- Organize findings by severity: 🔴 Critical → 🟡 Warning → 🔵 Suggestion.
- Include code snippets showing the problem and suggested fix for each finding.

### Step 5 — Save Memory

- Use `memory_write` type="summary" with repo/PR info, critical finding count, and overall assessment.

## Finding Format

Each finding should include:

```
### [SEVERITY] Brief Description

**File**: `path/to/file.ts` line 42
**Category**: Security / Bug / Performance / etc.

**Problem**: Description of the issue.

**Current code**:
\`\`\`typescript
// problematic code
\`\`\`

**Suggested fix**:
\`\`\`typescript
// improved code
\`\`\`
```

## Important Notes

- Prioritize security and correctness issues — these are always 🔴 Critical.
- Include a summary score: overall code quality assessment (1-10) with justification.
- Note positive patterns too — acknowledge well-written code.
- For large codebases, focus on the most impactful files rather than reviewing everything superficially.
