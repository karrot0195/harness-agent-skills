<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Sessions & Checkpoints

Every conversation you have with Command Code is a **session**: a durable transcript on disk that you can resume, rename, fork, clone, rewind, share, and export. Close your terminal mid-task, come back tomorrow, and pick up exactly where you left off.

---

## What is a session?

A session is a single append-only **JSONL file**, one JSON record per line. The first line is a header (session id, creation time, working directory); every line after it is an entry: your messages, the model's replies (with token usage and cost), model and effort changes, compaction summaries, and more.

Entries form a **tree** rather than a flat list. Each entry points at its parent, so a session can hold multiple branches of the same conversation. This is what powers `/rewind`, `/tree`, and forking. The file itself is never rewritten in place: navigating history just moves a pointer, and new entries are appended.

### Where session files live

Sessions are stored per project, keyed by a slug of the working directory:

```text  theme={null}
~/.commandcode/projects/<project-slug>/<session-id>.jsonl
```

Because the catalog is project-scoped, `/resume` and `--continue` only ever see sessions from the directory you launched Command Code in.

Alongside the transcript, a session can have sidecar files:

| **File** | **Contents** |
| -------- | ------------ |
| `<id>.jsonl` | The transcript itself (header + entries) |
| `<id>.meta.json` | Title, model, lineage, trace ids, compaction stats |
| `<id>.share.json` | Share link state, if the session was shared |
| `<id>.checkpoints.jsonl` | Checkpoint snapshots for `/rewind` |
| `<id>.prompts.jsonl` | Prompt history |

### Finding the current session file

```bash
# In Command Code session
/session-file
```

`/session-file` prints the current session id and the absolute path of its transcript. In terminals that support hyperlinks the path is clickable. If you haven't sent a message yet you'll see a `(not created yet)` note; the transcript is created on the first save.

---

## Durability and crash safety

Sessions are designed so you never lose committed work:

- **Per-turn commit:** Every completed turn is appended to the transcript as it commits, not on exit. Kill the process mid-run and everything up to the last committed turn is on disk.
- **A turn either commits or is lost:** There is no torn state: an interrupted turn simply doesn't make it into the file, and the session resumes cleanly from the previous commit.
- **User messages survive failed turns:** If a turn dies on a model/API error, your message that opened it is still written to disk, so a session that errored on its very first turn still shows up in `/resume`.
- **Empty sessions leave no file:** A brand-new session buffers in memory until the first assistant reply, so opening Command Code and quitting without a real exchange doesn't litter your session catalog.
- **Torn files never block startup:** If a transcript is damaged, corrupted lines are skipped and the session still loads.

---

## Starting fresh

### In a session: `/clear`

```bash
# In Command Code session
/clear
```

`/clear` starts a new session with empty context. The previous session stays on disk, fully resumable with `/resume`. `/new` is an alias: same command, same menu row.

### At launch

| **Flag** | **What it does** |
| -------- | ---------------- |
| `-n, --name <name>` | Set the new session's display name at startup |
| `--no-session` | Don't persist the session to disk at all (in-memory only) |

```bash
cmd -n "auth refactor"        # named session
cmd --no-session              # throwaway session, nothing written to disk
```

  `--no-session` sessions never appear in `/resume` and leave no transcript. Use them for experiments you explicitly don't want in your history.

---

## Resuming

### The resume picker

```bash
# In Command Code session
/resume
```

`/resume` (alias `/sessions`) opens the session picker, the same picker you get from `cmd -r` with no argument. It supports search, renaming (without leaving the picker), deleting sessions, and filtering by the git branch a session was started on. Forked sessions show their provenance (`fork of <parent>`), and the session you're currently in is highlighted and can't be deleted.

Two kinds of sessions are hidden from the picker:

- **Headless (`cmd -p`) sessions** carry no title and stay out of the picker and `--continue`, but an exact session id still resumes them.
- **In-memory (`--no-session`) sessions** were never written to disk.

### At launch

