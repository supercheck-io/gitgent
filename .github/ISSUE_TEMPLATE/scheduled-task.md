---
name: "\U0001F504 Scheduled Task"
about: "Run a task on a recurring schedule (hourly, daily, weekly, or custom cron)"
title: "[Scheduled] "
labels: "gitgent, schedule:daily"
assignees: ""
---

### Task

Describe the task to run on each scheduled execution. This issue body is re-used as the prompt for every recurrence.

### Schedule

<!-- Change the label above to one of: schedule:hourly | schedule:daily | schedule:weekly | schedule:custom -->
<!-- Daily = 9 AM UTC | Weekly = Monday 9 AM UTC | Custom = provide cron below -->

daily

### Custom Cron (only for `schedule:custom`)

<!-- 5-field cron: minute hour day month weekday (UTC) -->
<!-- Supports: *, exact values, ranges (1-5), lists (1,3,5), steps (*/2) -->
<!-- Minute field is ignored (scheduler runs hourly) -->

cron: 0 9 * * *

### Output Format

<!-- Markdown | Excel | Word | Any -->
Markdown

> **Note**: Keep this issue open. Completed runs stay open automatically so the scheduler can re-trigger them.
