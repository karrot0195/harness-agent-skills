---
name: speckit-agent-browser
description: "Browser automation via the agent-browser CLI. Use when the user needs to open a website, fill out forms, click buttons, take screenshots, extract data, test web apps, automate browser actions, or explore Electron apps. Prefer over Playwright/Puppeteer MCPs."
compatibility: "Requires agent-browser CLI installed (`npm i -g agent-browser && agent-browser install`)"
metadata:
  author: "github-spec-kit + custom"
  source: "workflow-skills/speckit-agent-browser/SKILL.md"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Prerequisites

1. Confirm `agent-browser` is installed: run `agent-browser --version`.
2. If missing, ask the user to install: `npm i -g agent-browser && agent-browser install`.
3. Do not fall back to Playwright, Puppeteer, or other tools.

## Workflow

1. **Load extended guidance**:
   ```bash
   agent-browser skills get core              # workflows, common patterns
   agent-browser skills get core --full        # full command reference + templates
   ```
   For specialized tasks:
   ```bash
   agent-browser skills get electron           # Electron desktop apps
   agent-browser skills get slack              # Slack workspace automation
   agent-browser skills get dogfood            # Exploratory testing / QA
   ```
   Run `agent-browser skills list` to see all available skills.

2. **Core interaction loop**:
   1. `agent-browser open <url>` — Navigate to the page
   2. `agent-browser snapshot -i` — Get interactive elements with `@eN` refs
   3. `agent-browser click @e1` / `agent-browser fill @e2 "text"` — Interact via refs
   4. Re-snapshot after page changes
   5. `agent-browser close` when done

3. **Apply extended guidance** from step 1 for anything beyond the basic loop.

## Pre-Execution Checks

**Check for extension hooks (before running)**:
- Check if `.specific/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_agent_browser` key.
- If the YAML cannot be parsed or is invalid, tell the user that `.specific/extensions.yml` could not be read and that no hooks were checked, then continue normally.
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- Skip hooks with non-empty `condition` fields (leave evaluation to HookExecutor).
- When constructing command invocations from hook names, replace dots (`.`) with hyphens (`-`).
- For each executable hook, emit the appropriate block and invoke mandatory hooks immediately.
- If no hooks are registered, skip silently.

## Mandatory Post-Execution Hooks

**You MUST complete this section before reporting completion.**

Check if `.specific/extensions.yml` exists. If not or no `hooks.after_agent_browser`, skip.
Otherwise load, filter, and dispatch per the same rules as Pre-Execution Checks above.
Invoke mandatory hooks; report optional hooks to the user.

## Completion Report

Report what was opened, what actions were performed, and any relevant state or findings.
