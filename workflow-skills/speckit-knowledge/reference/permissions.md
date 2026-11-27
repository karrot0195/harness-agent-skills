<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Permissions

Permissions decide what Command Code may do **before** it does it. Every tool call - shell, file edit, web fetch, MCP tool, sub-agent - hits one engine that answers one question:

> **allow, ask, or deny?**

New? Read [the one-minute version](#the-one-minute-version) and [common recipes](#common-recipes). For full reference, jump to [how a decision is made](#how-a-decision-is-made) and the [decision table](#the-decision-table).

  Rules are enforced by Command Code, not the model. Your prompt or `AGENTS.md` shapes what the agent *tries*; it doesn't change what's *allowed*. To grant or revoke, use a rule, a mode, or a `PreToolUse` hook.

---

## The one-minute version

Three things cover almost everything.

**1. A mode sets the baseline.** Cycle with **shift+tab**, or switch with **`/mode`**.

The mode and the flag that turns it on are different names - so both columns:

| Mode | How to set it | In one line |
| :--- | :--- | :--- |
| `default` | the default; `/mode:default`, shift+tab | Prompt before anything that changes things. Reads are free. |
| `accept-edits` | `/mode:accept-edits`, shift+tab, `--accept-edits` | Do normal edits (and safe file commands) without asking. |
| `plan` | `/mode:plan`, shift+tab, `--plan` | Read-only. Explore and plan; only the plan file may be written. |
| `yolo` | shift+tab, or `--yolo` / `--dangerously-skip-permissions` to start in it | Permission bypass: do basically everything without asking. |
| `dont-ask` | `"defaultMode": "dont-ask"` in settings, or `--permission-mode dont-ask` | Never ask. Run what's pre-approved; deny the rest. The CI/CD mode. |

`auto-accept` and `bypass` are accepted aliases for `accept-edits` and `yolo` wherever a mode name is typed (settings, flags, `/mode`).

**2. Three rule lists tune it.** Order: `deny` wins, then `ask`, then `allow`.

```json {{ title: '.commandcode/settings.json' }}
{
  "permissions": {
    "deny":  ["Read(secrets/**)"],
    "ask":   ["Shell(git push:*)"],
    "allow": ["Shell(git status:*)", "mcp__github__get_issue"]
  }
}
```

**3. Some things never prompt.** Reads and read-only shell (`ls`, `cat`, `git status`), plus the control-flow tools `ask_user_question`, `agent`, and `run_command`.

  **deny beats ask beats allow, in every mode.** A mode only decides calls the rules leave unresolved. `yolo` still can't run past a `deny` rule, an `ask` rule, or the root/home delete breaker.

---

## Common recipes

Drop any of these into `.commandcode/settings.json` (shared, checked in) or `.commandcode/settings.local.json` (personal, gitignored).

**Read-only git, ask before pushing, block history rewrites:**

```json {{ title: '.commandcode/settings.json' }}
{
  "permissions": {
    "allow": ["Shell(git status:*)", "Shell(git log:*)", "Shell(git diff:*)"],
    "ask": ["Shell(git push:*)", "Shell(git pull:*)"],
    "deny": ["Shell(git push --force*)", "Shell(git reset --hard*)", "Shell(git clean -*)"]
  }
}
```

**Gate secret reads** (free by default - reads are never blocked unless a rule says so):

```json {{ title: '.commandcode/settings.json' }}
{
  "permissions": {
    "ask": ["Read(.env*)"],
    "deny": ["Read(secrets/**)", "Read(~/.ssh/**)"]
  }
}
```

**Protect lockfiles and the git directory:**

```json {{ title: '.commandcode/settings.json' }}
{
  "permissions": {
    "ask": ["Edit(package.json)", "Edit(pnpm-lock.yaml)"],
    "deny": ["Edit(.git/**)", "Edit(.ssh/**)"]
  }
}
```

**Allow one MCP tool, or a whole server:**

```json {{ title: '.commandcode/settings.json' }}
{
  "permissions": {
    "allow": ["mcp__github__get_issue", "mcp__linear__*"]
  }
}
```

**Run unattended (CI/CD)** - never prompt; pre-approve exactly what CI may touch:

```json {{ title: '.commandcode/settings.json' }}
{
  "permissions": {
    "defaultMode": "dont-ask",
    "allow": ["Edit(src/**)", "Write(src/generated/**)"]
  }
}
```

Those edits run silently; anything outside the allowlist is denied. `dont-ask` is a **fail-closed allowlist**, not an auto-edit mode - a wrong call fails instead of hanging on a prompt no one answers.

---

## Permission modes

A mode sets the baseline. Cycle with **shift+tab**, or switch with **`/mode`**.

| Mode          | Meaning                                                                                           |
| :------------ | :------------------------------------------------------------------------------------------------ |
| `default`     | Prompt for anything mutating; reads are free. |
| `accept-edits` | Do normal workspace edits (and safe filesystem shell: `mkdir`, `touch`, `cp`, `mv`, non-recursive `rm`, `rmdir`, `sed`) without asking. Does **not** auto-accept arbitrary shell, MCP tools, or recursive deletes. |
| `plan`        | Read-only exploration. Reads, searches, and read-only shell (`git status`) run; only the plan file may be written. |
| `yolo`        | Permission bypass: do basically everything without asking. Deny rules, explicit ask rules, and the root/home removal breaker still apply. Enter with shift+tab, or `--yolo` / `--dangerously-skip-permissions` to start in it; throwaway environments only. |
| `dont-ask`    | Never ask. Run only what policy already allows (reads, read-only shell, `allow` rules); **deny** the rest. The mirror of yolo: for unattended runs where a wrong prompt should fail, not wait. |

Aliases: `auto-accept` → `accept-edits`, `bypass` → `yolo`. Claude Code's spellings work too: `manual` → `default`, `acceptEdits` → `accept-edits`, `dontAsk` → `dont-ask`, `bypassPermissions` → `yolo`. Legacy `standard` also maps to `default`.

### Switching modes

Three ways, mid-session:

- **shift+tab** cycles `default` → `accept-edits` → `plan` → `yolo` → `default`. (`alt+m` is an equivalent binding for terminals that swallow shift+tab.) `--yolo` also starts a session directly in `yolo`. `dont-ask` isn't a rung - set it via settings or CLI; shift+tab from it re-enters the cycle at `accept-edits`.
- **`/mode`** shows the current mode; **`/mode:default`**, **`/mode:accept-edits`**, **`/mode:plan`** (or `/mode <name>`, any spelling) switch directly. Yolo is deliberately **not** slash-switchable - slash commands are agent-invokable, so a mid-session route into permission bypass would let the model kill its own prompts. `/mode yolo` answers with "press shift+tab to cycle into it, or launch with `--yolo`."
- **CLI flags** pick the start mode:

```bash {{ title: 'Terminal' }}
cmd --permission-mode accept-edits   # default | standard | plan | accept-edits | yolo | dont-ask
cmd --accept-edits                   # shorthand for --permission-mode accept-edits
cmd --plan                          # start in plan mode
cmd --yolo                          # yolo (permission bypass) - alias for --dangerously-skip-permissions; use with care
```

`--permission-mode` wins over `--plan`. In an interactive session, `--permission-mode yolo` starts in permission bypass, same as `--yolo` / `--dangerously-skip-permissions`; the `disableBypass` kill switch covers all three.

Print mode (`-p`) is different. It blocks file writes, file edits, and shell commands unless you pass `--yolo` or `--dangerously-skip-permissions`. `--permission-mode yolo` sets the mode but does not lift that block, so a headless run that needs to change files takes `--yolo`. See [headless permissions](./headless.md#permissions).

A mode switch also answers a prompt already on screen: `accept-edits` or `yolo` **approves** it (you said "stop asking"); `plan` **denies** it. A safety-forced prompt - destructive command, sensitive file, explicit `ask` rule - is never approved this way: `accept-edits` and `yolo` leave it on screen for an explicit answer, and `plan` denies it.

---

## Writing rules

Three lists under `permissions`, checked in order: **deny** (always wins) → **ask** (always prompts, even in yolo; denies in dont-ask) → **allow**. Three tools skip the lists: `ask_user_question` (its UI is the interaction), `agent` (delegation has no side effect), and `run_command` (it just dispatches a slash command you named). Tools a sub-agent calls are still gated.

A rule is a tool name, optionally with a specifier:

```text {{ title: 'Rule shape' }}
Tool                 # the whole tool
Tool(specifier)      # a specific use
```

| Rule                              | Effect                                             |
| :-------------------------------- | :------------------------------------------------- |
| `Shell`                           | Every shell command                                |
| `Shell(git status)`               | `git status` (and `git status --short`)            |
| `Shell(npm run *)`                | Any `npm run …` command                            |
| `Read(./.env)`                    | Reading `.env` in the project root                 |
| `Edit(src/**)`                    | Edits anywhere under `src/`                         |
| `WebFetch(domain:example.com)`    | Fetches to `example.com`                           |
| `mcp__github__get_issue`          | One tool from the `github` MCP server              |
| `mcp__github__*`                  | Every tool from the `github` server                |
| `mcp__github__get_*`              | Every `get_` tool from the `github` server         |
| `mcp__*`                          | Every tool from every MCP server                   |
| `*`                               | Every tool                                         |
| `Shell(run_in_background:true)`   | A shell command run in the background              |

Tool names are case-insensitive. `Tool()` and `Tool(*)` both mean the whole tool.

### Wildcards

A `*` in a **tool name** (not a specifier) matches by name:

- `*` - every permission-gated tool (`ask_user_question`, `agent`, `run_command` stay allowed).
- `mcp__*` - every tool from every MCP server.
- `mcp__github__get_*` - every read-style tool from one server.
- `edit_*` - every tool whose name starts with `edit_`.

Tool-name wildcards work in `deny` and `ask` (`deny: ["mcp__*"]` blocks all MCP tools). They're **ignored in `allow`** unless the server is named (`mcp__github__get_*` is fine; a bare `*` or `mcp__*` is not) - an allow rule should say what it grants, not hand out everything. Specifier wildcards (`Shell(npm *)`, `Edit(src/**)`, `WebFetch(domain:*.example.com)`) work everywhere.

### Match by input parameter

A `deny` or `ask` rule can gate on one **top-level input parameter** with `Tool(param:value)`:

- `Shell(run_in_background:true)` - a background shell command.

The value takes a `*` wildcard; a parameter the model **omits** never matches. One parameter per rule - to gate two, write two rules.

Parameter matching is **deny/ask only** - an allow rule for one parameter can't prove the whole call is safe. The fields a tool already matches with its own syntax - `command` (Shell), `file_path` (Read/Edit/Write), `path` (Grep/Glob), `notebook_path`, `url` (WebFetch) - are **not** parameter-matchable; use the specifier (`Shell(rm *)`, not `Shell(command:rm *)`).

### Tool names

Use the friendly names, or the exact tool names the model sees:

| Friendly     | Covers                                                        |
| :----------- | :----------------------------------------------------------- |
| `Shell`      | `shell_command`, `monitor_command`, `kill_shell`             |
| `Read`       | `read_file`, `read_directory`, `glob`, `grep` |
| `Edit`       | `edit_file`, `write_file`                     |
| `Write`      | `write_file`                                                 |
| `WebFetch`   | `web_fetch`                                                  |
| `WebSearch`  | `web_search`                                                 |

  `Shell` is the name, because the shell tool is `shell_command`. `Bash(...)` is a legacy alias for `Shell(...)` so old configs keep working - but use `Shell`.

### Shell patterns

Shell specifiers take `*` wildcards:

- `Shell(npm run build)` - exact command.
- `Shell(npm run *)` - any command starting with `npm run `.
- `Shell(git * main)` - `git checkout main`, `git merge main`, …
- `Shell(git:*)` - the `:*` suffix is a trailing wildcard, same as `Shell(git *)`.

The space matters: `Shell(ls *)` matches `ls -la` but not `lsof`; `Shell(ls*)` matches both.

Command Code parses shell operators, so `Shell(git status)` does **not** grant `git status && rm -rf .`. Every subcommand of a compound command (`&&`, `||`, `;`, `|`, `&`, newlines) must match on its own.

### File-path patterns

`Read` and `Edit` use gitignore-style matching with four anchors:

| Pattern        | Anchored at                          | Example                        |
| :------------- | :----------------------------------- | :----------------------------- |
| `//path`       | Filesystem root                      | `Read(//etc/**)`               |
| `~/path`       | Home directory                       | `Edit(~/.config/**)`           |
| `/path`        | Project root                         | `Edit(/src/**)`                |
| `path`         | Any depth under the project          | `Read(.env)` ≡ `Read(**/.env)` |

`*` matches within one path segment; `**` crosses directories. For a symlink, both link and target are checked. A trailing slash can't dodge an exact-path rule (`read_directory /repo/secrets/` still matches `Read(//repo/secrets)`).

  Reads are allowed by default. `allow: ["Read(src/**)"]` is accepted but does **not** block reads outside `src/**` - use `ask`/`deny` for sensitive reads. A strict read allowlist would be a separate change (see [Known limits](#known-limits)).

### Aggressive deny, conservative allow

The lists are matched differently on purpose - failing toward a prompt is the safe direction:

- **Deny and ask match aggressively.** They see through leading env vars (`FOO=bar rm -rf x` matches `Shell(rm *)`), process wrappers (`timeout 30 …`, `nice …`), and every subcommand; an unparseable command is matched against the raw string; path matching folds case (on macOS/Windows `.ENV` opens `.env`) and fires when either the path or its symlink target matches.
- **Allow matches conservatively.** No env stripping (`PATH=/tmp git status` does **not** match `Shell(git status:*)`); a compound command allows only when *every* subcommand matches; an unparseable command never auto-allows; path matching is case-exact and needs **both** the path and its symlink target to match.

### MCP and sub-agents

MCP tools are keyed by their canonical `mcp__server__tool` name - display names are never keys. `mcp__github` and `mcp__github__*` both match the whole `github` server; `mcp__github__get_*` matches its `get_` tools; `mcp__*` (deny/ask only) matches every server.

The `agent` tool is always allowed and never prompts. A sub-agent runs the **same ordered pipeline** as the main loop, with one difference: where the main loop would draw an interactive prompt, the sub-agent policy **auto-allows** - it runs autonomously, with no human to answer. The hard guards hold: a sub-agent can't run a tool your `deny` rules block, can't write in plan mode, and anything the main loop would prompt on for **safety** - destructive command, sensitive file, outside-workspace write, explicit `ask` rule - fails **closed** (denied).

---

## What happens at a prompt

Every prompt offers three choices: allow once, allow **and remember**, or deny with feedback. The remembered scope matches the subject:

- **File ops** - *"Yes, allow all edits this session"* turns on accept edits for the session (same as shift+tab).
- **Shell** - *"Yes, don't ask again for `git` commands in this project"* persists a `Shell(git:*)` allow rule to project settings. For a compound command, one rule per non-read-only base. Bases that run arbitrary code (`bash`, `python`, `curl`, …) persist the exact command, not a prefix.
- **MCP / other** - *"Yes, don't ask again for `mcp__server__tool` in this project"* persists the tool name to project settings.

### Command explanations on demand

The shell prompt can explain the command: press **ctrl+e** (**ctrl+y** in VS Code-family terminals, where the IDE grabs ctrl+e) and a background model call summarizes it inline. Governed by the `on-demand-tool-descriptions` setting (**on by default**): explanations only when asked. Turn it off (via `/config`) to generate every one upfront.

---

## Safety behaviors

Some prompts are forced by a safety check, not a mode or rule. They offer only one-time **Yes**/**No**, plus a banner naming the check. Session and project choices are hidden on purpose - destructive-command, sensitive-path, outside-workspace, and explicit `ask` approvals are never cached, so the next risky call asks again. To stop a recurring one, add a content-specific allow rule (e.g. `Edit(.commandcode/settings.json)`).

### The root/home removal circuit breaker

The **only** built-in safety prompt that survives `yolo`: a removal of the filesystem root or your home dir - `rm -rf /`, `rm -rf ~`, `rm -rf $HOME` - always stops for confirmation, in every mode that can ask (`dont-ask` and `plan` deny instead).

Spoof-resistant. It catches removals through env-var prefixes, process wrappers (`timeout`, `nice`, …), compound commands, quoted payloads (`bash -c "rm -rf /; echo ok"`), command substitution (`echo $(rm -rf /;)`), glued separators (`/;`), and `$HOME`/`${HOME}` spellings (quoted or not, with `/` or `/*` suffixes - `$HOMEDIR` stays literal).

### Recursive deletes prompt under accept edits

The `accept-edits` safe-filesystem fast path refuses `rm -r/-R/-rf/--recursive` (and `find … -delete`): `rm -rf dist` prompts exactly as in `default`. Plain single-file `rm` stays fast. Deliberate, safe direction: accepting edits isn't accepting bulk irreversible deletion. A content-specific allow rule (`Shell(rm -rf dist)`) still auto-allows, and `yolo` runs it.

### Sensitive writes

Writing any of these prompts in `default` and `accept-edits` unless a content-specific allow rule opts in (`yolo` skips this gate):

```text {{ title: 'Sensitive paths (prompt on write)' }}
Secret material:      .env, .env.*, *.pem, *.key, id_rsa, id_ed25519, credentials
Persistence vectors:  .bashrc, .zshrc, .profile, .gitconfig, .gitmodules, .mcp.json, …
Control surfaces:     .git/**, .ssh/**, .aws/**, .gnupg/**, .kube/**, .vscode/**, .idea/**,
                      .husky/**, .devcontainer/**, node_modules/.bin/**, .commandcode settings
```

A "content-specific" allow rule must name the path (`Edit(.env.local)`) - a bare whole-tool allow (`Edit`) won't wave a call past a safety check.

  Sensitive **reads** through file tools don't prompt. Reading `.env` is allowed by default. Gate it with a rule: `ask: ["Read(.env*)"]` or `deny: ["Read(.env*)", "Read(secrets/**)"]`. The read-only **shell** fast path is stricter: `cat .env` or `head id_rsa` falls out and prompts.

### External directories

Outside-workspace reads, writes, and shell working dirs first ask to admit the directory into the session's root set - the same grant as `/add-dir` or `permissions.additionalDirectories` - then the normal mode rule applies.

- `yolo` grants the directory silently; `dont-ask` denies unless it's pre-approved in settings.
- The **OS temp dir** (`/tmp`, `$TMPDIR`, `os.tmpdir()`) is granted silently in every mode - temp files are disposable, so asking to "extend access" to the machine's own temp dir is friction, not protection. Reads run prompt-free; writes skip the escalation but still confirm like any workspace write (sensitive names like `/tmp/.env` still force the prompt). `deny`/`ask` rules still outrank the grant, and a symlink resolving outside temp takes the normal gate.
- Approving an `ask` rule on an outside path **also grants the directory**, so the tool-level backstop never rejects a call you just approved.
- **Registered skill directories** are readable without a grant (skill resources live outside the workspace by design). Writes into them still gate.
- **Plan-file writes are exempt in plan mode** - the mode's sanctioned output.
- Absolute paths **inside a shell command string** are *not* external-dir gated - a command arg isn't a reliable file boundary. Use shell `ask`/`deny` rules.

### Disabling yolo (permission bypass)

Set `permissions.disableBypass` to `"disable"` (or `true`) to make yolo unenterable. Enforced at every layer: the engine evaluates a requested `yolo` as `default`, and the CLI neutralizes `--dangerously-skip-permissions` (and `--yolo`) at entry, so the TUI mode cycle and stored auto-approve decisions can't silently answer prompts as if yolo were live. Best set in the user-global file a project can't edit.

---

## How a decision is made

Every tool call falls through one fixed ladder. First rung that matches wins:

```
       tool call
           │
           ▼
   1  deny rules ───────────► DENY
           │                  (even yolo)
   2  ask rules ────────────► ASK
           │                  (even yolo)
   3  outside workspace? ───► ASK to admit
           │
   4  plan mode + mutates? ─► DENY
           │
   5  taste-dir write ──────► redirect
           │
   6  malformed write ──────► DENY
           │
   7  read-only? ───────────► ALLOW
           │                  (every mode)
   8  rm -rf / ~ $HOME ─────► ASK
           │                  (even yolo)
   9  yolo mode? ───────────► ALLOW
           │
  10  sensitive write? ─────► ASK
           │
  11  allow rules ──────────► ALLOW
           │
  12  accept edits + in ws? ─► ALLOW
           │
           ▼
       ASK   (DENY in dont-ask)
```

Read that top to bottom and two things fall out. **Deny beats ask beats allow**, in every mode. And `yolo` sits at rung 9, *after* your rules, the external-directory gate, and the circuit breaker, so `--yolo` skips ordinary prompts and the sensitive-write prompt, but never your explicit rules and never the root/home breaker.

The long form of each rung:

1. **Deny rules** - blocked in every mode, including yolo.
2. **Ask rules** - always prompt, even under yolo. In `dont-ask` the would-be prompt becomes a deny.
3. **External-directory gate** - a read, write, or shell cwd **outside the workspace** first asks to admit the directory (like `/add-dir` / `permissions.additionalDirectories`); then the normal mode rule applies. Yolo grants silently. The **OS temp dir** (`/tmp`, `$TMPDIR`, `os.tmpdir()`) is granted silently in every mode - reads never prompt, writes skip the escalation but follow the normal mode rule. Skill dirs are readable without a grant; plan-file writes in plan mode skip this gate.
4. **Plan mode gate** - operation-based: reads, searches, read-only shell run; everything that writes or mutates is denied. The only write allowed is a plan file under `~/.commandcode/plans/`.
5. **Taste-directory writes** - a product-workflow guard (allowed when taste learning is on, else redirected to the `taste` tool); not a safety prompt, so yolo skips it.
6. **Malformed writes** - a write/edit with no resolvable file path is denied up front with a correction.
7. **Read-only fast path** - reads and read-only shell (`ls`, `cat`, `grep`, `echo`, `head`, …) run without a prompt, every mode. A compound command counts when **every** part is read-only and nothing redirects - `cat file | head -5 || echo none` is free. A read-only command aimed at secret material (`cat .env`, `head id_rsa`) falls out and prompts.
8. **Root/home removal circuit breaker** - `rm -rf /`, `rm -rf ~`, `rm -rf $HOME` and spoofed variants **ask even under yolo** (deny in `dont-ask`/`plan`).
9. **Yolo (permission bypass)** - everything past the gates above auto-allows.
10. **Sensitive-write ask** - writing a secret file, a persistence vector (`.bashrc`, `.gitconfig`, …), or a control surface (`.git/**`, `.ssh/**`, `.commandcode` settings) prompts in `default` and `accept-edits` unless a content-specific allow rule opts in.
11. **Allow rules** - pre-approved calls run without a prompt.
12. **Accept-edits fast path** - in `accept-edits`, file edits and safe filesystem commands inside the workspace run without a prompt. Recursive deletes excluded - they still prompt.
13. Otherwise, **ask** - and in `dont-ask`, **deny**.

  Every policy denial (deny rule, mode gate, malformed input) carries guidance the model can act on, and the turn continues. Only a **human** "no" ends the turn.

---

## The decision table

The full matrix - every operation against every mode. Authoritative; the tests pin each row.

| Operation | `default` | `accept-edits` | `plan` | `yolo` | `dont-ask` | Why |
|---|---|---|---|---|---|---|
| Matches `deny` rule | deny | deny | deny | deny | deny | Deny rules win. `ask_user_question`, `agent`, `run_command` are unconditional exceptions. |
| Matches `ask` rule | ask | ask | ask | ask | deny | Ask survives yolo; `dont-ask` can't prompt. Same three tools exempt. |
| Matches `allow` rule | allow | allow | allow if plan-compatible | allow | allow | Honored after deny/ask and mode gates. |
| Direct file read/search inside workspace | allow | allow | allow | allow | allow | Reads are free unless rules say otherwise. |
| Direct file read/search outside workspace | ask external-dir, then allow | ask external-dir, then allow | ask external-dir, then allow | allow | deny unless pre-approved | Outside dirs gated separately, then reads allowed. |
| Read under the OS temp dir (`/tmp`, `$TMPDIR`) | allow (dir granted silently) | allow (dir granted silently) | allow (dir granted silently) | allow | allow | Disposable working data - escalation skipped. Deny/ask still outrank; a symlink resolving outside temp takes the normal gate. |
| Write under the OS temp dir | ask like a workspace write | allow; sensitive still asks | deny | allow | deny unless allow rule | No escalation, then the normal mode edit/write rule (sensitive names like `/tmp/.env` still force the prompt). |
| Read under a registered skill dir | allow | allow | allow | allow | allow | Skill resources readable without a grant; writes into skill dirs still gate. |
| Web / read-only native tool | allow | allow | allow | allow | allow | Non-filesystem read-only tools are free unless rules say otherwise. |
| `ask_user_question` | allow | allow | allow | allow | allow | Asking the user is the interaction; no prompt may stack in front of it. |
| `agent` | allow | allow | allow | allow | allow | Delegation is always allowed. Every sub-agent tool is still checked. |
| `run_command` | allow | allow | - | allow | allow | Dispatches a slash command you named - removed in plan mode (a write tool), never granted to sub-agents. |
| Read-only shell, e.g. `git status`, `cat README.md \| head -5` | allow | allow | allow | allow | allow | Plan may explore with read-only shell. Compound qualifies when every part is read-only and nothing redirects. Shell cwd follows the external-dir row. |
| Secret-looking read via a file tool, e.g. `read_file .env` | allow | allow | allow | allow | allow | Reads free by default; no built-in secret-read prompt for file tools. Use `ask`/`deny`. |
| Secret-looking read via shell, e.g. `cat .env` | ask | ask | deny | allow | deny unless allow rule | A read-only shell command with a secret arg (`.env`, `id_rsa`, `*.pem`) falls out of the fast path. |
| Workspace file edit | ask | allow | deny | allow | deny unless allow rule | `accept-edits` accepts normal edits; `dont-ask` runs only pre-approved edits. |
| Protected workspace write, e.g. `.env` or `.git/config` | ask | ask | deny | allow | deny unless pre-approved | Yolo skips normal write-risk prompts; accept edits doesn't. |
| Direct file write outside workspace | ask external-dir, then ask edit/write | ask external-dir, then allow normal edit/write; sensitive still asks | deny, except plan-file writes | allow | deny unless pre-approved | External-dir gate first, then the mode edit/write rule. |
| Plan file write under `~/.commandcode/plans/` | ask like outside write | ask external-dir, then allow | allow (no external-dir prompt) | allow | deny unless pre-approved | Plan mode's sanctioned output; never gated in plan mode. |
| Safe filesystem shell inside workspace: `mkdir`, `touch`, `cp`, `mv`, non-recursive `rm`, `rmdir`, `sed` | ask | allow | deny | allow | deny unless allow rule | Accepting edits extends to safe filesystem commands on non-sensitive workspace targets. Recursive `rm` excluded. |
| Shell cwd outside workspace | ask external-dir, then apply shell rule/mode | ask external-dir, then apply shell rule/mode | ask external-dir for read-only shell; deny mutating shell | allow | deny unless pre-approved | The shell working dir is external-dir gated. |
| Shell command args outside workspace | shell rule/mode | shell rule/mode | shell rule/mode | allow | shell rule/mode | Path args inside a command string are never external-dir gated; use shell `ask`/`deny` rules. |
| Other mutating shell | ask | ask | deny | allow | deny unless allow rule | Governed by shell rules and the active mode. |
| MCP / custom side-effecting or unknown tool | ask | ask | deny | allow | deny unless allow rule | Unknown side effects prompt unless yolo or an explicit rule. |
| Root/home removal, e.g. `rm -rf /` or `rm -rf ~` | ask | ask | deny | **ask** | deny | The circuit breaker survives yolo. |
| Recursive workspace delete, e.g. `rm -rf dist` | ask | ask | deny | allow | deny unless allow rule | Recursive deletes prompt outside yolo. A content-specific allow rule (`Shell(rm -rf dist)`) still auto-allows. |

Reading a column: a mode only changes calls the rules leave **unresolved**. `deny` and `ask` behave the same in every interactive mode; `dont-ask` turns every would-be ask into a deny; `yolo` auto-allows everything but deny rules, ask rules, and the breaker.

---

## Settings reference

Rules live under `permissions` in `.commandcode/settings.json` (shared, checked in) or `.commandcode/settings.local.json` (personal, gitignored). Interactive approvals write to `settings.json` normally, and to `settings.local.json` when started with `--local`:

```json {{ title: '.commandcode/settings.json' }}
{
  "permissions": {
    "defaultMode": "default",
    "allow": [
      "Shell(git status:*)",
      "Shell(git log:*)",
      "Shell(npm run *)",
      "mcp__github__get_issue"
    ],
    "ask": [
      "Shell(git push:*)",
      "Read(.env*)"
    ],
    "deny": [
      "Shell(git reset --hard*)",
      "Read(secrets/**)",
      "Edit(.git/**)"
    ],
    "additionalDirectories": ["~/shared-libs"],
    "disableBypass": "disable"
  }
}
```

- **`defaultMode`** - the start mode (`default`, `accept-edits`, `plan`, `yolo`, `dont-ask`; `auto-accept` and `bypass` are accepted aliases, as are `acceptEdits` and legacy `standard`).
- **`allow` / `ask` / `deny`** - rule lists. They **accumulate across settings files**: a `deny` in your user-global settings can't be erased by a project file.
- **`additionalDirectories`** - extra dirs that count as inside the workspace for reads and writes (same accumulation).
- **`disableBypass`** - `"disable"` (or `true`) makes yolo (permission bypass) unenterable.

### Precedence

Denied at any level, allowed at none. A managed or user-global `deny` beats a project `allow`; deny beats ask; ask beats allow. Specificity doesn't reorder anything - a broad `deny` still blocks a narrower `allow`.

---

## Design decisions

The reasoning behind the behavior, so you don't reverse-engineer it:

1. **Rules over a hardcoded safety matrix.** No built-in `.env` file-read prompt, no yolo-surviving recursive-delete prompt. Sensitive reads are a rules concern (`ask`/`deny`), so each project decides what's sensitive. One carve-out: the read-only **shell** fast path screens secret args, so `cat .env` prompts instead of riding `cat`'s free pass.
2. **One ordered pipeline.** The order in [How a decision is made](#how-a-decision-is-made) is the spec; tests pin it.
3. **Asymmetric matching.** Deny/ask aggressive, allow conservative. Failing toward a prompt is the safe direction.
4. **External directories are a separate gate**, before the mode rule, with skill read roots and plan-file writes exempted where the mode sanctions them.
5. **The circuit breaker survives yolo and is spoof-resistant.**
6. **`disableBypass` is enforced at every layer** - engine, CLI entry, TUI mode cycle, decision store.
7. **Shell command args aren't a file boundary.** Absolute paths in a command string follow shell rules and the mode, not the file-tool boundary.
8. **Generic tools get a real prompt.** MCP/custom tools render a generic permission prompt, not a fake file-edit prompt.
9. **Recursive deletes prompt under accept edits.** Safe direction: bulk irreversible deletion isn't an edit.
10. **Policy denials guide the model; only human vetoes end the turn.** Every engine denial carries actionable guidance, so the model adapts and the turn continues.

---

## Known limits

Documented edges of the current engine:

- **Wildcard patterns in a multi-file `read_file` call expand inside the tool**, so an exact-file deny rule (`Read(.env)`) can't match a wildcard entry (`*.env`) before expansion. Directory-tree rules (`Read(//etc/**)`) still cover this, because the call's `target_directory` (or the first absolute entry) is matched as a touched path.
- **No strict read allowlist.** `allow: ["Read(src/**)"]` doesn't deny reads outside `src/**` - reads are free by default; only `ask`/`deny` restrict them. A deny-everything-not-listed read mode is out of scope as a separate change.
- **Shell path args aren't external-dir gated.** `cat /outside/file` follows shell rules and the mode, not the workspace boundary. Gate it with `deny: ["Shell(cat /outside/*)"]`-style rules.
- **An allow rule never matches an opaque command.** If the parser can't fully understand a command, it can still be deny/ask-matched against the raw string, but never auto-allows - it prompts.
- **Parameter rules only see parameters the model sends.** An omitted parameter never matches.

---

## See also

- [Plan Mode](./plan-mode.md) - read-only exploration and planning.
- [Hooks](./hooks.md) - run your own scripts to allow, deny, or audit tool calls at runtime.
- [MCP](./mcp.md) - connect external tools the engine gates by server and tool name.