| **Flag** | **What it does** |
| -------- | ---------------- |
| `-r, --resume [name]` | Resume a session by id or name; with no argument, open the picker |
| `--sessions [name]` | Alias of `--resume` |
| `-c, --continue` | Continue the most recent session in the current directory |
| `--session <path\|id>` | Resume by transcript path (`.jsonl`) or a unique session-id prefix |
| `--fork-session` | With `--resume`/`--continue`/`--session`: fork the resolved session into a new one, leaving the original untouched |

```bash
cmd -r                        # open the resume picker
cmd -r "auth refactor"        # resume by name (or id) — id is tried first, then a case-insensitive title match
cmd -c                        # continue the most recent session here
cmd --session 3f9a            # unique id prefix
cmd --session ~/exported/session.jsonl   # a transcript file directly
cmd -c --fork-session         # branch off the latest session without touching it
```

A `--session` path inside the current project resumes like `-r`; a path outside it keeps appending to that file where it is.

### Model restored on resume

The model a session was using is stored in its meta and **adopted when you resume**. An in-session `/resume` always adopts the resumed session's model (clearing any `--model` launch override so the resumed model wins); a cold `cmd -r` adopts it unless you explicitly passed `--model` for that launch.

---

## Branching

Three commands let one conversation become many. They differ in **what comes with you**:

```
  original session
    A ── B ── C ── D   ← you are here
         └─ B' ── C'   ← an older branch

  /fork      whole tree + checkpoints
             ┌─────────────────────┐
             │ A ─ B ─ C ─ D       │
             │     └ B' ─ C'       │  /rewind works
             └─────────────────────┘

  /clone     active branch only
             ┌─────────────────────┐
             │ A ─ B ─ C ─ D       │  /rewind empty
             └─────────────────────┘

  /tree      no copy — jump anywhere
             in the tree you already have
```

### `/fork [name]`: copy everything

```bash
# In Command Code session
/fork
/fork payments-experiment
```

`/fork` copies the **entire session** into a new session and switches to it. That means the full tree with every branch, plus checkpoints and file backup history, so `/rewind` keeps working in the fork. The original is left untouched and resumable.

Lineage is recorded on the fork's meta: `parentSessionId` (the source session) and `branchPoint` (the stable message id of the last source message at the fork point), so the picker can render `fork of <parent>` provenance. Names are optional (up to 200 characters) and must be unique.

### `/clone`: copy the current branch only

```bash
# In Command Code session
/clone
```

`/clone` duplicates just the **active branch** of the conversation (from the current point back to the root) into a brand-new session file and switches into it. Unlike `/fork`, checkpoints and file history are deliberately not copied. A clone is "duplicate the conversation", and `/rewind` in the clone legitimately starts empty. The new file's header records the source transcript as its `parentSession`.

### `/tree`: browse the whole tree

```bash
# In Command Code session
/tree
```

`/tree` opens the session-tree navigator: every branch of the session, including inactive ones. From there you can jump to **any point** in the tree, fold segments, search, attach labels to entries, and cycle display filters (`default`, `no-tools`, `user-only`, `labeled-only`). When you navigate away from a branch, Command Code can generate a **branch summary** so the work you're leaving behind stays findable. You can confirm, customize, or skip the summary (and set a default in `/config`).

---

## Naming and session info

| **Command** | **What it does** |
| ----------- | ---------------- |
| `/rename <name>` | Rename the current session; bare `/rename` auto-generates a title with the model |
| `/name` | Alias of `/rename`; bare `/name` shows the current name |
| `/session-file` | Show the current session id and transcript path |
| `/status` | Show comprehensive environment status |
| `/trace` | Copy the current OpenTelemetry trace id (for support); works mid-turn, and persisted trace ids survive resume |

Names must be unique within a project; renaming to a taken name is rejected. The name also becomes your terminal tab title, and it's what `-r <name>` resolves.

---

## Checkpoints and rewind

Every prompt you send opens a **checkpoint**: a snapshot of the conversation plus a backup of every file Command Code goes on to edit. If something goes off track, rewind to any earlier checkpoint and continue from there.

### Opening the rewind UI

Press **`Esc`** twice within 500ms, or run:

