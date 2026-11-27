<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Memory

Memory is the instructions Command Code carries into every turn without you repeating them: conventions, architecture notes, the commands your project actually uses. It lives in plain markdown files named `AGENTS.md`.

---

## Start here

Create one for your project:

```bash
/init
```

That writes `AGENTS.md` in your project root with a starter template. Edit it like any file, or run `/memory` to pick which memory file to open.

```markdown
# Memory

## Project Overview

See @README.md for project overview and @package.json for available npm/pnpm commands for this project.

## Code Style Guidelines

- Use descriptive variable names
- Follow existing patterns in the codebase
- Extract complex conditions into meaningful boolean variables

## Architecture Notes

Add important architectural decisions and patterns here.

## Common Workflows

Document frequently used workflows and commands here.
```

Commit your project's `AGENTS.md` to git. It's team-shared context, and changes
to it deserve review like any other project convention.

---

## Where memory files live

Command Code reads **three tiers**, and every one that exists is loaded; they add up, they don't replace each other.

| Tier | Location | Use it for |
| ---- | -------- | ---------- |
| **User** | `~/.commandcode/AGENTS.md` | Your personal preferences, across every project |
| **Project** | `<project>/AGENTS.md` or `<project>/.commandcode/AGENTS.md` | Team-shared project instructions; commit this |
| **Subdirectory** | `<subdir>/AGENTS.md` or `<subdir>/.commandcode/AGENTS.md` | Rules for one package or area of a monorepo |

They're assembled in that order (user, project, then subdirectory), each block headed by its source path, so the model always knows which file a rule came from. Later blocks are more specific, so a package-level convention naturally reads as a refinement of the project-level one.

Command Code reads `AGENTS.md`, not `CLAUDE.md`. If you're coming from another
agent, [`/import`](https://commandcode.ai/docs/import) brings your memory files over and
rewrites references to point at the right filename.

### Project memory

Both `<project>/AGENTS.md` and `<project>/.commandcode/AGENTS.md` are checked, in that order; the **first one that exists** is used, not both. Put it at the repo root if you want it visible; put it in `.commandcode/` if you'd rather keep the root clean.

### Subdirectory memory

Subdirectory memory loads on demand. When you `@`-mention a file (or the agent reads one you referenced), Command Code walks from that file's directory up to the project root and picks up any `AGENTS.md` it finds along the way, **outermost first**, so the nearest file has the last word.

```
repo/
├── AGENTS.md          ← always loaded
└── packages/
    └── api/
        ├── AGENTS.md  ← loaded when you mention
        └── server.ts     a file in this directory
```

Only directories **inside** your project count; a sibling tree that happens to share a path prefix is never pulled in.

---

## Importing other files with `@path`

Any `@path` reference inside a memory file is replaced with that file's contents, so a memory file can compose rather than duplicate:

```markdown
See @README.md for the project overview.
Our review rules live in @./docs/review-checklist.md.
Personal shell aliases: @~/.commandcode/shell-notes.md
```

- Paths are relative to the file doing the importing; `~/` expands to your home directory; absolute paths work.
- Imports are **recursive**, up to **5 levels** deep.
- Each expansion is wrapped with an `# Imported from <path>` header so the source stays visible.
- References inside code fences or backticks are **left alone**, so documenting `@something` doesn't accidentally import it.
- A path that doesn't resolve to a readable file is left as plain text rather than failing the turn.

---

## How memory reaches the model

Memory is part of the **system prompt**, not the conversation. That has a few consequences worth knowing:

- **It's re-read every request.** Edit `AGENTS.md` mid-session and the next turn picks it up, no restart needed. `/context` flags the row as *(modified, refreshes next request)* until then.
- **It survives compaction.** Because it isn't conversation, it's never summarized away. See [Context & Compaction](https://commandcode.ai/docs/context).
- **It costs tokens on every turn.** `/context` shows exactly how many under the **Memory** row. A memory file that has grown into a wiki is a real, recurring cost. Keep it to standing rules, and use `@path` imports for the long-form material so it's only there when it's relevant.

---

## Reference

### Commands

| Command | Description |
| ------- | ----------- |
| `/init` | Create `AGENTS.md` in the project root from a starter template |
| `/memory` | Open a selector to edit your user or project memory file |
| `/context` | See what memory is costing in the context window |
| `/import` | Bring memory files over from another coding agent |

### File paths

| Tier | Path |
| ---- | ---- |
| User | `~/.commandcode/AGENTS.md` |
| Project | `<project>/AGENTS.md`, else `<project>/.commandcode/AGENTS.md` |
| Subdirectory | `<subdir>/AGENTS.md`, else `<subdir>/.commandcode/AGENTS.md` |

---

## See also

- [Taste](https://commandcode.ai/docs/taste): learned style, as opposed to written rules.
- [Skills](./skills.md): instructions that load only when a task calls for them.
- [Context & Compaction](https://commandcode.ai/docs/context): what memory costs per request.
- [Import](https://commandcode.ai/docs/import): bring memory files from another agent.
