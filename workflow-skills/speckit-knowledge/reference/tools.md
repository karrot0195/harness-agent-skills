<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Tools

Command Code ships 40+ built-in tools the agent calls during a session - files, search, shell, background work, scheduling, web, sub-agents, worktrees, and more. This page documents **every tool**: its exact wire name, every parameter, and the behaviors and guards behind it.

Tool availability depends on the current [permission mode](./permissions.md), the platform, and the session (IDE-only and host-wired tools appear only where they make sense). Any [MCP server](./mcp.md) you connect adds its tools alongside these, through the identical pipeline.

---

## What every tool call gets for free

Before a single tool runs, Command Code puts real engineering between the model and your machine. Every call flows through the same pipeline:

1. **Input repair.** A schema-driven repair layer heals malformed input before execution: JSON-stringified arrays and objects are parsed, bare scalars are wrapped, string numbers and booleans are coerced, markdown-wrapped paths are stripped, null placeholder fields are dropped, and **dozens of parameter aliases are renamed to the canonical name** (`path` → `file_path`, `query` → `pattern`, `oldValue` → `old_string`, `cmd` → `command`, …). Drifting models heal instead of erroring. If a required field is still missing after repair, the model gets a consolidated correction instead of a stack trace.
2. **Execution** against the injected runtime - tools never touch `node:fs` or `child_process` directly, which is what makes every one of them testable and portable.
3. **Output truncation.** Text results are capped at **25,000 tokens**; over-limit output is replaced with a retry-with-a-narrower-query notice rather than sliced mid-thought (tools that bound themselves, like `read_file` and the web tools, are exempt).
4. **Repair notes.** Any repairs that fired are prepended as `<repair_note>` tags so the model learns the canonical shape - and each repair is emitted as a telemetry event (rule names and keys only, never your values).

On top of that, the workspace boundary is enforced everywhere: reads are confined to your project (plus `/add-dir` directories), and writes stay inside it in every normal mode. The exception is yolo (`--yolo`, permission bypass), which - rather than prompting - silently admits an outside directory as a new workspace root on first write, so it is the one mode that can write outside your project. Read-only tools and read-only-classified shell commands never prompt in any mode.

---

## Filesystem

### `read_file`

Read a file as a bounded, line-numbered window. Read-only; never prompts.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `file_path` | string | yes* | Absolute path, inside the workspace. May also be a single glob pattern. |
| `paths` | string[] | yes* | Read many files at once: absolute paths and/or glob patterns. \*Either `file_path` or `paths` is required. |
| `offset` | number | no | 1-indexed start line (single-file reads). |
| `limit` | number | no | Max lines to read (default 2000, single-file reads). |
| `exclude` | string[] | no | Multi-file reads: glob patterns to skip. |
| `target_directory` | string | no | Multi-file reads: base directory for relative patterns (default: cwd). |
| `default_exclude` | boolean | no | Multi-file reads: skip `node_modules`, `dist`, `build`, `.git`, coverage, logs, … (default `true`). |
| `git_ignore` | boolean | no | Multi-file reads: respect `.gitignore` (default `true`). |

What it does beyond "read a file":

- **Format-aware**: images come back as real image blocks the model can see; Jupyter notebooks render as tagged cells with outputs; Word, PowerPoint, Excel, OpenDocument, RTF, EPUB and PDF files are extracted to Markdown; SVG reads as text. The full list is below.
- **Bounded by design**: 128 KB byte cap, 2000-line window, 2000-char per-line clamp - with truncation notes that embed the exact `offset` to continue from.
- **Typo-tolerant**: on a miss it retries macOS filename variants (curly apostrophes, NFD normalization) and then suggests siblings ("Did you mean…?") using substring and edit-distance matching.
- **Efficient**: memory-capped streaming reads, and re-reading an unchanged file returns a dedup stub instead of burning context.
- **Honest about safety**: device and stream paths (`/dev/zero`, `/dev/stdin`, `/proc/<pid>/fd/*`, …) are blocked; every read is recorded in the session's read ledger, which the write tools check later.

#### What it reads