```bash
/rewind
```

Each row in the selector shows when the checkpoint was taken, a preview of the message that opened it, and how many files that checkpoint changed (or `No code changes`).

### Restore modes

| Mode | What it restores |
| ---- | ----------------- |
| **Both** | Restores conversation and code together (recommended). |
| **Conversation only** | Removes messages after the checkpoint. Files are untouched. |
| **Code only** | Restores files to their state at the checkpoint. Conversation is untouched. |

Checkpoints with no file changes only offer **Conversation only**.

Rewinding removes the messages after the checkpoint **and the checkpoint itself**. You land *before* the message that opened it. The context token count updates to reflect the shorter conversation.

Rewinds persist. If you rewind and then quit, the rewound state is what you'll see when you resume the session later. It isn't a preview.

### What a file rewind does to your working tree

A **Code only** or **Both** rewind does more than undo edits. It puts the tree back the way it was:

| If a file was… | After the rewind |
| -------------- | ---------------- |
| **Modified** after the checkpoint | Restored to its contents at the checkpoint |
| **Created** after the checkpoint | **Deleted**, since it didn't exist at the checkpoint |
| **Deleted** after the checkpoint | Restored |

Backups are taken before each `write_file` or `edit_file` call and replayed newest-first, so a run of edits to the same file lands back on its oldest state. Backups are byte-faithful, so binary files (images, compiled artifacts) survive a backup–restore round-trip unchanged, with no special handling needed.

### Restores are verified before they run

Command Code checks every backup in the set can actually be restored *before* writing anything, so a rewind either applies in full or not at all; it won't leave you half-restored. If a file can't be restored, you're told which one and why.

### Limits and pausing

Checkpoints are kept for **30 days**, capped at **200 backups per session**. Backups live in `~/.commandcode/file-history/<session-id>/`, and identical content is stored once no matter how many checkpoints reference it.

File backups are capped at **10MB per file**. An oversized file is never read or backed up, and because it was never captured, a rewind **leaves it exactly as it is** rather than deleting it. Once a session hits the 200-backup cap, or 30 days pass, older checkpoints age out.

If the disk runs low, checkpointing **pauses for the whole session** rather than silently degrading file by file, and you'll see a notice. Checkpoints already taken stay usable, and checkpointing resumes on its own, with a second notice, once enough space is free.

---

## Session scratchpad

Each session gets a **scratchpad**, a per-session temporary workspace for intermediate files that don't belong in your project: analysis notes, throwaway scripts, generated data.

```text  theme={null}
/tmp/commandcode-<uid>/<sanitized-cwd>/<session-id>/scratchpad
```

- **Silent access:** Reads and writes inside the scratchpad need no permission prompts (explicit deny/ask rules still take precedence). The path is advertised in the system prompt and exported to shell commands as `$COMMANDCODE_SCRATCHPAD`.
- **Shared with sub-agents:** Every sub-agent in the session sees the same directory, so agents can hand intermediate results to each other by file name.
- **Survives compaction:** After history compaction, a bounded metadata-only **manifest** of the scratchpad is re-injected, so the model remembers which working files still exist on disk without re-reading them.
- **Follows launch-time forks:** Forking at launch with `--fork-session` copies the source session's scratchpad into the fork, so the branched conversation keeps its working files.
- **Cleaned up with retention:** Scratchpads older than 30 days are swept, and deleting a session deletes its scratchpad. It's temp space; keep durable deliverables in the project itself.

The whole tree can be relocated with the `COMMANDCODE_SCRATCHPAD_BASE` environment variable. Provisioning is fail-open: if the scratchpad can't be created safely, the feature silently disables and the session runs normally without it.

Disable it entirely in `settings.json`:

```json
{
  "disableScratchpad": true
}
```

---

## Sharing and exporting

### `/share`: being rebuilt

Link sharing is being rebuilt. Bare `/share` prints "Share is being rebuilt, use /export" and creates no link. Use `/export` (below) to save the session to a file, or `/share gist` below to post it to GitHub.

### `/share gist`: GitHub gist

