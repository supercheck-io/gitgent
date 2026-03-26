# Advanced Guide

Technical reference for developers and power users. For setup instructions, see the [README](README.md).

---

## Run Locally

Gitgent works without GitHub Actions. Clone the repo and run directly with Node.js (v22+):

```bash
git clone https://github.com/supercheck-io/gitgent.git && cd gitgent
npm install && npx playwright install chromium --with-deps

OPENROUTER_API_KEY="sk-or-v1-..." npx tsx src/main.ts --prompt "Your task"
```

Artifacts are saved to `artifacts/` and memory to `memory/` — the same paths used in CI.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GITGENT_PROVIDER` | `openrouter` | LLM provider id |
| `GITGENT_MODEL` | `minimax/minimax-m2.7` | Model id |
| `MAX_RUNTIME_MINUTES` | `30` | Execution timeout (minutes) |

Set these as **repository variables** via **Settings → Variables → Actions**.

### Provider Reference

Set `GITGENT_PROVIDER` and add the matching API key as a **repository secret**:

| Provider | `GITGENT_PROVIDER` | Secret | Default Model |
|----------|-------------------|--------|---------------|
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` | `minimax/minimax-m2.7` |
| OpenAI | `openai` | `OPENAI_API_KEY` | `gpt-4.1` |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |
| Google | `google` | `GEMINI_API_KEY` | `gemini-2.5-pro` |
| xAI | `xai` | `XAI_API_KEY` | `grok-3` |
| Mistral | `mistral` | `MISTRAL_API_KEY` | `mistral-large-latest` |
| Groq | `groq` | `GROQ_API_KEY` | `llama-3.3-70b-versatile` |

<details>
<summary>More providers</summary>

| Provider | `GITGENT_PROVIDER` | Secret |
|----------|-------------------|--------|
| Azure OpenAI | `azure-openai-responses` | `AZURE_OPENAI_API_KEY` |
| Cerebras | `cerebras` | `CEREBRAS_API_KEY` |
| Hugging Face | `huggingface` | `HF_TOKEN` |
| Kimi | `kimi-coding` | `KIMI_API_KEY` |
| MiniMax | `minimax` | `MINIMAX_API_KEY` |
| Vercel AI Gateway | `vercel-ai-gateway` | `AI_GATEWAY_API_KEY` |

</details>

> When using a non-OpenRouter provider, update your workflow `env:` block to pass the matching secret.

---

## Tools Reference

### Built-in (PI SDK)

`read` · `bash` · `edit` · `write` · `grep` · `find` · `ls`

### Extensions

| Category | Tools | Source |
|----------|-------|--------|
| **Web** | `web_search` · `web_fetch` | `src/extensions/web-tools.ts` |
| **Browser** | `browser_navigate` · `browser_screenshot` · `browser_click` · `browser_type` | `src/extensions/browser-tools.ts` |
| **Documents** | `artifact_excel` · `artifact_pptx` · `artifact_docx` | `src/extensions/artifact-tools.ts` |
| **GitHub** | `github_create_issue` · `github_create_pr` · `github_api` | `src/extensions/github-tools.ts` |
| **Memory** | `memory_read` · `memory_write` · `memory_list` · `memory_search` · `memory_delete` | `src/extensions/memory-tools.ts` |
| **Git** | `git_commit_artifacts` | `src/extensions/git-commit.ts` |

**Memory limits:** 512 KB per file, 10 MB total. Protected files (`soul.md`, `preferences.yaml`) cannot be deleted.

---

## Scheduling

Add a schedule label to any issue with the `gitgent` label to run it on a recurring basis.

| Label | Frequency |
|-------|-----------|
| `schedule:hourly` | Every hour |
| `schedule:daily` | Daily at 9 AM UTC |
| `schedule:weekly` | Mondays at 9 AM UTC |
| `schedule:custom` | Custom cron — add `cron: 0 14 * * 1-5` to the issue body |

A scheduler workflow runs every hour, scans open issues for schedule labels, and triggers the agent automatically. Keep the issue **open** to continue the schedule.

---

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

---

## Development

```bash
git clone https://github.com/supercheck-io/gitgent.git && cd gitgent
npm install
npm run build    # TypeScript type-check
npm test         # Run tests
```

### Code Style

- TypeScript (ESM) with strict mode
- TypeBox schemas for tool parameters
- Path traversal protection via `resolveWorkspacePath()` / `safePath()`
- SSRF validation via `assertSafeHttpUrl()`
- No `any` types

See [CONTRIBUTING.md](CONTRIBUTING.md) for pull request guidelines.

---

## Security Model

- **GITHUB_TOKEN**: Scoped to `contents: write`, `issues: write`, `pull-requests: write`
- **API keys**: Stored as GitHub Secrets, never logged or exposed
- **File access**: Constrained via path traversal protection
- **Network access**: SSRF protection blocks localhost, private IPs, and metadata endpoints
- **Output isolation**: `memory/` and `artifacts/` directories only

See [SECURITY.md](SECURITY.md) for vulnerability reporting and data exposure details.