| Kind | Extensions | What comes back |
| --- | --- | --- |
| Text and code | anything not listed below, plus `.svg` and `.rtf` | Line-numbered text window (`offset`/`limit`, negative `offset` reads the tail). |
| Images | `.png` `.jpg` `.jpeg` `.gif` `.webp` `.bmp` `.tiff` | The image itself, attached for vision-capable models (compressed, with the scale factor disclosed when downscaled). |
| Jupyter notebooks | `.ipynb` | Tagged cells with their outputs; plots attached as images; oversized outputs replaced by a `jq` pointer. |
| Word | `.docx` `.docm` `.doc` | Markdown: headings, lists, tables, windowed by `offset`/`limit` like text. |
| PowerPoint | `.pptx` `.pptm` `.ppsx` `.ppsm` `.ppt` `.pps` `.pot` | Markdown per slide, speaker notes included. |
| Excel | `.xlsx` `.xlsm` `.xlsb` `.xls` | Markdown tables per sheet. |
| OpenDocument | `.odt` `.ods` `.odp` | Markdown, as for the Office equivalents. |
| RTF, EPUB | `.rtf` `.epub` | Markdown. `.rtf` reads as plain text when no converter is available. |
| PDF | `.pdf` | Markdown from the text layer. A scanned or image-only PDF says which pages have no text and gives the `pdftoppm` command to render them; reading the rendered pages attaches them as images. |
| Other binary | `.zip` `.tar` `.gz` `.exe` `.dll` `.so` `.dylib` `.wasm` and other known binary types | A one-line note with the MIME type and size. Bytes are never loaded. |

Document extraction runs through a native converter that is not shipped with the CLI. The first document read on a machine installs it (needs network, a second or two); every later read and every later session reuses it, and a new release upgrades it on the next read. Where it cannot be installed (offline, unsupported platform) the read falls back to the binary note above, and `.rtf` to plain text. Documents are read as a rendering, never as bytes, so `write_file` will not overwrite a `.docx` with the Markdown that came out of it.

#### Multi-file reads

Pass `paths` (or a single glob pattern in `file_path`) and the contents come back concatenated under `// File: <path> (<type>)` headers, preceded by a `Read X/Y files` summary:

```json
{"paths": ["/repo/src/index.ts", "/repo/src/**/*.test.ts"]}
```

`file_path` and `paths` are two separate fields on purpose rather than one union-typed field: providers translate JSON-Schema unions inconsistently: Gemini rejects a function declaration whose parameter sets `any_of` alongside `description`/`items`, failing the whole request. `paths` satisfies the schema's `file_path` requirement through the tool's `requiredAlternatives`, so a multi-file call needs no placeholder.

Literal paths are read as named; glob patterns are filtered by `exclude`, the default exclusions and `.gitignore`. Documents are extracted to Markdown (capped per file at 128 KB, with a hint to read the file alone for the rest); other binary files are noted with their type and size instead of being inlined. Per-file errors are reported inline and never fail the whole call; every match is boundary-checked individually (symlink and `..` escapes are dropped); and an aggregate ~100 KB cap (one tool-output budget) reports exactly which files were skipped, so a wide glob narrows instead of flooding the context.

