---
name: devops
description: Generate infrastructure configs, CI/CD pipelines, Dockerfiles, Kubernetes manifests, and automation scripts. Analyze existing setups and recommend improvements.
---

# DevOps Skill

Generate or analyze infrastructure configurations, CI/CD pipelines, and automation scripts following industry best practices.

## Workflow

### Step 1 — Understand Requirements

- Parse target platform, current setup, and desired outcome from the prompt.
- Identify constraints: cloud provider, budget, compliance requirements, team size.

### Step 2 — Analyze Existing Setup

- If config files are attached in `attachments/` or exist in the repo, read and audit them.
- Identify security gaps, performance bottlenecks, and reliability risks.
- Check for outdated dependencies or deprecated APIs.

### Step 3 — Generate Configurations

Create infrastructure-as-code following best practices for the target platform:

| Platform | Best Practices |
|----------|---------------|
| Docker | Multi-stage builds, minimal base images, non-root user, .dockerignore, health checks |
| GitHub Actions | Parallelized jobs, dependency caching, matrix testing, reusable workflows, pinned action versions |
| Kubernetes | Resource limits, liveness/readiness probes, HPA, network policies, secrets management |
| Terraform | Modular structure, remote state, variable validation, output documentation |
| Monitoring | Health check endpoints, alerting thresholds, structured logging, dashboard configs |

### Step 4 — Generate Artifacts

- Write all config files to the output directory with appropriate extensions (.yml, .tf, Dockerfile, etc.).
- Write a deployment guide (README.md) with setup instructions, prerequisites, and usage.
- Include a security checklist for the generated configs.

### Step 5 — Save Memory

- Use `memory_write` type="summary" with platform, key decisions, and architecture notes.

## Security Checklist (Applied to All Configs)

- Non-root containers and least-privilege service accounts
- Secrets injected via environment or vault — never hardcoded
- Network policies restricting unnecessary traffic
- Image scanning and dependency auditing in CI
- TLS/HTTPS for all external endpoints

## Important Notes

- Pin all dependency and image versions — avoid `latest` tags.
- Include comments in generated configs explaining non-obvious decisions.
- Provide cost estimates when recommending cloud resources.
- Test commands should be included for validating the generated configs.
