# Gitgent — PI Agent Project Context

## What This Project Is

Gitgent is a GitHub-native AI agent that executes tasks when users create issues or post `/gitgent` commands. It uses PI agent SDK as the execution engine.

## Key Architecture

- **LLM Runtime**: OpenRouter by default, single model target per run (default: `minimax/minimax-m2.7`)
- **Alternative Providers**: Set `GITGENT_PROVIDER` and matching API key for OpenAI, Google, Anthropic, etc.
- **Optional Override**: `GITGENT_MODEL` (or `LLM_MODEL`) for controlled model switching
- **No Provider/Model Fallback**: Runs do not use fallback chains
- **PI Internal Resilience**: Auto-retry and auto-compaction remain enabled
- **Bounded Recovery Pass**: Artifact-required runs may perform one extra same-model recovery pass
- **Required Secret**: `OPENROUTER_API_KEY`
- **Entry points**: `src/main.ts` (CLI), `src/github-entrypoint.ts` (Actions)
- **Custom tools**: 18 tools in `src/extensions/` — web, browser, documents, GitHub, memory, git
- **Skills**: `skills/` directory with `SKILL.md` files (PI auto-discovers)
- **Memory**: `memory/` directory — soul.md, preferences, summaries, daily logs

## Tool Categories

1. **Web** (`web-tools.ts`): `web_search`, `web_fetch`
2. **Browser** (`browser-tools.ts`): `navigate`, `screenshot`, `click`, `type` (Playwright)
3. **Documents** (`artifact-tools.ts`): Excel, PowerPoint, Word generation
4. **GitHub** (`github-tools.ts`): create issues, PRs, generic API calls
5. **Memory** (`memory-tools.ts`): read, write, list, search, delete agent memory
6. **Git** (`git-commit.ts`): commit artifacts and create PRs

## Important Conventions

- All tools use TypeBox schemas (`@sinclair/typebox`)
- Artifacts go to `artifacts/` directory
- Memory goes to `memory/` directory
- Commit via PR by default (`COMMIT_MODE=pr`)
- Skills use the `SKILL.md` format with YAML frontmatter

## API Keys

Required (default provider):
- `OPENROUTER_API_KEY` — OpenRouter execution

Alternative providers use their matching secret (e.g. `OPENAI_API_KEY`, `GEMINI_API_KEY`).
