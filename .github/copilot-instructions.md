# Copilot Instructions for Gitgent

You are working in **Gitgent**, a GitHub-native PI agent project.

## Runtime Shape

- Entry points: `src/main.ts` and `src/github-entrypoint.ts`
- PI SDK session creation: `createAgentSession()`
- Built-in tools exposed to the agent: `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls`
- Custom tools live in `src/extensions/`
- Skills live in `skills/`

## Output Conventions

- Issue-triggered runs write artifacts to `artifacts/issue-<issue-number>/`
- Memory files live under `memory/`
- Workflows commit `artifacts/` and `memory/` back to the repository default branch

## Model Configuration

- Use `GITGENT_PROVIDER` and `GITGENT_MODEL`
- Default provider: `openrouter`
- Default OpenRouter model: `minimax/minimax-m2.7`
- OpenAI automation should use `OPENAI_API_KEY`, not ChatGPT subscription credentials

## Engineering Expectations

- Keep README and workflow behavior aligned
- Prefer PI registry/model resolution over hard-coded provider logic
- Treat custom tool security seriously: no arbitrary token forwarding, shell injection, or workspace escapes
- Preserve issue-scoped artifact paths and label-driven workflows
