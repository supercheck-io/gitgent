<div align="center">
  <img src="logo.png" width="120" alt="Gitgent Logo" />
  <h1>Gitgent</h1>
  <p><strong>Your AI agent, right inside GitHub.</strong><br/>Create an issue. Get results. Artifacts committed automatically.</p>

  <p>
    <a href="https://github.com/supercheck-io/gitgent/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/supercheck-io/gitgent/ci.yml?branch=main&style=for-the-badge" alt="CI" /></a>
    <a href="https://github.com/supercheck-io/gitgent/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
    <img src="https://img.shields.io/badge/Node-%3E%3D22-brightgreen?style=for-the-badge&logo=node.js&logoColor=white" alt="Node >= 22" />
  </p>

  <p>
    <a href="#get-started">Get Started</a> · 
    <a href="#what-can-it-do">What Can It Do?</a> · 
    <a href="#how-it-works">How It Works</a> · 
    <a href="#choose-your-ai-provider">Providers</a> · 
    <a href="#scheduling">Scheduling</a> · 
    <a href="#storage--artifacts">Storage</a> · 
    <a href="#gitgent-vs-openclaw">Compare</a> · 
    <a href="#questions">Questions</a>
  </p>
</div>

---

### Get Started

```mermaid
flowchart LR
    A(Use This Template) --> B(Add API Key)
    B --> C(Create Issue)
    C --> D(Get Results)

    style A fill:#2d333b,stroke:#539bf5,color:#adbac7
    style B fill:#2d333b,stroke:#539bf5,color:#adbac7
    style C fill:#2d333b,stroke:#539bf5,color:#adbac7
    style D fill:#2d333b,stroke:#347d39,color:#57ab5a,stroke-width:2px
```

