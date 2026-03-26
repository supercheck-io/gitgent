# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Gitgent, please report it responsibly.

**Do NOT open a public issue for security vulnerabilities.**

Instead, please use [GitHub Security Advisories](https://github.com/supercheck-io/gitgent/security/advisories/new) to privately report the issue.

### Required Information

- **Summary**: One-sentence description of the vulnerability
- **Severity**: Critical / High / Medium / Low
- **Affected component**: Which file(s) or tool(s) are affected
- **Steps to reproduce**: Clear, minimal reproduction steps
- **Impact**: What an attacker could achieve
- **Suggested fix**: (Optional) How to remediate

## Security Model

Gitgent runs as a GitHub Actions agent with the following trust boundaries:

- **GITHUB_TOKEN**: Scoped to the repository with `contents: write`, `issues: write`, `pull-requests: write`
- **API keys**: Stored as GitHub Secrets, never logged or exposed in artifacts
- **File access**: Constrained to the repository checkout via path traversal protection
- **Network access**: SSRF protection blocks localhost, private IPs, and metadata endpoints
- **Memory/artifacts**: Written only within `memory/` and `artifacts/` directories

## Data Exposure — Private Repos Required

Gitgent posts task results on GitHub Issues and commits output files to the repository. In a **public** repo, this data is visible to everyone on the internet.

| Data | Location | Visible if public? |
|------|----------|--------------------|
| Task prompts | Issue body | Yes |
| Agent results | Issue comments | Yes |
| Generated files | `artifacts/` directory | Yes |
| Agent memory | `memory/` directory | Yes |
| Workflow logs | GitHub Actions logs | Yes |
| API keys | GitHub Secrets | **No** (always encrypted) |

**Always use a private repository for your personal Gitgent instance.** Use the **"Use this template"** button (not Fork) and set visibility to Private. GitHub forks of public repos cannot be made private.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest `main` | Yes |

## Out of Scope

- Prompt injection into the LLM (inherent to agent systems)
- Rate limiting of GitHub Actions (controlled by GitHub)
- Vulnerabilities in upstream dependencies (report to the dependency maintainer)
