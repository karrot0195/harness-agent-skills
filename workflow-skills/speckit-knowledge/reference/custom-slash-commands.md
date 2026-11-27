<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Slash Commands

Command Code ships with **over 60 built-in slash commands** covering sessions, context, permission modes, models, billing, and everything in between - and you can extend the set with your own custom commands, skills, and mod-added commands.

## How the slash menu works

Type `/` at the start of the input to open the command menu:

- **Filtering** - as you type, rows are ranked by match quality: a command whose name starts with your query ranks highest, then commands containing it, then description matches. The list re-sorts on every keystroke.
- **Exact-match highlighting** - the input text stays plain while you type a partial name; it only turns accent-colored once it names a real command (a half-typed `/mod` stays plain, `/model` lights up).
- **Aliases on canonical rows** - an alias is not a second menu row. `/new` resolves to `/clear` everywhere, and the single canonical row advertises it as `/clear (new)`. Typing the alias still surfaces and ranks that row.
- **Navigation** - `↑`/`↓` move the selection, `Enter` runs the selected command, `Tab` or `→` inserts it into the input with a trailing space so you can type arguments, `Esc` closes the menu.
- **Dynamic rows** - custom commands, mod commands, and skills load asynchronously; built-ins render first and the dynamic rows appear as discovery settles.

---

## Built-in commands

Every built-in command, grouped by area. Aliases are shown in parentheses on the canonical command; optional arguments in `[brackets]`, alternatives separated by `|`.

### Sessions