This absorbed the former `read_multiple_files` tool; one tool schema instead of two keeps roughly 540 tokens out of every request (~1,685 → ~1,147), and models no longer have to choose between two near-identical read tools. Calls that still arrive under the old name are rewritten to `read_file` (its `include` renames onto `paths`, and `targetDirectory` / `gitIgnore` / `defaultExclude` onto the merged schema's snake_case options), so nothing breaks mid-conversation.

### `read_directory`

Single-level directory listing - item counts plus alphabetized directory and file groups.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | string | yes | Absolute directory path, inside the workspace. |
| `exclude` | string[] | no | Glob patterns to hide. |

### `write_file`

Create or overwrite a file - with more safety checks than most editors.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `file_path` | string | yes | Absolute path (`~/` expands), inside the workspace. |
| `content` | string | yes | The full file content (empty is valid). |

Every write gets:

- **Read-before-overwrite**: an existing file must have been read this session - and a *partial* read (an offset window or byte-capped preview) doesn't count, so the agent can't clobber content it hasn't seen.
- **Stale-write detection**: if the file changed on disk after the recorded read, the write is refused.
- **Atomic writes**: unique temp sibling + rename, file mode preserved, symlink targets replaced correctly.
- **Encoding preservation**: UTF-8 and UTF-16LE BOMs survive the round trip.
- **Secret scanning veto** before any disk work, and per-file mutation serialization so concurrent writes can't tear a file.
- The workspace **write boundary holds in every normal mode**. Under yolo (`--yolo`) it is not a hard stop: an outside-workspace write silently admits that directory as a new root instead of prompting.

In [plan mode](./plan-mode.md), `write_file` stays available for exactly one destination: your plans directory (`~/.commandcode/plans/`), validated traversal- and symlink-safe.

### `edit_file`

Precise string-replacement edits with a six-strategy match cascade.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `file_path` | string | yes | Absolute path (`~/` expands). |
| `old_string` | string | yes | Text to replace (empty ⇒ create the file). |
| `new_string` | string | yes | Replacement (must differ). |
| `replace_all` | boolean | no | Replace every occurrence (default `false`). |
| `replacement_count` | number | no | Replace exactly the first N occurrences. |

When an exact match fails, the cascade tries smart-punctuation, line-trimmed, whitespace-normalized, indentation-flexible, and block-anchor matching - and tells the model which strategy matched. Ambiguous edits (multiple occurrences without `replace_all`) are refused with the count. Files over 10 MB and binary files are rejected up front; BOM and CRLF/LF line endings are preserved byte-faithfully; results include a line-numbered snippet of the edited region. Shares the stale-write protection, atomic writes, and mutation queue with `write_file`.

---

## Search

### `glob`

Find files by pattern, sorted by modification time.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `pattern` | string | yes | `*`, `**`, `?`, `[abc]`, `{js,ts}`; absolute patterns supported. |
| `path` | string | no | Directory to search (`~` expands). |
| `limit` | number | no | Max results (default 100, max 10,000). |
| `offset` | number | no | Pagination offset. |

Hidden and gitignored files are searched by default (`.git` always excluded), with a 20-second search deadline (60 s on WSL) and **partial-result salvage** on timeout or interrupt - you get what was found, never nothing. Missing directories come back with did-you-mean suggestions; every match is boundary-checked before it's reported.

### `grep`

ripgrep-powered content search.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `pattern` | string | yes | Ripgrep regex. |
| `path` | string | no | File or directory to search. |
| `glob` | string | no | Filename filter (brace alternatives supported). |
| `output_mode` | string | no | `content`, `files_with_matches` (default), or `count`. |
| `-A` / `-B` / `-C`, `context` | number | no | Context lines after/before/around matches. |
| `-n` | boolean | no | Line numbers (default `true`). |
| `-i` | boolean | no | Case-insensitive. |
| `type` | string | no | Ripgrep file type (e.g. `js`, `py`). |
| `head_limit` | number | no | Cap output lines (default 250, `0` = unlimited). |
| `offset` | number | no | Pagination offset. |
| `multiline` | boolean | no | Patterns may span lines. |

Runs the bundled ripgrep binary, falls back to `rg` on PATH, and if neither exists falls back to a **pure-runtime, gitignore-aware search** - grep works even where ripgrep can't be shipped. Hardened flags throughout (no user config, no ANSI, VCS dirs re-excluded, 500-column clamp), invalid regexes surface as real errors instead of fake empty results, thread-exhaustion retries single-threaded, and timeouts salvage partial results.

---

## Shell & processes

### `shell_command`

Run a shell command in the foreground or as a tracked background task. Shown as **bash** in the TUI.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `command` | string | yes | The command line. |
| `args` | string[] | no | Extra args, auto shell-quoted. |
| `cwd` | string | no | Working directory (workspace or session scratchpad). |
| `timeout` | number | no | Foreground timeout in ms (default 30,000, max 600,000, `0` = none). |
| `run_in_background` | boolean | no | Start detached; returns a task id + log path. |
| `description` | string | no | 5–10 word summary shown in the UI. |

The headline feature is **argv-level read-only classification**: commands are parsed with a real shell tokenizer and classified against a narrow allowlist, so `git status` runs without a prompt while `rm` asks - and quoted dangerous flags can't sneak past the classifier. Beyond that: leading `sleep N` (≥2 s) is rejected in favor of the real [`sleep`](#sleep) tool; foreground output is middle-out truncated (head + tail inline) with the **full output saved to a log file whose path is in the result**; conventional non-error exits are annotated (`grep` 1 = "no matches", `diff` 1 = "files differ"); and signal-killed commands honestly report `128+N` - never a fake success.

### `powershell` <em>(Windows)</em>

First-class PowerShell on Windows - not bash-through-emulation.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `command` | string | yes | PowerShell command/script. |
| `cwd` | string | no | Working directory, inside the workspace. |
| `timeout` | number | no | Timeout in ms. |
| `run_in_background` | boolean | no | Tracked background task. |
| `description` | string | no | Short summary. |

Discovers real PowerShell (pwsh 7+ preferred, 5.1 fallback), spawns with `-NoProfile -NonInteractive -EncodedCommand` (immune to cmd.exe quoting bugs), forces UTF-8 output, understands both `$?` and `$LASTEXITCODE`, and **persists the working directory across calls**. Its own fail-closed read-only classifier gives Windows the same no-prompt reads as bash.

### `shell_output`

**The** reader for background process output - it absorbed `bash_output`, `task_output`, and `monitor_events`, whose names still work as aliases (each alias keeps its old default: a `task_output` call arrives as `wait: "exit"`).

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Task id from `shell_command` (background) or `monitor_command`; `shell_tasks` lists them. |
| `wait` | `"none"` \| `"output"` \| `"exit"` \| null | no | `"none"` (default) returns now. `"output"` blocks until the next write or exit. `"exit"` blocks until the process finishes - build/test verdicts. |
| `block` | boolean \| null | no | Legacy: `true` equals `wait: "output"`. Ignored when `wait` is set. |
| `timeout_ms` | number \| null | no | Wait budget. Default 30,000; clamped to 0-600,000. |
| `from_offset` | number \| null | no | Absolute char offset to stream forward from. Tracked task ids only. |
| `max_chars` | number \| null | no | Window size for a streaming read, clamped to 1-160,000. |

Tracked tasks lead with a header (task id, kind, status, exit code, log path). Reads are tail-bounded at 30,000 chars inline (the full log stays on disk) and append `[still running]` / `[finished]`. Process output is fenced as untrusted data. A wait returns the moment its condition lands, the timeout elapses, or the user interrupts - and the result always names which of those happened, so the model never has to poll to find out. An id the tool does not recognize is an error naming `shell_tasks`, never a `[finished]` marker.

### `monitor_command` / `shell_tasks`

Long-running process monitoring with **scheduled wake-ups** - the agent is automatically woken once after `checkAfterMs` and again when the process exits, so it never has to poll.

- **`monitor_command`** - `command` (required), `args`, `directory`, `description`, `maxDurationMs` (auto-SIGTERM), `notify` (`never` | `scheduled`, default `scheduled`), `checkAfterMs` (default 45,000). Its output is read with `shell_output` (`monitor_events` remains as an alias).
- **`shell_tasks`** - `includeStopped` (default `true`). Lists every tracked task. Read-only.

### `kill_shell`

Stop a process - by task, pid, or port.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `taskId` | string \| null | one of | A tracked task id. |
| `pid` | number \| null | one of | A process id. |
| `port` | number \| null | one of | Kill whatever listens on this port (1–65535). |

Resolves ports to pids via `lsof` (or `Get-NetTCPConnection` on Windows), reconciles pids back to their tracked wrapper, escalates gracefully (SIGTERM → poll → SIGKILL; `taskkill /T` then `/F` on Windows), probes existence before claiming success - and **never signals a process group for an arbitrary pid**, so it can't take out unrelated processes.

---

## Work state & task management

### `task_create` / `task_update` / `task_list` / `task_get`

A durable, dependency-aware task ledger for coordination-heavy work - tasks persist across restarts with stable ids, three states, owners, metadata, and `blockedBy`/`blocks` edges.

- **`task_create`** - `subject` (required), `description` (required), `activeForm`, `blockedBy`, `blocks`, `metadata`.
- **`task_update`** - `taskId` (required), `status` (`pending` | `in_progress` | `completed` | `deleted`), `subject`, `description`, `activeForm`, `owner`, `metadata` (merge; null deletes a key), `addBlockedBy` / `addBlocks` / `removeBlockedBy` / `removeBlocks`. Completing a task reports which tasks it unblocked.
- **`task_list`** - optional `status` filter; shows unresolved blockers and a tally.
- **`task_get`** - `taskId` (required); full detail.

All four are plan-safe - capturing a plan as tasks *is* planning.

### `task_output` (alias)

Retired into `shell_output`. Calls to this name still work: they run as `shell_output` with `wait: "exit"` carried, so "block until the task settles" keeps its meaning. Use `shell_output` directly in new work.

### `task_stop`

Stop a tracked background task by `taskId`. Signals the whole process group, flips the registry state, and distinguishes "unknown id" from "already finished."

### `todo_write`

Provided by the opt-in `todos` built-in mod, which is **disabled by default** - enable it with `cmd mods enable todos` (`-g` for user scope) and it appears on the next session or `/reload`. While the mod is disabled the model never sees this tool.

The session checklist - the same list you manage with `/todos` and see in the TODOS panel.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `todos` | array | yes | The full list: `{content, status: pending\|in_progress\|completed, activeForm?, id?}`. |

Diffs old vs new state, warns when unfinished items are dropped or more than one item is in progress, nudges toward a verification step, and honors your `/todos` edits - items you removed stay removed, items you marked complete stay complete, with honest attribution.

Every call replaces the whole list, so the model always sends every item - pending, in progress and completed. Each item is `content` (imperative: "Add the login form"), `status`, and `activeForm` (present continuous: "Adding the login form", the label the spinner shows while that item runs). Exactly one item is `in_progress` at a time, and an item only turns `completed` when the work really succeeded - failing tests or a partial implementation keep it in progress.

The tool's own description stays short on purpose: a long description costs input tokens on **every** request, and small models follow a compact rule list more reliably than a long essay. The worked examples that used to live in it are below - they document the behavior the agent is aiming for, and they are here for you (and for the agent, when it reads this reference) rather than in the per-request prompt.

#### Worked examples - when the checklist is the right call

**A multi-step feature.**

> **User:** I want to add a dark mode toggle to the application settings. Make sure you run the tests and build when you are done!

The agent opens with a five-item list - build the toggle component, add the theme state, write the dark-theme styles, update the components that consume the theme, run the tests and build - and starts on the first one. Dark mode touches UI, state and styling, so it is multi-step by nature; the user asked for tests and a build, so verification becomes the closing item rather than an afterthought.

**A rename with unknown blast radius.**

> **User:** Help me rename the function `getCwd` to `getCurrentWorkingDirectory` across my project.

The agent searches first, finds 15 occurrences across 8 source units, and only then writes the list - one item per source unit. The search is what turns a one-line request into a tracked task: without the list, occurrence 13 is the one that gets missed.

**Several features in one sentence.**

> **User:** I need to implement these features for my e-commerce site: user registration, product catalog, shopping cart, and checkout flow.

Four named features, each with its own models, endpoints and forms. The agent breaks each one into concrete steps against the project's architecture and starts with registration, so progress across the whole request stays visible.

**An open-ended investigation that turns into work.**

> **User:** Can you help optimize my React application? It's rendering slowly and has performance issues.

The agent reviews component structure, render patterns, state management and data fetching *first*, then writes a list of what it actually found - memoize the expensive `ProductList` calculations, virtualize the long `Dashboard` list, fix the `ShoppingCart` state-update loop, split the bundle. The findings are the plan.

#### Worked examples - when a checklist is just noise

> **User:** How do I print 'Hello World' in Python?

One line of code, no steps to track. The agent answers.

> **User:** What does the `git status` command do?

Informational - there is no work to do, so there is nothing to track.

> **User:** Can you add a comment to the `calculateTotal` function explaining what it does?

A single edit in a single place. The agent makes it.

> **User:** Run `pnpm install` for me and tell me what happens.

One command, immediate result. A checklist around it adds a panel and no information.

---

## Scheduling & waiting

### `cron_create` / `cron_list` / `cron_delete` / `schedule_wakeup`

A real scheduler inside your coding agent.

- **`cron_create`** - `cron` (required, five-field local-time expression), `prompt` (required), `recurring` (default `true`), `durable` (default `false`), and `loop_owned` (internal marker used by the bundled `/loop` skill). Conversation-scoped tasks restore with `--resume` or `--continue`; explicit durable jobs live in `~/.commandcode/cron/jobs.json` independently. Expressions must match a real date within one year. Recurring tasks use deterministic jitter and expire after seven days.
- **`cron_list`** - no parameters; read-only. Lists fixed tasks and self-paced loops.
- **`cron_delete`** - `id` (required). Cancels either kind of task.
- **`schedule_wakeup`** - self-paced `/loop` control. Continue with `delay_seconds` (clamped to 60-3600), `prompt`, `reason`, and optional `noop`; or stop with `stop: true` (a `reason` may accompany it; do not pass `delay_seconds` or `prompt`). A new call replaces the pending self-paced wakeup.

Kill switches: `COMMANDCODE_DISABLE_CRON=1` disables scheduling; `COMMANDCODE_DISABLE_DURABLE_CRON=1` downgrades durable jobs to conversation scope. See [Scheduled tasks and loops](https://commandcode.ai/docs/background-tasks#scheduled-tasks-and-loops) for `/loop`, `loop.md`, resume behavior, jitter, expiry, and cancellation.

### `sleep`

Wait without burning a shell process - and wake the moment you type.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `seconds` | number \| null | one of | Duration (fractional ok). |
| `until` | string \| null | one of | ISO-8601 timestamp or `HH:MM[:SS]` (next occurrence). |
| `wake_on_input` | boolean \| null | no | Wake within a second when queued user input arrives (default `true`). |
| `reason` | string \| null | no | 5–10 word reason shown in the UI. |

Streams a once-per-second progress tick, releases its timer on interrupt, and respects a configurable duration policy (minimum raise / maximum cap, default cap 10 minutes - capped sleeps report the remaining time so the agent can continue).

---

## Web

Both web tools are **client-executed through Command Code's own server routes** - a plain tool call, not a provider-side feature - so **every model gets web access**, open models included. Both are read-only and never prompt.

### `web_search`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `query` | string | yes | Search query (≥ 2 chars). |
| `numResults` | number | no | Results (default 5, max 10). |
| `allowed_domains` | string[] | no | Only these domains. |
| `blocked_domains` | string[] | no | Never these domains (mutually exclusive with allowed). |

Domain filters are re-enforced client-side, and the tool's own description keeps the model's queries year-accurate.

### `web_fetch`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | yes | http auto-upgrades to https. |
| `format` | string | no | `markdown` (default), `text`, or `html`. |
| `startIndex` | number | no | Pagination into long pages. |
| `timeout` | number | no | Seconds (default 60, max 120). |

A client-side URL guard rejects credentials-in-URL, private/loopback/link-local hosts, and single-label names **before any billable server call**; content is windowed at 100,000 chars with `startIndex` continuation; responses are cached (15-minute TTL, LRU) and redirects are reported.

---

## Artifacts

`artifact_publish` and `artifact_manage` publish an HTML page as a link to open and share. Their parameters are on [Artifacts](https://commandcode.ai/docs/artifacts#tools).

---

## Sub-agents

### `agent`

Delegate work to a specialized sub-agent with its own context window.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `description` | string | yes | 3–5 word label. |
| `subagent_type` | string | no | One of the registered agents (defaults to `general`). |
| `prompt` | string | yes | Self-contained task. |
| `model` | string | no | Per-run model override. |
| `run_in_background` | boolean | no | Run detached; returns an `agent_id`. |

The `subagent_type` enum is **recomputed from the agent registry on every schema read**, so agents you add mid-session are immediately callable. Bundled agents: **`general`** (all tools), **`explore`** (read-only codebase exploration with quick/medium/thorough depth), and **`plan`** (implementation planning). Add your own with [custom agents](./custom-agents.md). Sub-agents run under the same permission pipeline with deny rules and plan gating intact - but are never granted the spawn-shaped tools (`agent`, `agent_output`, plan-mode, worktrees, `run_command`, `ask_user_question`, `sleep`), and each gets its own isolated tool state.

### `agent_output`

Collect, poll, or kill background sub-agents: `agent_id` (omit to list all), `action` (`wait` - the default, blocks until done; `status`; `kill`). Interrupting the parent stops the wait, not the agent.

### `activate_skill`

Load a [skill](./skills.md) by name. The skill catalog (names + descriptions only) rides in the system prompt; the full SKILL.md body loads on activation - progressive disclosure that keeps context lean.

---

## Interaction & session

### `ask_user_question`

Structured questions with clickable options - up to 4 questions per call, each with 2–4 options.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `questions` | array | yes | `{question, header (≤20 chars), options: [{label, description, preview?}], multiSelect?}`. |

Free-text replies are always available, answers can carry attached images, per-option previews are supported, and in headless runs the first option is auto-answered **with the choice disclosed to the model** - never silently.

### `enter_plan_mode` / `exit_plan_mode`

The model can *propose* mode switches; you decide. `enter_plan_mode` takes no arguments and fails safe (entering only narrows what the agent can do). `exit_plan_mode` presents the plan - preferring the freshest plan file written this session (256 KB cap) - with a three-way approval: proceed with accept edits, proceed in default mode, or stay planning. Your edits to the plan text persist.

### `plan_review`

Re-open the plan review panel for the most recent plan file written this session to `~/.commandcode/plans/`. Takes no arguments. Presents the full plan with two outcomes: approve (optionally with accept edits) to begin implementing, or cancel to keep refining. Read-only, since its only side effect is a possible accept edits switch.

Use it whenever a plan should be re-reviewed after changes, rather than pasting plan contents as a text reply. **Not available in plan mode** - `exit_plan_mode` is the plan-mode path, and calling `plan_review` there returns an error pointing you back to it. See [Plan Review](./plan-mode.md#plan-review).

### `enter_worktree` / `exit_worktree`

Mid-session git isolation. `enter_worktree` (`name` optional, ≤64 chars) creates or resumes a managed worktree under `~/.commandcode/worktrees/<repo>/` and switches the session there. `exit_worktree` (`action: keep|remove`, `discard_changes`) is **fail-closed**: uncommitted changes, commits beyond the baseline, or unverifiable state refuse removal unless you explicitly pass `discard_changes: true`. See [Worktrees](https://commandcode.ai/docs/worktrees).

### `run_command`

Run one of Command Code's own slash commands on your behalf (`command`: e.g. `/compact`, `/model gpt-5`). Validated against the live command set (unknown commands get did-you-mean suggestions) and **dispatched after the turn ends**, so commands like `/reload` or `/clear` can't yank the ground out mid-run. Interactive sessions only.

### `taste`

Record a coding preference into [Taste](https://commandcode.ai/docs/taste) (`instruction`: what to remember). Always advertised - even when learning is off, so preference requests route somewhere honest instead of into hand-edited files.

### `get_diagnostics` <em>(IDE only)</em>

LSP diagnostics on demand, advertised only when an [IDE is connected](https://commandcode.ai/docs/ide-integration). `filePaths` filters to specific files; output is grouped per file (`L<line>:<col> severity code: message`) and sanitized against prompt injection.

Configuration and product help are bundled skills rather than repeated tool schemas. The `config` skill uses the validated `cmd config list|get|set` CLI, and `command-code-knowledge` progressively loads only the relevant reference page.

---

## MCP tools

Tools from connected MCP servers register as `mcp__<server>__<tool>` and flow through the identical permission and output pipeline - no special cases. Servers connect in the background and stream their tools into the live registry, so session start never blocks on a slow server. MCP output enforces its own 25,000-token budget with pagination guidance.

MCP tools are hidden entirely in plan mode - Command Code can't verify a remote tool is read-only, and hiding the schema beats letting the model waste a round-trip into a runtime denial.

---

## Codemode

The `codemode` tool lets the model write a short JavaScript script that calls other tools. Instead of one tool call per round trip, the model writes a script that does several steps and runs it in one go: it loops, fans out with `Promise.all`, and filters, and only what it prints or returns reaches the context. A chain of MCP calls with a filter at the end becomes one call:

```js
const issues = await tools.mcp__linear__list_issues({team: "Core"});
return issues.filter(issue => issue.open).map(issue => issue.id);
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | string | yes | The body of an async function. Top-level `await` and `return` work. |
| `timeout_ms` | number | no | Deadline for the whole script. Default 120,000, between 1,000 and 600,000. |

### Configure codemode

Codemode has three modes, set in `/config`. The mode decides when the tool is offered to the model and which tools a script may call.

- **MCP tools.** The default. The tool is offered whenever an MCP server is connected, and scripts can call the MCP tools. Everything else works as before: MCP tools can still be loaded and called directly.
- **Read-only and MCP tools.** The tool is offered in every session. Scripts can call the MCP tools and the read-only built-in tools: reading files and directories, glob, grep, web search, and the todo and task tools. These tools are made script-first and are removed from context, so that the model uses them through codemode.
- **Off.** Disables codemode completely.

In every mode, a script can never edit or write files, run commands, ask the user a question, review a plan, switch plan mode, load tools, or start another script.

### Globals

| Global | What it does |
| --- | --- |
| `tools.<name>(args)` | Calls a tool. One object argument, shaped like the tool's parameters. |
| `ALL_TOOLS` | The tools this script may call, with a one-line description each. |
| `searchTools("query")` | Finds callable tools by description. |
| `describeTool("name")` | Returns a tool's full schema. |
| `CWD` | The working directory. |
| `text(...)`, `console.log(...)` | Print a line. |
| `return`, `exit()` | Send back a value; end the script early. |
| `store("key", value)`, `load("key")` | Keep a JSON value across scripts in the session. |

### Permissions

Every nested call is a real tool call: same mode filter, permission rules, input repair, and output truncation as a direct call, with prompts one at a time. `codemode` itself is read-only and never prompts, since it can do no more than the calls it makes. It is hidden in any mode that leaves a script nothing to call, such as plan mode under the default setting.

### Limits

Scripts run in a sandbox with no file system, network, timers, or process access; the tool bridge is the only way out.

- 128 MB of memory, one sandbox per call
- 8 nested calls in flight at once
- 1 MB of printed output, after which the script fails; 25,000 tokens reach the model
- 256 KB per stored value, 1 MB per session store

---

## Permission modes & tool visibility

Which tools the model even *sees* depends on the mode:

| Mode | Tool surface |
| --- | --- |
| `default`, `accept-edits`, `dont-ask`, `yolo` | Everything except `exit_plan_mode`. |
| `plan` | Write tools, `enter_plan_mode`, and all `mcp__*` tools removed. `write_file` stays (plans directory only), `shell_command` stays (read-only commands only), and the `task_*` CRUD tools stay - capturing a plan as tasks is planning. |

Visibility filtering is backed by a second, fail-closed runtime check, so a tool offered under one mode can never execute under another. Deny rules from your [permission settings](./permissions.md) win in **every** mode, including yolo.

---

## Next steps

- [Slash Commands](./custom-slash-commands.md): every built-in and custom slash command
- [CLI Reference](https://commandcode.ai/docs/reference/cli): all flags, subcommands, and options
- [Background Tasks & Scheduling](https://commandcode.ai/docs/background-tasks): the background-work story end to end
- [MCP](./mcp.md): extend Command Code with external tools
- [Hooks](./hooks.md): run your own scripts around tool calls
- [Mods](https://commandcode.ai/docs/mods): add your own tools with the extension API