1. **Use this template** — Click the green **Use this template** button above → **Create a new repository** → set visibility to **Private**.
2. **Add your API key** — In your new repo, go to **Settings → Secrets → Actions** → add `OPENROUTER_API_KEY` ([get one here](https://openrouter.ai/keys)).
3. **Create an issue** — Pick any issue template. The `gitgent` label triggers the agent automatically.

That's it. The agent picks up the issue, executes the task, posts results as comments, and commits output files to your repo.

> **Always create a private repo.** The agent posts results on issues and commits files — a public repo would expose your data. Use **"Use this template"** (not Fork) so you can set it to Private.

---

### What Can It Do?

Pick an issue template and the agent handles the rest:

| Template | What It Does |
|----------|-------------|
| 🤖 **Agent Task** | General-purpose task — ask it anything |
| 📚 **Research** | Deep web research with cited sources |
| 📈 **Data Analysis** | Analyze data, generate reports and charts |
| 📊 **Marketing** | Competitor analysis and market research |
| ✍️ **Content Writing** | Articles, newsletters, documentation |
| 📄 **Document Generation** | Excel, Word, and PowerPoint files |
| 📰 **News Briefing** | News monitoring and recurring digests |
| 🔍 **Job Search** | Job board parsing and tracking |
| 🌐 **Website Builder** | Static sites with unique URLs via GitHub Pages |
| 🔄 **Scheduled Task** | Recurring tasks on a daily, weekly, or custom schedule |

Need to follow up? Comment `/gitgent <your request>` on any open issue.

---

### How It Works

```mermaid
%%{init: {'themeVariables': {'actorBkg': '#2d333b', 'actorBorder': '#539bf5', 'actorTextColor': '#adbac7'}}}%%
sequenceDiagram
    actor User
    participant GH as GitHub Issues
    participant WF as GitHub Actions
    participant RT as Agent Runtime
    participant PI as PI SDK (LLM)
    participant Tools as Tool Extensions
    participant FS as Repository

    User->>GH: Create issue with "gitgent" label
    activate GH
    GH->>WF: Trigger agent_issue.yml workflow
    deactivate GH
    activate WF

    WF->>GH: Add 👀 reaction + "in-progress" label
    WF->>GH: Post "Saddling Up" comment
    WF->>WF: Checkout repo, install deps, Playwright

    Note over WF: Download issue attachments (if any)

    WF->>RT: Launch github-entrypoint.ts
    activate RT

    RT->>RT: Load config (provider, model, API key)
    RT->>RT: Validate execution target
    RT->>RT: Resolve model (registry lookup or fallback)
    RT->>GH: Post "In Progress" comment

    RT->>RT: Extract prompt from issue title + body
    RT->>RT: Detect skill label (e.g. skill:research)
    RT->>RT: Build enhanced prompt with agent instructions

    RT->>PI: Create agent session (model, tools, settings)
    activate PI

    loop Agent Execution Loop
        PI->>PI: LLM reasons and decides next action
        PI->>Tools: Execute tool call
        activate Tools

        alt Skill Instruction
            Tools->>FS: Read skills/SKILL.md
            FS-->>Tools: Return skill instructions
        else Web Research
            Tools->>Tools: web_search / web_fetch / browser
        else File Operations
            Tools->>FS: Write artifacts to artifacts/issue-N/
        else Memory Operations
            Tools->>FS: Write summary to memory/summaries/
            Tools->>FS: Write daily log to memory/daily/
        else Code Execution
            Tools->>Tools: bash / read / edit / write
        end

        Tools-->>PI: Return tool result
        deactivate Tools
        PI->>PI: Process result, plan next step
    end

    PI-->>RT: Session complete
    deactivate PI

    RT->>RT: Count new/changed artifacts

    alt No artifacts produced (artifact-required run)
        RT->>PI: Recovery pass with focused prompt
        activate PI
        PI->>Tools: Retry artifact generation
        Tools-->>PI: Return results
        PI-->>RT: Recovery complete
        deactivate PI
    end

    RT->>FS: Auto-write daily log entry (writeAutoDailyLog)
    RT->>GH: Post completion comment with artifact links
    RT->>GH: Add "completed" label, remove "in-progress"
    RT->>GH: Close issue (or keep open for scheduled tasks)
    deactivate RT

    WF->>FS: git add artifacts/ memory/ docs/
    WF->>FS: git commit + push to default branch
    deactivate WF
```

### Key Behaviors

- **Isolated runs** — each issue gets its own `artifacts/issue-<number>/` directory; nothing leaks between tasks.
- **Label tracking** — progress is tracked via labels: `in-progress` → `completed`, `needs-review`, or `failed`.
- **Automatic recovery** — if an artifact-required run produces no files, a single recovery pass is attempted.
- **Memory persistence** — daily logs and run summaries are committed back to the repo in `memory/`.
- **Concurrency control** — runs are serialized per issue via GitHub Actions concurrency groups.

---

### Choose Your AI Provider

Works out of the box with [OpenRouter](https://openrouter.ai) (default). Want to use a different provider? Just change two settings:

| Provider | Set `GITGENT_PROVIDER` to | Add this secret | Default Model |
|----------|--------------------------|-----------------|---------------|
| OpenRouter | `openrouter` (default) | `OPENROUTER_API_KEY` | `minimax/minimax-m2.7` |
| OpenAI | `openai` | `OPENAI_API_KEY` | `gpt-4.1` |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |
| Google | `google` | `GEMINI_API_KEY` | `gemini-2.5-flash` |
| xAI | `xai` | `XAI_API_KEY` | `grok-3` |
| Mistral | `mistral` | `MISTRAL_API_KEY` | `mistral-large-latest` |
| Groq | `groq` | `GROQ_API_KEY` | `llama-3.3-70b-versatile` |

Set `GITGENT_PROVIDER` in **Settings → Variables → Actions** and add the API key in **Settings → Secrets → Actions**.

<details>
<summary><strong>More providers</strong></summary>

| Provider | `GITGENT_PROVIDER` | Secret |
|----------|-------------------|--------|
| Azure OpenAI | `azure-openai-responses` | `AZURE_OPENAI_API_KEY` |
| Cerebras | `cerebras` | `CEREBRAS_API_KEY` |
| Hugging Face | `huggingface` | `HF_TOKEN` |
| Kimi | `kimi-coding` | `KIMI_API_KEY` |
| MiniMax | `minimax` | `MINIMAX_API_KEY` |
| Vercel AI Gateway | `vercel-ai-gateway` | `AI_GATEWAY_API_KEY` |

When using a non-OpenRouter provider, update your workflow `env:` block to pass the matching secret.

</details>

---

### Scheduling

Add a schedule label to any issue with the `gitgent` label to run it on a recurring basis.

| Label | Frequency |
|-------|-----------|
| `schedule:hourly` | Every hour |
| `schedule:daily` | Daily at 9 AM UTC |
| `schedule:weekly` | Mondays at 9 AM UTC |
| `schedule:custom` | Custom cron — add `cron: 0 14 * * 1-5` to the issue body |

A scheduler workflow runs every hour, scans open issues for schedule labels, and triggers the agent automatically. Keep the issue **open** to continue the schedule.

> **GitHub Actions minutes** — Private repos get **2,000 free minutes/month** (Free plan). Run duration varies by task — a simple research query may finish in 1–2 minutes while complex document generation can use the full 30-minute timeout. Monitor usage in **Settings → Billing → Actions** and adjust schedules accordingly. [Pricing details](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions).

---

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GITGENT_PROVIDER` | `openrouter` | LLM provider id |
| `GITGENT_MODEL` | `minimax/minimax-m2.7` | Model id (provider-specific) |
| `MAX_RUNTIME_MINUTES` | `30` | Execution timeout in minutes |

Set these as **repository variables** via **Settings → Variables → Actions**.

---

### Storage & Artifacts

Every run produces files — research reports, spreadsheets, presentations, websites, CSV data — committed directly to your repo under `artifacts/issue-<number>/`. A few things to know:

- **File types** — the agent can generate Markdown, CSV, Excel (`.xlsx`), Word (`.docx`), PowerPoint (`.pptx`), HTML, and more. All files are committed to your repo with full git history.
- **Size cap** — individual artifact files are limited to **25 MB**. Most generated reports are well under 1 MB.
- **Repo growth** — artifacts accumulate over time. If your repo grows large, you can delete old `artifacts/issue-*/` directories and force-push, or use `git filter-repo` to clean history.
- **GitHub Pages** — use the 🌐 Website Builder template to generate static sites. Each task gets its own URL under `docs/issue-<number>/`, with an auto-generated landing page at the root linking to all sub-sites.

---

### Syncing Updates

When you create a repo with **Use this template**, it starts as an independent copy — there's no automatic link back to the original. To pull in new features, bug fixes, and workflow improvements:

#### One-time Setup

```bash
cd your-gitgent-repo
git remote add upstream https://github.com/supercheck-io/gitgent.git
git fetch upstream
```

#### Pulling Updates

```bash
git fetch upstream
git merge upstream/main --allow-unrelated-histories
```

---

### Gitgent vs OpenClaw

Both are open-source MIT-licensed AI tools — they solve different problems and work well together.

| | **Gitgent** | **[OpenClaw](https://github.com/openclaw/openclaw)** |
|---|---|---|
| **What** | AI agent inside GitHub | Personal AI assistant gateway |
| **Interface** | GitHub Issues — familiar to any developer | 23+ messaging channels (WhatsApp, Slack, Discord, etc.) |
| **Mobile access** | GitHub mobile app — create tasks, view results, follow up from your phone | Via the messaging channel's app (WhatsApp, Telegram, etc.) |
| **Notifications** | GitHub email + mobile push — automatic on every agent comment and issue close, no setup | Messaging channel's native notifications (push alerts in WhatsApp, Telegram, etc.) |
| **Setup** | Click "Use this template" → add one API key | Install CLI, configure gateway, self-host |
| **Runs on** | GitHub Actions — no server to manage | Your machine or VPS |
| **Infra cost** | None — uses GitHub's free tier | You provision and maintain the host |
| **Security model** | Runs in ephemeral GitHub-hosted runners | Runs on your own infrastructure |
| **AI providers** | 7+ via PI SDK | 30+ providers |
| **Web research** | Search + Playwright browser | Search + Playwright browser |
| **Voice / media** | — | Wake word, talk mode, media understanding |
| **Scheduling** | Label-driven (hourly / daily / weekly / custom cron) | Cron-based |
| **Extensibility** | Skills (Markdown files) | 80+ plugins |
| **Output storage** | Artifacts committed to your repo with full git history | Chat replies in messaging channels |
| **GitHub integration** | Native — issues, PRs, labels, comments | Via plugin |
| **Best for** | Automated research, reports, documents, batch tasks | Real-time conversations across messaging apps |

> Gitgent handles unattended research and document tasks right inside GitHub — zero infrastructure, nothing to host. OpenClaw gives you a real-time AI assistant across WhatsApp, Slack, Discord, and more.

---

### Questions?

- **Bug reports & feature requests** → [GitHub Discussions](https://github.com/supercheck-io/gitgent/discussions)
- **Contributing** → [CONTRIBUTING.md](CONTRIBUTING.md) · [Security](SECURITY.md)
- **Code of conduct** → [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- **License** → [MIT](LICENSE) — free and open source, always.

---

<p align="center">
  <sub>Open source by <a href="https://supercheck.io"><strong>Supercheck</strong></a></sub>
</p>
