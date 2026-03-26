# Contributing to Gitgent

Thanks for your interest in contributing to Gitgent!

## Quick Start

```bash
git clone https://github.com/supercheck-io/gitgent.git && cd gitgent
npm install
npm run build    # TypeScript type-check
npm test         # Run tests
```

## How to Contribute

- **Bug reports**: Use [GitHub Discussions](https://github.com/supercheck-io/gitgent/discussions) with reproduction steps, expected vs. actual behavior, and environment details.
- **Feature requests**: Use [GitHub Discussions](https://github.com/supercheck-io/gitgent/discussions) describing the use case and proposed solution.
- **Pull requests**: Fork, create a branch, make changes, and submit a PR.

## Before Submitting a PR

1. Run `npm run build` — must pass with no type errors.
2. Run `npm test` — all tests must pass.
3. Run `npm run test:coverage` — check coverage for your changes.
4. Keep changes focused — avoid bundling unrelated refactors.
5. Follow the existing code style (TypeScript ESM, strict typing).

## CI Pipeline

Every PR and push to `main` runs these checks automatically:

| Job | What it does |
|-----|-------------|
| **typecheck-and-test** | TypeScript type-check + Jest tests with coverage |
| **lint-workflows** | Validates all GitHub Actions workflow YAML |
| **label** | Auto-labels PRs based on changed files |

All checks must pass before merging.

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `src/` | Core agent runtime and entrypoints |
| `src/extensions/` | Custom tools (web, browser, documents, GitHub, memory, git) |
| `skills/` | Domain-specific agent instruction sets |
| `memory/` | Git-versioned agent memory |
| `artifacts/` | Agent output files (per-issue) |
| `tests/` | Test files |
| `.github/` | Workflows, issue templates, labels |

## Code Style

- TypeScript (ESM) with strict mode
- Use TypeBox schemas for tool parameters
- Path-safe: always use `resolveWorkspacePath()` or `safePath()` for file access
- No `any` types — use proper typing
- Keep files focused and under ~500 LOC when feasible

## Security

- Never commit API keys, tokens, or secrets
- All file access must use path traversal protection
- External URLs must pass SSRF validation via `assertSafeHttpUrl()`
- See [SECURITY.md](SECURITY.md) for vulnerability reporting
