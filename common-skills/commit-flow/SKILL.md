---
name: commit-flow
description: Commit workflow that runs doc-gen first, stages only needed files (asking for confirmation on uncertain ones), suggests a message from the actual diff, commits, shows a summary, and asks about pushing.
---

# Commit Flow

Use when the user asks to commit, stage, or prepare changes for a commit.

## Steps

1. **Run doc-gen** — activate/run the `gen-docs` skill first to update documentation based on code changes.
2. **Check current changes** — run `git status` and `git diff` (or `git diff --cached`) to see exactly what changed.
3. **Review code** — read modified/added files to understand what is actually needed.
4. **Stage necessary code only** — read files directly; add files that contain real, needed changes. For any file that looks unrelated, temporary, or unclear, ask the user: "Should I stage `<file>`? It contains `<brief summary>`" — do not assume.
5. **Base message on code change** — derive the commit message from the actual diff/content (e.g., `feat: add docs for skills a`).
6. **Confirm with user** — show proposed message, doc-gen result, and staged files; ask for approval (`yes`/`approve`) before committing.
7. **Commit code** — run `git commit` with the approved message, then show a brief summary of what was committed.
8. **Ask about push** — ask the user if they want to push (`git push`).

## Rules

- Use `git`, `read_file`, `write_file`, and file tools directly within this flow — do not ask for permission for each tool call.
- If unsure whether a change is needed, ask: "Should I stage `<file>`? It contains `<brief summary>`"
- Run `gen-docs` before committing.
- Suggest a commit message derived from the actual diff (format example: `feat: add docs for skills a`).
- Confirm with user (`yes`/`approve`) before `git commit` and before `git push`; other steps proceed directly.
