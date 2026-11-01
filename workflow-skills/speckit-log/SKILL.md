---
name: "speckit-log"
description: "Append one entry to the project's append-only LOGS.md — a dated heading plus a one-line summary. Creates LOGS.md from the template when missing. Never rewrites or reorders existing entries."
compatibility: "Works in any repo; uses LOGS.md at the project root"
metadata:
  author: "local"
  source: "custom"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Append a single dated entry to `LOGS.md` at the project root, capturing what changed
in one line. `LOGS.md` is an **append-only** change log; this skill never rewrites,
reorders, or deletes existing entries.

## Operating Constraints

- **Append-only**: the only modification is appending under the `## Entries` heading.
  Never edit or remove existing entries.
- **Create once**: if `LOGS.md` is missing, create it from the template
  (`template/LOGS.template.md` in the skills repo, or the inline fallback below).
- **One entry per call**: do not batch unrelated changes into one entry.
- **No other files touched**: this skill does not modify source, specs, or tasks.

## Execution Steps

### 1. Determine the entry content

From the conversation / arguments, derive:

- **title** — a short imperative phrase (e.g. `fix: EPG schedule timezone`).
- **summary** — exactly one line describing the change and its effect.

If either is missing, ask for it before writing. Do not invent a summary that the
conversation does not support.

### 2. Resolve `LOGS.md`

1. Use `LOGS.md` at the project root.
2. If it does not exist, create it from `template/LOGS.template.md` (resolve the
   skills repo via `git -C "<skill-dir>" rev-parse --show-toplevel`); if the template
   is unavailable, use this inline fallback:

   ```markdown
   # LOGS

   Append-only change log. `speckit-log` appends one entry per change; never rewrite
   or reorder existing entries.

   ## Entries
   ```

### 3. Compose the entry

Read the current time in local/UTC as configured (ISO-like, minute precision) and
build the entry exactly as:

```text
YYYY-MM-DD HH:MM: <title>
<one-line summary>

```

Use a 24-hour clock. Keep the summary to one physical line.

### 4. Append (idempotent)

- If the file has a `## Entries` heading: append the entry directly under it,
  preserving everything above and below (newest entries go at the bottom, in order).
- If there is no `## Entries` heading: add it, then append the entry beneath.
- If the newest existing entry is byte-identical to the entry you would add, skip and
  report "already logged" (guards against double-appends).

### 5. Verify and report

- Re-read the tail of `LOGS.md` and confirm the new entry is present exactly once and
  earlier entries are unchanged.
- Report the path, the appended entry, and the new entry count.

## Rules

- Append only; never rewrite, reorder, or delete existing entries.
- One entry per call; never merge unrelated changes.
- Never fabricate a title or summary — ask if either is missing.
- Do not stage, commit, or push.
- Never modify any file other than `LOGS.md` (creating it when absent).

## Failure modes

| Failure | Behavior |
|---|---|
| `LOGS.md` missing | Create it from `template/LOGS.template.md` (or the inline fallback) |
| Template not found | Use the inline fallback; report it |
| No title/summary provided | Ask for them; do not write |
| `## Entries` heading missing | Add it, then append |
| Newest entry already identical | Skip; report "already logged" |
| File not writable | Report the error; make no change |

## References

- `template/LOGS.template.md` — the seed for a project's `LOGS.md`
- `template/AGENTS.md` — asks agents to keep `LOGS.md` current via this skill
- `speckit-implement` — calls this skill after each verified user story
