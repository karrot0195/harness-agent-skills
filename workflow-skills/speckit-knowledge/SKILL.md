---
name: speckit-knowledge
description: "Authoritative Command Code product knowledge — slash commands, CLI options, permissions, skills, custom agents, MCP servers, hooks, memory, headless mode, plan mode, taste, pricing, and troubleshooting. Use when the user asks how Command Code works, how to configure it, which models exist, or needs product facts."
compatibility: "Requires .agents/skills/command-code-knowledge/ directory with reference files"
metadata:
  author: "github-spec-kit + custom"
  source: "workflow-skills/speckit-knowledge/SKILL.md"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Core Principle

This file is a discovery stub. The authoritative reference lives in `.agents/skills/command-code-knowledge/reference/`. Never guess — read the matching reference file.

## How to use

1. Pick the reference file(s) that cover the question and read them.
2. Answer from what they say; quote exact ids, flags, paths, and settings keys verbatim.
3. Model questions → `reference/models.md` — ids are exact; never invent.
4. Account questions ("which plan am I on") → `reference/plans.md`; point to `/usage`.
5. BYOK provider questions → `reference/byok.md` — never invent config keys.
6. Help surface (slash commands, shortcuts, taste, FAQ) → `reference/product-help.md`.
7. Built-in tools (parameters, guards, limits) → `reference/tools.md`.
8. Building a mod → switch to the `speckit-builder` skill.

## Reference index

- `reference/permissions.md` — Permissions
- `reference/skills.md` — Agent Skills
- `reference/mcp.md` — MCP Servers
- `reference/hooks.md` — Hooks
- `reference/custom-slash-commands.md` — Slash Commands
- `reference/tools.md` — Tools
- `reference/custom-agents.md` — Custom Agents
- `reference/memory.md` — Memory
- `reference/headless.md` — Headless Mode
- `reference/plan-mode.md` — Plan Mode
- `reference/sessions.md` — Sessions & Checkpoints
- `reference/byok.md` — BYOK
- `reference/models.md` — Models
- `reference/plans.md` — Plans, credits, model access
- `reference/product-help.md` — Product help

## Verification

- Ids and flags must appear verbatim in a reference file — if you cannot find it, say so rather than inventing it.
- When the user should run something, prefer the exact command shown in the reference.
- These files regenerate via `pnpm generate:knowledge`; if there is a mismatch with the live product, check https://commandcode.ai/docs.

## Pre-Execution Hooks

Check `.specific/extensions.yml` for `hooks.before_knowledge`. Apply same filtering/dispatch logic.

## Post-Execution Hooks

Check `.specific/extensions.yml` for `hooks.after_knowledge`. Invoke mandatory hooks; report optional ones.

## Completion Report

Report what was answered and which reference file(s) were consulted.