| **Command**                    | **Description**                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `/clear` (`/new`)              | Start a new session with empty context; previous stays on disk, resumable with `/resume`              |
| `/resume` (`/sessions`)        | Resume a past conversation                                                                            |
| `/rename [name]`               | Rename the current session                                                                            |
| `/name [name]`                 | Alias of `/rename`; bare `/name` shows the current name                                               |
| `/fork [name]`                 | Fork the conversation into a new session                                                              |
| `/clone`                       | Clone the current branch into a new session and switch to it (never takes an argument)                |
| `/tree`                        | Browse the session tree and jump to any point in it                                                   |
| `/rewind`                      | Restore to a previous checkpoint (press Esc twice)                                                    |
| `/session-file`                | Show the current session id and session file path                                                     |
| `/export [html\|jsonl\|md]` or `/export <path>` | Export the session - a bare format keyword or a file path; HTML is the default format |
| `/share [gist [html\|jsonl\|md]]` | `/share gist` posts a secret GitHub gist; bare `/share` is being rebuilt and points to `/export`   |
| `/unshare`                     | Stop sharing conversation                                                                             |
| `/exit` (`/quit`)              | Exit Command Code                                                                                     |
| `/reload`                      | Restart Command Code and resume this session (applies a staged update)                                |
| `/mods`                        | List loaded [mods](https://commandcode.ai/docs/mods) and panes; `/mods reload [name]` hot-reloads, `/mods open\|close <pane>`     |

### Context & compaction

| **Command**     | **Description**                              |
| --------------- | -------------------------------------------- |
| `/compact`      | Compact the conversation history             |
| `/compact-mode` | Select a compact mode to compact sessions    |
| `/context`      | Show context window usage and breakdown      |
| `/memory`       | Manage Command Code memory                   |
| `/init`         | Initialize AGENTS.md for this project        |

### Modes & planning

| **Command**                          | **Description**                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `/mode [default\|accept-edits\|plan]` | Show or switch the permission mode; bare `/mode` prints the current mode           |
| `/mode:default`                      | Switch to default mode (prompt before edits/commands)                              |
| `/mode:accept-edits`                  | Switch to accept edits mode (accept edits automatically)                            |
| `/mode:plan`                         | Switch to plan mode (read-only, no side effects)                                   |
| `/plan [task]`                       | Enter plan mode; `/plan <task>` plans that task                                    |
| `/plans [name]`                      | Browse, review, and annotate saved plans; bare `/plans` opens the browser          |
| `/plan-review`                       | Open this session's latest plan in review                                          |
| `/goal <objective>\|clear\|status`   | Set an objective for the agent to work towards autonomously                        |
| `/todos`                             | Manage the session todo list (needs the `todos` mod: `cmd mods enable todos`)      |
| `/btw <question>`                    | Ask a quick side question mid-turn   |
| `/review [pr-number]`                | Review a pull request                                                              |
| `/pr-comments`                       | Fetch all PR comments for current branch                                           |

	Yolo (bypass permissions) mode is deliberately **not** switchable via
	`/mode` - slash commands are agent-invokable, so a mid-session route into
	permission bypass would let the model disable its own permission prompts. It is
	reachable through the shift+tab mode cycle, or the explicit `--yolo` launch
	flag to start a session directly in it.

### Models & providers

| **Command**       | **Description**                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `/model [id]`     | Switch between Command Code models - `/model <id>` applies directly, bare opens a picker. For a separate model while planning and after approving, see [planning and implementation models](https://commandcode.ai/docs/settings#planning-and-implementation-models) |
| `/effort [level]` | Set reasoning effort for the current model (levels depend on the model)                  |
| `/connect`      | Connect to AI providers. Command Code, [BYOK providers](./byok.md) and API keys |
| `/login`          | Log in to Command Code or a provider                                                     |
| `/logout`         | Log out of Command Code or a provider                                                    |

### Extensibility & integrations

| **Command**                                        | **Description**                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| `/skills`                                          | Browse and open agent skills                                                      |
| `/agents`                                          | Manage agent configurations                                                       |
| `/mcp`                                             | Manage MCP server connections                                                     |
| `/design [mode]`                                   | Design partner: audit, build, compose, and ship UI - bare `/design` browses modes |
| `/loop [interval] [task]`                          | Run a task now, then repeat it on a fixed or self-paced schedule ([details](https://commandcode.ai/docs/loop)) |
| `/rc [mode\|off\|status]`                           | Drive this session from Telegram or Discord ([details](https://commandcode.ai/docs/remote-control))                      |
| `/import [claude\|codex\|cursor\|pi\|opencode\|gemini]` | Import your setup from another coding agent; bare `/import` imports from all sources |
| `/taste`                                           | Manage Taste learning and usage                                                   |
| `/learn-taste`                                     | Learn taste from sessions with other coding agents (Claude Code, Cursor, etc)     |
| `/ide`                                             | Connect IDE to share your open file and selected lines                            |
| `/terminal-setup`                                  | Setup VSCode keybindings (only shown in the menu inside a VS Code terminal)       |

### Workspace

| **Command**                                | **Description**                                    |
| ------------------------------------------ | -------------------------------------------------- |
| `/add-dir <directory>`                     | Add directory to workspace context                 |
| `/worktree [name\|list\|remove <name>]`    | Create, list, or switch git worktrees              |

### Billing & account

| **Command** | **Description**                              |
| ----------- | -------------------------------------------- |
| `/usage`    | Display credits, plan, and usage metrics     |
| `/upgrade`  | Open billing page to upgrade your plan       |
| `/extra`    | Buy extra usage at API cost, zero markup |

### Utilities

| **Command**        | **Description**                                                |
| ------------------ | -------------------------------------------------------------- |
| `/help`            | Show available shortcuts                                       |
| `/hotkeys`         | Show all keyboard shortcuts                                    |
| `/config [query]`  | Search and change settings                                     |
| `/theme [dark\|light\|auto]` | Switch themes; `auto` matches your terminal background |
| `/status`          | Show comprehensive environment status                          |
| `/statusline [off\|on\|reset]` | Configure Command Code's statusline UI (terminal only) |
| `/changelog [all]` | See what's new in Command Code (`all` for the full history)    |
| `/learn`           | Open the Command Code learn hub in your browser                |
| `/update`          | Update Command Code to the latest version                      |
| `/feedback [title]` (alias `/issue`) | Report a bug or share feedback; opens a prefilled GitHub issue |
| `/trace`           | Copy the current trace id; required for support debugging      |
| `/copy`            | Copy the last response to the clipboard                        |

---

## Command behavior

### Bare invocations that open a picker

`/model`, `/effort`, and `/theme` each take an optional value (`/model gpt-5`, `/effort high`, `/theme dark`) that applies directly as a one-shot. But unlike other optional-value commands, running them **bare** doesn't perform a default action - it opens an interactive picker immediately. Bare `/mode` also runs immediately, printing the current mode and the available switches (`/mode:default`, `/mode:accept-edits`, `/mode:plan` - or press shift+tab to cycle).

`/effort` only opens its selector when the current model supports reasoning effort levels; otherwise it prints a notice that effort isn't supported for that model.

`/theme` offers three values. `dark` and `light` pin a palette; `auto`, the default, automatically detects your terminal's background color at startup (OSC 11, falling back to `COLORFGBG`) and uses light or dark to match. A terminal that won't report its background falls back to dark.

### Commands with meaningful default actions when bare

Some optional-argument commands do something useful with no argument instead of opening a picker: bare `/import` imports from all detected sources, bare `/export` exports in the default format, bare `/goal` (or `/goal status`) shows the current goal, bare `/name` shows the current session name, and bare `/plan` enters plan mode without a task.

### Safe while the agent is busy

Most commands are **blocked mid-turn** - mode flips, session switches, model changes, compaction, and anything that would race an active turn waits until the agent finishes. A deliberate set of read-only or local commands stays available while a turn is running:

- `/trace` - capture the live trace id of the running turn (its main purpose)
- `/session-file` - read-only session facts
- `/copy` - clipboard only
- `/todos` (also `ctrl+x`) - edits local todo state, most useful mid-turn while a plan is being driven (needs the `todos` mod enabled)
- `/statusline off`, `/statusline on`, `/statusline reset` - a local display preference (bare `/statusline` opens its editor once the turn ends)
- `/btw <question>` - a side question answered in its own panel; the running turn keeps going underneath
- `/exit` / `/quit` - always available
- `/goal clear` - stops the goal loop; the current step finishes, then the loop stops. Setting a **new** goal mid-turn is refused with a busy notice.

Most other commands - `/clear`, `/mode`, `/plan`, `/model`, `/compact`, `/worktree`, `/resume`, `/login`, and the like - report busy and ask you to wait for the current turn (or press Ctrl+C). (`/review` is an exception: it runs mid-turn.)

### `/goal` in detail

`/goal <objective>` sets an objective (up to a length limit) and arms an autonomous loop capped at a maximum number of turns. `/goal status` (or bare `/goal`) shows the active goal and progress; `/goal clear` clears it. `/goal resume` and `/goal pause` are reserved but not available yet.

### `/loop` in detail

`/loop <interval> <task>` runs the task now and repeats it on a fixed cadence such as `5m`, `2h`, `1d`, or a trailing `every 2 hours`. `/loop <task>` runs it now and lets the agent pick each next delay, between one minute and one hour. Bare `/loop` runs the default maintenance task, which a `.commandcode/loop.md` file replaces. Esc cancels the conversation's loops. The [`/loop`](https://commandcode.ai/docs/loop) page has the normalization rules, `loop.md`, and resume behavior.

### `/statusline` in detail

The status line is the row directly under the input. It stays visible while you type and steps aside only for the slash menu, the `@` file list, the slash hint, and a pending Ctrl+C exit:

```text
> fix the parser
  branch: main · mymod: ok
  ? for shortcuts · PR #5329 · taste on
```

Bare `/statusline` slash command opens the statusline editor. Select items from the list to add to the statusline. An item with nothing to show right now says why in brackets beside its label, for example `Git branch (not on a git branch)`, instead of showing a placeholder.

These items sit in the row, in the order you choose. Items marked *off* are unchecked by default:

| **Item**          | **Shows**                                                                          |
| ----------------- | ---------------------------------------------------------------------------------- |
| Model             | This session's model (*off*)                                                       |
| Model + reasoning | The model and its reasoning level, e.g. `Opus 4.7 with high effort` (*off*)        |
| Reasoning level   | The reasoning level alone, e.g. `high effort` (*off*)                              |
| Context used      | Context used against the model's full window, e.g. `ctx 46k/200k · 23%`; updated after every model request (*off*) |
| Context remaining | The rest of the full window, e.g. `77% left`, not the room before auto-compact (*off*) |
| Current directory | The working directory, e.g. `~/work/app` (*off*)                                   |
| Git branch        | The checked-out branch, e.g. `branch: main`; re-read after each turn (*off*)       |
| Session name      | The session's name, from `/rename` or the generated title (*off*)                  |
| Version           | The Command Code version, e.g. `v1.77.0` (*off*)                                   |
| Phase model       | The planning or implementation model, while one is in charge; always at the right end of the row |

These items keep their own place under the input; you can only turn them on or off. All are on by default:

| **Item**          | **Controls**                                                                       |
| ----------------- | ---------------------------------------------------------------------------------- |
| Permission mode   | The accept-edits and plan mode badges. Bypass and dont-ask always show             |
| IDE context       | The IDE file or selection and the IDE connection indicator                         |
| Pull request      | The open or merged PR badge for this branch, as a link                             |
| Taste learning    | `taste on` or `taste off` (`taste off (byok)` when a BYOK session skips learning)  |
| Background tasks  | Running shells and monitors; press `↓` to manage them                              |
| Shortcut hints    | `? for shortcuts` and the paste hint. The stash badge shows whenever a prompt is stashed |

The Ctrl+C exit prompt, credit warnings, and update, share and taste notices always show.

| **Key**            | **Action**                                                 |
| ------------------ | ---------------------------------------------------------- |
| `↑` / `↓`          | Move between items                                         |
| `Space` / `Enter`  | Check or uncheck the focused item                          |
| `←` / `→`          | Move the focused item left or right in the row (only row items move; Phase model stays at the right end) |
| `Esc`              | Save your changes and close (just close if nothing changed; during a save, close at once; after another session's change, discard yours) |
| `Ctrl+C`           | Close without saving                                       |

Unchecked items keep their place, so checking one again puts it back where it was. Nothing changes under the input until Esc saves the layout. If the write fails, the editor stays open with your changes, and Esc tries again; if another session changed the layout while you were editing, it never overwrites it: Enter reloads the saved version, Esc discards your changes. Closing the editor gives you back the prompt you were writing.

Output from [mods](https://commandcode.ai/docs/mods) (`cmd.ui.setStatus`) always appears after the built-ins, and before the phase model at the right end, in the order the mods loaded. Unchecking every built-in still shows mod output; `/statusline off` is the way to hide the whole row.

#### Add your own items with mods

The editor lists only the built-in items. To show anything else in the row, such as a CI result, a ticket number or a count, use a [mod](https://commandcode.ai/docs/mods) that calls `cmd.ui.setStatus(text)`. Each mod gets one segment: a new call replaces its text, and `null` removes it. You don't need to write the mod yourself; describe what you want and Command Code builds it:

```text copy filename="Prompt"
Build me a mod that shows how many files I've changed in this git repo in my status line, in yellow, and updates it after every turn. Show nothing when the tree is clean.
```

Command Code writes something like this and saves it in `~/.commandcode/mods/changed-files.ts`, where it loads in every session:

```ts copy filename="~/.commandcode/mods/changed-files.ts"
import type {ModApi} from '@commandcode/harness';

export default function (cmd: ModApi): void {
	const refresh = async (): Promise<void> => {
		const {stdout, code} = await cmd.exec({command: 'git', args: ['status', '--porcelain']});
		const count = stdout.split('\n').filter(Boolean).length;
		// null clears the segment: nothing shows on a clean tree or outside a repo.
		cmd.ui.setStatus(code === 0 && count > 0 ? `\u001b[33m✎ ${count} changed\u001b[39m` : null);
	};

	cmd.hooks({onSessionStart: refresh});
	cmd.on('turn_end', () => void refresh());
}
```

The next session shows it in the row:

```text
> fix the parser
  ✎ 2 changed
  ? for shortcuts · PR #5329 · taste on
```

To try a mod without installing it, run `cmd --mod ./changed-files.ts`; after editing an installed one, run `/reload`. Mod text can use ANSI colors and OSC 8 links; other escape codes are removed. To hide mod output but keep the built-ins, set `legacy-mods` to `"enabled": false` in `config.json` (see below). The [UI surface](https://commandcode.ai/docs/mods#ui-surface) section of the mods page has the full `setStatus` contract.

| **Command**          | **Effect**                                                                        |
| -------------------- | --------------------------------------------------------------------------------- |
| `/statusline`        | Open the editor                                                                   |
| `/statusline off`    | Hide the whole row, mod output included. Your selection is kept, and the on/off-only items above are unaffected |
| `/statusline on`     | Show the row again with your saved selection, or the default one                 |
| `/statusline reset`  | Forget your layout and go back to the default, in the order above                |

Your items always get exactly one line under the input, in the order you set. When they don't fit your terminal, the line is cut with `…` at the edge rather than wrapping or reordering. The phase model sits at the right end of that line when it fits beside it, otherwise at the right end of the line below.

The layout is saved in `~/.commandcode/config.json` under `statusline`. You rarely need to edit it by hand:

```json
{
  "statusline": {
    "version": 1,
    "enabled": true,
    "items": [
      {"id": "model", "enabled": false},
      {"id": "pull-request", "enabled": true},
      {"id": "taste", "enabled": true},
      {"id": "phase-model", "enabled": true},
      {"id": "background-tasks", "enabled": true},
      {"id": "git-branch", "enabled": true},
      {"id": "permission-mode", "enabled": true},
      {"id": "legacy-mods", "enabled": true}
    ]
  }
}
```

`items` sets the order, except that `phase-model` always draws at the right end. `enabled: false` on an item unchecks it; `enabled: false` at the top level is `/statusline off`. An item missing from `items` is unchecked, except the on/off-only items (`permission-mode`, `ide`, `pull-request`, `taste`, `background-tasks`, `hints`), which stay on. Other ids: `model-reasoning`, `reasoning`, `context-used`, `context-remaining`, `cwd`, `session-name`, `version`. `legacy-mods` is where mod output goes; leave it out (or set `"items": []`) and mod output is hidden.

A layout saved by a newer version of Command Code is never overwritten: the row uses the default layout and the editor opens read-only, until you update or run `/statusline reset`. A `statusline` value that isn't valid is also left untouched and shown read-only; fix or remove the `statusline` key, or run `/statusline reset`. If `config.json` itself isn't valid JSON, nothing can save the layout, `/statusline reset` included, until you fix or remove that file.

The row doesn't watch the file. A hand edit, or a save from another Command Code window, shows up the next time you open `/statusline`, run `/statusline off`, `on` or `reset`, or restart.

### `/btw` in detail

`/btw <question>` asks a quick question about your current work without adding to the conversation. The answer sees the full conversation so far, including the prompt and tool results of a turn that is still running. It has **no tools**: it cannot read files or run commands, and if the model tries to call one anyway the answer says nothing was run. 

Text and images pasted with the question are included. The question and answer never enter the conversation history or the session file, and each `/btw` stands alone.

You can run `/btw` while the agent is working; it does not interrupt the turn. The answer opens in a panel above the input:

- `Esc` (or `Ctrl+C`) - dismiss (an answer still streaming is cancelled); other typing is ignored until you dismiss
- `↑`/`↓` - scroll a long answer
- `c` - copy the answer as raw Markdown

Asking a new `/btw` replaces the one on screen. If the conversation is too long for a side question, the panel suggests `/compact`. `/btw` is terminal-only: it is not available from remote control or sandbox sessions.

### `/rc` in detail

Bare `/rc` opens the picker: platform, setup, permission mode. `/rc default`, `/rc auto-accept` and `/rc yolo` connect straight into a mode. `/rc status` reports what is on, `/rc off` disconnects, and `/rc off clear` also deletes the bot's own messages. `/rc` is refused when the model asks for it and when it arrives from the chat, so the bot cannot change its own token or allowlist. See [`/rc`](https://commandcode.ai/docs/remote-control) for setup and what the chat can send.

---

## Custom slash commands

Custom slash commands let you save frequently used prompts as markdown files. Define a command once, then run it anytime with dynamic arguments.

```bash
/<command-name> [arguments]
```

The command name comes from the markdown filename (without the `.md` extension).

### Locations

| **Type**  | **Location**               | **Menu label** | **Scope**             |
| --------- | -------------------------- | -------------- | --------------------- |
| Project   | `.commandcode/commands/`   | `(project)`    | This project only     |
| User      | `~/.commandcode/commands/` | `(user)`       | All your projects     |

```bash
# Project-level command
mkdir -p .commandcode/commands
echo "Generate unit tests for this code following our testing conventions" > .commandcode/commands/test.md

# User-level command
mkdir -p ~/.commandcode/commands
echo "I am currently being onboarded on this project, help me understand it." > ~/.commandcode/commands/understand.md
```

The file's full trimmed body is the prompt that runs; the slash menu shows its first meaningful line (skipping YAML frontmatter and markdown markers, truncated to ~80 chars) plus the location label.

### Namespacing

Organize commands in subdirectories to any depth. The subdirectory appears in the description label but does **not** affect the command name:

| **File Location**                             | **Command**  | **Menu shows**        |
| --------------------------------------------- | ------------ | --------------------- |
| `.commandcode/commands/frontend/component.md` | `/component` | `(project: frontend)` |
| `~/.commandcode/commands/git/commit.md`       | `/commit`    | `(user: git)`         |
| `.commandcode/commands/simple.md`             | `/simple`    | `(project)`           |

	Because the name comes from the filename only, `frontend/button.md` and
	`backend/button.md` both create `/button` and will conflict. On a
	user/project name collision, the user copy wins at dispatch (user
	directories are scanned first), though both rows still appear in the menu.
	Use unique filenames to avoid this.

### Argument templating

Placeholders in the command body are replaced with your arguments in a single pass (substituted text is never re-scanned, so an argument containing `$1` lands literally):

| **Placeholder**       | **Description**                                                        |
| --------------------- | ---------------------------------------------------------------------- |
| `$ARGUMENTS` / `$@`   | All arguments as a single string (`${ARGUMENTS}` / `${@}` work too)    |
| `$1`, `$2`, … `$N`    | Positional arguments, 1-indexed (there is no `$0`); missing args → `""` |
| `${1}`, `${2}`, …     | Braced positional - safe directly next to other text (`v${1}.0`)       |
| `${N:-default}`       | Nth argument, or `default` when missing/empty                          |
| `${@:-default}`       | All arguments, or `default` when none were provided                    |
| `${@:N}`              | Arguments from the Nth position to the end                             |
| `${@:N:L}`            | `L` arguments starting at the Nth position (clamped to what exists)    |

Arguments split on whitespace, respecting single and double quotes:

```bash
/create-component React "Login Form" "email validation and submit handler"
# $1 → React    $2 → Login Form    $3 → email validation and submit handler
```

**Example** (`.commandcode/commands/commit.md`):

```markdown
Write a commit of type "${1:-fix}" with message: ${@:2}
```

```bash
/commit feat add slash command reference
# → Write a commit of type "feat" with message: add slash command reference
```

Edge cases: an out-of-range slice (`${@:9}` with three args) expands to an empty string; an unrecognized `${...}` expression (e.g. a literal `${HOME}`) is left untouched so shell/env-style text survives; a template with no placeholders passes through unchanged.

---

## Dispatch precedence

When multiple sources define the same name, dispatch resolves in this order - first writer wins:

1. **Built-in** commands (the full set, including any the menu hides)
2. **Mod** commands (added by active mods)
3. **Custom** commands (`.commandcode/commands/`, `~/.commandcode/commands/`)
4. **Skills**

So a custom command can never override a built-in, and a skill shadowed by any of the above resolves to its owner. Shadowed skills still render in the menu with a `- shadowed by /<name>` note so you know they exist, and they run under the `skill:` namespace: `/skill:<name>` bypasses this whole ladder and only ever resolves to a skill. Lookup is case-insensitive (`/Reload` resolves to `/reload`).

### Skill invocation

Installed skills are invocable as `/<skill-name>` and appear in the menu with a `[skill]` badge. A skill's `argument-hint` frontmatter leads its menu description (e.g. `/pr-desc  [skill] <branch> - Generate a PR…`), and skills marked `user-invocable: false` stay model-invocable but never appear in the `/` menu. Duplicate skill names dedupe with project taking precedence over global.

### Mod commands

Active mods can register their own slash commands; they slot in between built-ins and custom commands in both the menu and dispatch. Discovery is fault-tolerant - a broken commands directory or unreadable skill never breaks the menu; each source just degrades to empty.

---

## Next steps

- Explore the [CLI Reference](https://commandcode.ai/docs/reference/cli) for flags and subcommands
- Create your first custom command and try it out
- Join our [Discord community](https://commandcode.ai/discord) for feedback, requests, and support.
