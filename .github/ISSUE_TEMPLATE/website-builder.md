---
name: "🌐 Website Builder"
about: "Build a static website ready for GitHub Pages deployment"
title: "[Website] "
labels: "gitgent, skill:website-builder"
assignees: ""
---

### What to Build

<!-- Describe the website purpose and content. -->
<!-- Good: "A project landing page with features list, team section, and getting started guide" -->
<!-- Good: "Convert the research report from issue #12 into a browsable website" -->
<!-- Bad: "Make a website" -->

### Content Source

<!-- Where should the content come from? -->
<!-- Option A: Describe the content in this issue body -->
<!-- Option B: Reference existing artifacts — e.g., "Use artifacts from issue #5" -->
<!-- Option C: Drag & drop files below -->

### Pages

<!-- List the pages you want, or leave blank for the agent to decide -->
<!-- Example: Home, About, Features, Documentation, Contact -->

### Design Preferences

<!-- Color scheme, style, or reference sites to emulate -->
<!-- Example: "Minimal dark theme" or "Similar to stripe.com landing page" -->

> **Deployment**: After the agent generates the site, enable GitHub Pages in **Settings → Pages** → set source to `main` branch, `/docs` folder.
>
> **Multi-site**: Each website-builder task gets its own URL at `https://<user>.github.io/<repo>/issue-<number>/`. A landing page at the root links to all sub-sites.