```bash
# In Command Code session
/share gist            # secret gist, default format (html unless configured)
/share gist md         # markdown
/share gist jsonl      # raw transcript
```

`/share gist [html|jsonl|md]` renders the session and posts it as a **secret GitHub gist** via the `gh` CLI, then copies the gist URL. The default format comes from `/config`'s "Default share gist format" setting.

### `/export`: write a file

```bash
# In Command Code session
/export                          # default format to a generated filename
/export md                       # pick a format: html | jsonl | md
/export ~/notes/session.html     # or a path; the extension picks the format
```

With no path, the file is written as `command-code-session-<first 8 chars of id>.<format>` using `/config`'s "Default export format" (`html` when unset). `jsonl` exports the raw transcript.

### `/copy`: clipboard

```bash
# In Command Code session
/copy
```

`/copy` copies the last assistant reply to the clipboard. Best-effort: in headless/SSH terminals without clipboard access, the feed line tells you it couldn't.

---

## Compaction and the session log

When the conversation approaches the context limit, Command Code compacts history (automatically, or on `/compact`). Two guarantees matter for sessions:

- **The on-disk log is never rewritten:** Compaction appends a compaction entry (the summary plus a pointer to the first entry kept verbatim) to the transcript tree. Your full history stays in the file; context building just reads through the compaction entry, and `/tree` can still reach everything.
- **Savings persist across resumes:** Cumulative compaction stats (event count, total tokens saved, last event) are written to the session's meta on every compaction, so the "total this session" figure `/compact` reports survives `--resume`.

---

**Context & Compaction**
	What compaction does to the transcript, the tiers and their thresholds,
	`/compact` and `/compact-mode`, and how to keep context lean.

## Design decisions

- **One picker, not two.** `/resume` and `/sessions` open the same unified picker rather than separate interactive/print views, so there's one mental model for "where are my sessions."
- **Rewind is destructive on purpose, but reversible.** Restoring is instant and irreversible in the moment, but because it's just moving between checkpoints, you can rewind forward again if you change your mind.
- **Print sessions are real sessions.** They're saved and resumable, just hidden from the picker by default. Automation output doesn't have to mean throwaway state.

---

## Troubleshooting

### Checkpoints not appearing

1. Ensure you've sent at least one message in the session
2. Check if checkpointing is paused (you'll have seen a disk-space notice)
3. Verify the session has file modifications; a checkpoint with no file changes only offers a conversation restore

### Restore failed

1. Check the error message for which file failed
2. Ensure backup files haven't been manually deleted from `~/.commandcode/file-history/`
3. Verify you have write permissions to the target files

### Double-Esc not working

1. Press Esc twice within 500ms
2. Ensure focus is on the Command Code input
3. Use `/rewind` instead

---

## Tips

- **Name sessions you'll come back to:** `/rename auth-refactor` (or launch with `-n`) makes `cmd -r auth-refactor` a one-liner later, and a bare `/rename` will generate a decent title for you.
- **Fork before risky experiments:** `cmd -c --fork-session` or `/fork` gives you a full copy, checkpoints included, while the original stays pristine.
- **Use `/clone` to tidy up:** After heavy rewinding, `/clone` extracts just the branch you kept into a clean new session.
- **Label important points in `/tree`:** Labels survive forks and make long trees navigable.
- **Let the scratchpad absorb clutter:** Ask for throwaway scripts and intermediate outputs in the scratchpad: no permission prompts, no files polluting your repo, and it's cleaned up automatically.
- **`/share gist` before pairing:** Post the session as a secret gist so a teammate can read what you've tried.
- **Grab `/trace` when something breaks:** The trace id is what support needs, it's copyable mid-turn, and past ids survive a resume.

---

## See also

- [Headless Mode](./headless.md): resuming and naming sessions from scripts and CI.
- [Interactive Mode](https://commandcode.ai/docs/interactive-mode): the full session experience.
- [Context & Compaction](https://commandcode.ai/docs/context): how history is summarized as it grows.
- [Permissions](./permissions.md): how permission decisions apply as you resume or fork a session.
