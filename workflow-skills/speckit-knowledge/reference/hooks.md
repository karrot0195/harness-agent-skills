<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Hooks

Hooks are shell scripts that Command Code runs automatically before and after each tool call. They give you deterministic control over Command Code's behavior. Use hooks to enforce project rules, audit tool use, and integrate Command Code with workflows you already have.

---

## What are hooks?

Hooks fire before a shell command runs, before a file read, and after a write. Each hook receives the tool's inputs as JSON on stdin and returns one of four actions: allow, deny, halt the session, or inject extra context for the next turn.

---

## What you can do with hooks?

With hooks configured, you can:

- **Block dangerous bash commands** before they execute, so `rm -rf /` never makes it past a policy guard.
- **Inject project-specific context** when the agent reads sensitive files, nudging the model to redact secrets.
- **Audit every write to the disk** by forwarding file paths to a local log.
- **Halt the session** if a tool's output leaks sensitive information.

---

## Supported events

| **Event** | **Fires** | **Can block?** |
| --------- | --------- | -------------- |
| `PreToolUse` | Before a tool runs | Yes (denies the tool) |
| `PostToolUse` | After the tool returns | No (advisory) |
| `Stop` | When the assistant finishes a turn | Yes (forces a revision, capped at 3 retries) |
| `SessionStart` | When a session begins (startup, resume, clear) | No (injects context only) |

  Need to react to more of the session lifecycle, like sub-agent activity, custom tools, or other moments beyond these four events? That's what [mods](https://commandcode.ai/docs/mods) are for.

---

## Supported tools

| **Tool** | **Matcher literal** | **What it covers** |
| -------- | ------------------- | ------------------ |
| Shell | `shell` | Shell command execution |
| Read | `read` | File reads |
| Write | `write` | File creation or full overwrite |
| Edit | `edit` | In-place edits to an existing file |

For `matcher` syntax (regex, case-insensitivity, matching multiple tools), see [Settings schema](#settings-schema).

---

## How hooks work

A hook is any executable that reads a JSON payload on stdin and writes a JSON object on stdout. Write one in bash, Node.js, Python, or anything that can parse JSON.

1. **Event fires**: Command Code is about to run (or has just run) a tool.
2. **Hook triggered**: Command Code spawns your executable and writes the tool's details as JSON on its stdin.
3. **Hook responds**: Your executable writes a JSON response to stdout to allow, deny, inject context, or halt the session.

For the stdin and stdout schema, exit codes, environment variables, and execution semantics, see the [reference sections](#settings-schema) below.

---

## Quickstart

This quickstart wires up your first hook in Command Code.

### 1. Create the settings file

Create `.commandcode/settings.json` at the root of your project and paste in the snippet below. The `PreToolUse` hook triggers before every shell command and prints a message.

**`.commandcode/settings.json`**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "shell",
        "hooks": [
          { "type": "command", "command": "echo '{\"systemMessage\":\"hook fired\"}'" }
        ]
      }
    ]
  }
}
```

The `command` field is what Command Code runs when the hook fires. Here it prints a JSON object with a `systemMessage` field, and Command Code surfaces that message when running shell commands.

### 2. Try it out

Hooks initialize on startup. Restart Command Code with `cmd`, then run a prompt such as `Use the shell tool to list the files in the current directory`. The message `PreToolUse: hook fired` should appear before the shell command executes.

The quickstart hook emits a static message. Real hooks parse the JSON payload on stdin and return results, halt sessions, or inject context for the next turn - read on for configuration, the full schema, examples, and best practices.

---

## Configuration

Hooks are configured under the `hooks` key in a `settings.json` file. Command Code looks for settings.json in the following paths:

| **Scope** | **Config file** | **Applies to** | **Committed to git?** |
| --------- | --------------- | ----------------- | --------------------- |
| User | `~/.commandcode/settings.json` | Across all projects | No |
| Project | `.commandcode/settings.json` | Anyone using the project | Yes |

**Precedence:** project > user.
When the exact same command string appears in multiple scopes, the higher-priority source wins.

### Ordering

Within the same event, hooks fire in the order they appear in `settings.json` (project first, then user).

For example, `PreToolUse` hooks run sequentially. As soon as one blocks the tool, the remaining `PreToolUse` hooks are skipped. `PostToolUse` hooks run in parallel because the tool has already finished.

You can wire multiple hooks under a single matcher. They run in listed order:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "shell",
        "hooks": [
          { "type": "command", "command": "./.commandcode/hooks/guard-bash.sh", "timeout": 5 },
          { "type": "command", "command": "./.commandcode/hooks/log-shell.sh" }
        ]
      }
    ]
  }
}
```

Here `guard-bash.sh` runs first. If it denies, `log-shell.sh` is skipped.

For a complete `settings.json` wiring multiple matchers across both events, see [Example settings.json](#example-settingsjson).

---

## Settings schema

Hooks are configured under the `hooks` key in `settings.json`. Each event array has two levels of nesting: a **`HookDefinition`** picks which tools the hook applies to (via `matcher`), and a **`HookEntry`** is the handler that runs them.

```text
settings.json
└── hooks
    └── <EventName>
        └── [ HookDefinition ]
            │   matcher: which tools
            └── hooks: [ HookEntry ]
                    type · command · timeout
```

One `HookDefinition` can own multiple `HookEntry` handlers. They all run for the same matcher, in the order listed.

### Hook Definition fields (outer)

Chooses which tools this group of handlers applies to.

| **Field** | **Required** | **Type** | **Description** |
| --------- | ------------ | -------- | --------------- |
| `matcher` | Optional | `string` | Omit to match every tool. Examples: `"shell"`, `"write\|edit"`. Only meaningful for the tool events (`PreToolUse`, `PostToolUse`). `Stop` and `SessionStart` carry no tool, so a `matcher` there never matches and the hook **will not fire** - omit it for those events. |
| `hooks` | Required | `array` | One or more handlers. Runs in the order listed |

### HookEntry fields (inner)

Describes a single handler to execute.

| **Field** | **Required** | **Type** | **Description** |
| --------- | ------------ | -------- | --------------- |
| `type` | Required | `string` | Handler kind. Supports `command` adapter only  |
| `command` | Required when `type: "command"` | `string` | Shell command to execute |
| `timeout` | Optional | seconds | Defaults to `30`, maximum `600` |

### Example settings.json

In the example below, the `PreToolUse` hook scopes a 10-second guard to shell and write tool calls. The `PostToolUse` hook omits `timeout` (defaults to 30s) and audits every tool after it runs.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "shell|write",
        "hooks": [
          {
            "type": "command",
            "command": "./.commandcode/hooks/guard-tools.sh",
            "timeout": 10
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "./.commandcode/hooks/audit.sh"
          }
        ]
      }
    ]
  }
}
```

---

## Hook input (stdin)

Before your hook runs, Command Code writes a single JSON object to its stdin. Read stdin to the end, parse it as JSON, then write your response to stdout.

### Common fields

Present on all events.

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| `session_id` | `string` | Session identifier, stable for the lifetime of one CLI session |
| `transcript_path` | `string` | Absolute path to this session's transcript JSONL |
| `cwd` | `string` | Absolute working directory at fire time |
| `hook_event_name` | `string` | The event that fired the hook. |
| `permission_mode` | `"default" \| "auto-accept" \| "plan" \| "bypass" \| "dont-ask" \| ""` | Current [permission mode](#permission-modes). Empty when no mode applies. |

### Tool-call fields

Present on every event tied to a tool call.

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| `tool_use_id` | `string?` | Stable tool invocation id. Present on every real tool call |
| `tool_name` | `string` | Canonical tool id (`shell_command`, `read_file`, `write_file`, `edit_file`) |
| `tool_display_name` | `string` | One of `SHELL`, `READ`, `WRITE`, `EDIT`. The value `matcher` is tested against |
| `tool_input` | `object` | Tool arguments as emitted by the model. Shape depends on the tool, see below |

#### `tool_input` fields

The shape of `tool_input` depends on which tool fired. Hooks read these fields to inspect a call. Example, a shell guard checks `tool_input.command`, a write audit reads `tool_input.file_path`.

| **Tool** | **fields** |
| -------- | ----------------------- |
| `shell_command` | `command: string`, `args?: string[]`, `directory?: string`, `timeout?: number` |
| `read_file` | `absolute_path: string`, `offset?: number`, `limit?: number` |
| `write_file` | `file_path: string`, `content: string` |
| `edit_file` | `file_path: string`, `old_value: string`, `new_value: string`, `replacement_count?: number`, `replace_all?: boolean` |

### Event-specific fields

An event may add its own fields on top of the common and tool-call sets. New events are introduced over time; each one appears as a subsection below.

#### PostToolUse

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| `tool_response` | `string` | Output of the tool, the same text the model will see |

#### Stop

`Stop` fires when the assistant produces its final response with no remaining tool calls (end of turn). It carries no tool fields - omit `matcher` on `Stop` hooks (a `matcher` here prevents the hook from firing). It provides only the common fields plus:

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| `stop_hook_active` | `boolean` | `true` when this fire is itself the retry caused by a previous Stop hook returning `decision: "block"` or exit `2`. Hook authors check this and exit `0` to bail out of retry loops |

#### SessionStart

`SessionStart` fires once when a session begins. It carries no tool fields - omit `matcher` on `SessionStart` hooks (a `matcher` here prevents the hook from firing). It provides only the common fields plus:

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| `source` | `"startup" \| "resume" \| "clear"` | Why the session started: a fresh launch, an existing session reopened, or the conversation cleared |

---

## Environment variables

Command Code injects four environment variables into every hook process.

| **Variable** | **Value** |
| ------------ | --------- |
| `COMMANDCODE_PROJECT_DIR` | Absolute path to the project (same as `cwd`) |
| `COMMANDCODE_SESSION_ID` | Session ID, useful for correlating hooks to a run |
| `COMMANDCODE_HOOK_EVENT` | `PreToolUse`, `PostToolUse`, `Stop`, or `SessionStart` |
| `COMMANDCODE_CWD` | Alias of `COMMANDCODE_PROJECT_DIR` with the identical value |

Your environment variables are forwarded to hook processes with any sensitive variable being stripped out.

---

## Hook output (stdout)

The hook's executable writes a single JSON object to stdout. All fields are optional. Empty stdout on exit `0` means "no opinion, allow".

### Common output fields

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| `continue` | `boolean` | `false` halts the session after the current tool batch. Pair with `stopReason` |
| `stopReason` | `string` | User-facing message shown in the TUI when `continue: false`. Not sent to the model |
| `suppressOutput` | `boolean` | When `true`, omit the hook's parsed output from the audit log |
| `systemMessage` | `string` | Free-text notice surfaced in the TUI feed. Not sent to the model |

### PreToolUseOutput fields

Adds a `hookSpecificOutput` object on top of the common fields.

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| `hookSpecificOutput.hookEventName` | `"PreToolUse"` | Optional. Helps user distinguish the PreToolUse shape; the engine already knows which event fired |
| `hookSpecificOutput.permissionDecision` | `"allow" \| "deny"` | `"deny"` blocks the tool. Omit or `"allow"` to permit |
| `hookSpecificOutput.permissionDecisionReason` | `string` | Shown to the model when denying. Use this to teach the model not to retry |
| `hookSpecificOutput.additionalContext` | `string` | Appended to the tool result before the model's next turn |

Full shape:

```json
{
  "continue": true,
  "suppressOutput": false,
  "stopReason": "",
  "systemMessage": "",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "",
    "additionalContext": ""
  }
}
```

### PostToolUseOutput fields

Adds top-level `decision` / `reason` and a smaller `hookSpecificOutput`.

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| `decision` | `"block"` | Advisory retry signal to the model. The tool already ran, so nothing is un-done |
| `reason` | `string` | Pairs with `decision: "block"` |
| `hookSpecificOutput.hookEventName` | `"PostToolUse"` | Optional. Helps readers distinguish the PostToolUse shape; the engine already knows which event fired |
| `hookSpecificOutput.additionalContext` | `string` | Appended to the tool result before the model's next turn |

Full shape:

```json
{
  "continue": true,
  "suppressOutput": false,
  "stopReason": "",
  "systemMessage": "",
  "decision": "block",
  "reason": "",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": ""
  }
}
```

### StopOutput fields

`Stop` uses only top-level fields, with no `hookSpecificOutput`.

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| `decision` | `"block"` | Prevents the assistant from finishing. The agent loop runs one more iteration. Capped at 3 retries per turn |
| `reason` | `string` | Shown to the user, and fed to the model on retry, wrapped in framing so it reads as revision feedback. For raw diagnostics the model treats like tool output, use `exit 2` + stderr |

Full shape:

```json
{
  "continue": true,
  "suppressOutput": false,
  "stopReason": "",
  "systemMessage": "",
  "decision": "block",
  "reason": ""
}
```

### SessionStartOutput fields

`SessionStart` is non-blocking: it has no top-level `decision` / `reason` and never halts, retries, or denies. It carries the universal fields plus a `hookSpecificOutput` block for injecting context.

| **Field** | **Type** | **Description** |
| --------- | -------- | --------------- |
| `hookSpecificOutput.hookEventName` | `"SessionStart"` | Optional. Helps readers distinguish the SessionStart shape; the engine already knows which event fired |
| `hookSpecificOutput.additionalContext` | `string` | Injected into the session's first user turn, so the model sees it before it starts work |

When several SessionStart hooks return `additionalContext`, the values are joined and injected together.

Full shape:

```json
{
  "suppressOutput": false,
  "systemMessage": "",
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": ""
  }
}
```

#### Loop prevention

A naive Stop hook that always returns `decision: "block"` would loop forever. Two safety layers:

1. **`stop_hook_active`** on input is `true` on the retry fire. Hook authors should `exit 0` when they see it.
2. **Hard cap** of 3 retries per turn enforced by the engine. After the cap, the turn ends with a `Stop hook retry cap reached (3)` line that names the offending script so you can fix or disable it.

```bash
# canonical Stop hook skeleton
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0  # Already retrying, let the turn end
fi
# ... your check here ...
```

#### Feeding text to the model on retry

Both retry triggers feed text to the model before the next turn. The conversation can't end on an assistant turn, so a retry always carries a user-role message:

- **`decision: "block"` + `reason`**: `reason` is wrapped in framing ("a Stop hook asked you to revise…") so the model treats it as revision feedback on its previous response, not a fresh request.
- **`exit 2` + stderr**: the full stderr (capped, so multi-line `tsc`/lint diagnostics come through intact) is fed raw, so the model treats it like tool output and can act on it directly:

```bash
echo "tsc: 3 errors found" >&2
exit 2
```

Use `reason` for natural-language revision guidance; use `exit 2` + stderr for machine-style diagnostics the model should act on verbatim.

### Who sees each field

Use this to pick the right field for the audience you want to reach.

| **Field** | **User (TUI)** | **Model** |
| --------- | :------------: | :-------: |
| `stopReason` |  |  |
| `systemMessage` |  |  |
| `permissionDecisionReason` (Pre) |  |  |
| `reason` (Post / Stop) |  |  (Post & Stop when `decision: "block"`; an `exit 2` retry feeds stderr instead) |
| `additionalContext` |  |  |
| `stderr` (exit 2) |  |  (full text fed to model on retry, all events) |

Rule of thumb: for machine-style detail the model should act on verbatim, use `exit 2` + stderr. For natural-language revision guidance, use Stop's `reason`. For a user-only notice, use `systemMessage` or `stopReason`.

---

## Exit codes

The exit code is the fast path. Most hooks only ever use `0`.

| **Exit** | **Stdout handling** | **Effect on tool** | **Effect on session** |
| -------- | ------------------- | ------------------ | --------------------- |
| `0` | Parsed as JSON | Determined by output (see [decision matrix](#block-and-halt-decision-matrix)) | Continues (unless `continue: false`) |
| `2` | Ignored | `PreToolUse`: blocked. `PostToolUse`: advisory retry signal. `Stop` / `SessionStart`: n/a | `PreToolUse` / `PostToolUse`: continues. `Stop`: retries the turn. `SessionStart`: continues (non-blocking) |
| any other | Parsed if present | Tool proceeds, non-blocking error logged | Continues |

### Exit code `2` block-reason resolution

The text sent to the model when a hook exits `2` is resolved in this order:

1. `hookSpecificOutput.permissionDecisionReason` (if stdout parses and sets one)
2. Top-level `reason` (PostToolUse only)
3. Trimmed first line of stderr
4. Generic fallback text naming the hook and its exit code

### Exit code `0` stdout handling

- Empty or whitespace-only stdout means "no opinion" and the tool proceeds.
- Non-empty stdout that fails to parse as JSON, or parses but fails schema validation, is logged as a warning and the tool proceeds.

---

## Block and halt decision matrix

Each hook result produces two effects: whether the tool runs, and whether the session continues afterward.

| **Signal** | **Value** | **Tool** | **Session** |
| ---------- | --------- | :------: | :---------: |
| `exit code` | `2` (PreToolUse) | skipped | continues |
| `exit code` | `2` (PostToolUse) | (already ran) advisory retry | continues |
| `exit code` | `2` (Stop) | n/a | retries the turn; stderr is fed to the model |
| `exit code` | `0` | see output | see output |
| `exit code` | other | runs | continues |
| `hookSpecificOutput.permissionDecision` | `"deny"` (PreToolUse) | skipped | continues |
| `decision` | `"block"` (PostToolUse) | (already ran) advisory retry | continues |
| `decision` | `"block"` (Stop) | n/a | retries the turn (capped at 3); `reason` shown to the user and fed to the model |
| `continue` | `false` | runs | halts after this batch |

**SessionStart is non-blocking**: it never blocks, retries, or halts. Exit `2`, `decision`, and `continue: false` are all ignored as control signals so a hook can never stop a session from opening. Only `additionalContext` (injected into the first turn) and `systemMessage` (shown to the user) are consumed.

**When a PreToolUse hook denies the tool**: the model receives the `permissionDecisionReason` (or stderr on exit `2`) as the tool result. Remaining `PreToolUse` hooks for that call are skipped.

**When any hook sets `continue: false`**: every hook in the current batch still runs to completion. The session halts after. This does not apply to `SessionStart`.

---

## Execution semantics

How the engine runs hooks once a tool call fires.

### Shell

Every hook command is spawned through a system shell. The JSON input is piped on stdin, the hook writes its response JSON to stdout. The first non-empty line of stderr is used as a fallback block reason when a hook exits `2`.

### Execution order

- **`PreToolUse`** hooks run **sequentially** in the order they appear in `settings.json`. Execution stops as soon as one hook denies the tool (via `permissionDecision: "deny"` or exit `2`); later hooks for the same event do not run.
- **`PostToolUse`** hooks run **in parallel**. One crashing hook cannot cancel another. Returned results preserve the order they appear in `settings.json`, not completion order.
- **`Stop`** hooks run **in parallel**, like `PostToolUse`. Matchers on Stop hooks are silently ignored, since Stop has no tool to match against.
- **`SessionStart`** hooks run **in parallel** when a session begins, before the first turn. Matchers are silently ignored, since SessionStart has no tool to match against.

### Timeouts

- Default timeout is 30 seconds. Override per hook with `timeout` (seconds, capped at 600).
- On timeout the engine sends `SIGTERM`. Hooks that trap `SIGTERM` get a 5-second grace period before `SIGKILL`.

### Isolation

Each hook fires with its own process and its own copy of stdin. Hooks cannot read each other's stdout or stderr, and cannot pass information between themselves. When multiple hooks match the same tool call, the outputs are combined by the rules in the [decision matrix](#block-and-halt-decision-matrix); no hook sees any other hook's result.

### Sub-agents

`PreToolUse` and `PostToolUse` hooks also fire on every tool call a [sub-agent](./custom-agents.md) makes, including background ones. A hook that denies a parent's shell command denies the same command from a sub-agent.

- **Permission mode.** `permission_mode` is the sub-agent's own mode, which can differ from the parent's when the agent file sets `permissionMode:`. A sub-agent in plan mode skips hooks, like the main session does.
- **Halting.** A hook that halts (`continue: false`) stops only that sub-agent. The main agent gets the partial result with a note that a hook stopped it, and is told not to redo the halted action itself.
- **Not per sub-agent.** `Stop` and `SessionStart` fire for the main session only.

---

## Permission modes

The `permission_mode` field on stdin carries the session's current mode:

| **Value** | **Description** |
| --------- | --------------- |
| `"default"` | Model requests permission before each tool |
| `"auto-accept"` | Permission prompts auto-accepted |
| `"plan"` | Plan mode. Tool calls are restricted to read-only operations. **Hooks are skipped entirely in plan mode** |
| `"bypass"` | Prompts are skipped; ordinary safety checks still apply |
| `"dont-ask"` | Never prompts; anything that would need a prompt is denied instead |
| `""` (empty) | No mode applies to this fire |

`standard` is accepted as a legacy alias when *setting* the mode (in settings.json or `--permission-mode`), but the value reported on the wire is always `default`.

Plan mode is read-only by design, so no `PreToolUse` guard is needed and no `PostToolUse` audit will fire. If your hook looks broken, check whether the session is in plan mode first.

---

## Example: full hook script

**`.commandcode/hooks/guard-shell.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Read the entire stdin payload once.
payload=$(cat)

# Common fields on every event.
session_id=$(printf '%s' "$payload" | jq -r '.session_id')
cwd=$(printf '%s' "$payload" | jq -r '.cwd')
event=$(printf '%s' "$payload" | jq -r '.hook_event_name')

# Tool-call fields, present on every tool event.
tool_name=$(printf '%s' "$payload" | jq -r '.tool_name')
tool_display=$(printf '%s' "$payload" | jq -r '.tool_display_name')
cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // ""')

# Command Code also injects env vars for the same context.
: "${COMMANDCODE_PROJECT_DIR:?}"
: "${COMMANDCODE_SESSION_ID:?}"
: "${COMMANDCODE_HOOK_EVENT:?}"

# Deny a destructive command with a reason the model will see.
if [[ "$cmd" == *"rm -rf /"* ]]; then
  jq -n --arg cmd "$cmd" '{
    continue: true,
    systemMessage: "Blocked destructive command",
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("Policy forbids: " + $cmd)
    }
  }'
  exit 0
fi

# Otherwise allow and attach extra context for the model's next turn.
jq -n --arg event "$event" '{
  continue: true,
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    additionalContext: ("Verified by guard-shell.sh during " + $event)
  }
}'
```

---

## Examples

A set of working hooks you can copy into your project. Each shows a different use case, so you can modify them as you see fit. All are bash scripts here, but a hook can be any executable that parses JSON on stdin.

| **Example** | **Event** | **Kind** | **What you get** |
| ----------- | --------- | --------- | ---------------- |
| [Block dangerous bash](#block-dangerous-bash-commands) | `PreToolUse` | Blocking | Model can't run `rm -rf /`, `curl \| sh` |
| [Warn on sensitive reads](#warn-the-agent-about-sensitive-files-on-read) | `PreToolUse` | Context injection | Model is told to redact secrets before quoting |
| [Audit tool calls](#audit-tool-calls-to-a-log-file) | `PreToolUse` or `PostToolUse` | Audit only | Matching tool calls appended to a local log file |
| [Quality gate](#quality-gate-stop-hook) | `Stop` | Blocking (retry) | Assistant can't finish with `DO NOT SHIP` markers left in the code |
| [Inject git status](#inject-git-status-on-session-start) | `SessionStart` | Context injection | Model knows the branch and uncommitted files before it starts |

Every example has two files:
1. A `settings.json` that wires the hook.
2. A shell script at `.commandcode/hooks/<name>.sh`.

Ensure each script is executable with `chmod +x` before Command Code fires the hook.

Each example ends with a **Test** block containing a prompt to paste into Command Code and the result to expect so you can confirm the hook fires.

### Block dangerous bash commands

Match the model's shell command against a short list of dangerous patterns. On a hit, deny the tool and tell the model why, so it doesn't retry the same pattern.

**`.commandcode/settings.json`**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "shell",
        "hooks": [
          { 
            "type": "command", 
            "command": "./.commandcode/hooks/deny-dangerous.sh", "timeout": 5 
          }
        ]
      }
    ]
  }
}
```

**`.commandcode/hooks/deny-dangerous.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
cmd=$(jq -r '.tool_input.command // ""')

# Dangerous patterns: rm -rf /, curl | sh, fork bomb, sudo rm
pattern='rm[[:space:]]+-[rR]f?[[:space:]]+/'
pattern+='|curl.*\|.*(sh|bash)'
pattern+='|:\(\)[[:space:]]*\{'
pattern+='|sudo[[:space:]]+rm'

if printf '%s' "$cmd" | grep -qE "$pattern"; then
  jq -n --arg cmd "$cmd" '{
    systemMessage: "blocked dangerous command",
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("Command matched a dangerous pattern. Policy forbids: " + ($cmd | .[0:120]))
    }
  }'
else
  exit 0
fi
```

**Test: Block dangerous bash commands**

Prompt in Command Code:

```text copy filename="Prompt"
Try to run this shell command: rm -rf /tmp/cmd-hook-demo
```

Expected result:

-  The command is blocked before it runs (it matches the `rm -rf /` pattern, even though the target is harmless).
- The agent sees *"Command matched a dangerous pattern. Policy forbids…"* and moves on without retrying.

**How it works**

- Reads `tool_input.command` from stdin with `jq`.
- Matches against four patterns: `rm -rf /`, `curl | sh`, a `:(){}` fork bomb, `sudo rm`.
- On a hit, emits `permissionDecision: "deny"`. The tool is skipped and the model receives `permissionDecisionReason` as the tool result.
- On a miss, exits `0` with no stdout. The tool runs normally.

### Warn the agent about sensitive files on read

Allow every read, but quietly inject a note when the path looks sensitive. The model sees the note as extra context and adjusts its response.

**`.commandcode/settings.json`**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "read",
        "hooks": [
          { 
            "type": "command", 
            "command": "./.commandcode/hooks/warn-sensitive-reads.sh" 
          }
        ]
      }
    ]
  }
}
```

**`.commandcode/hooks/warn-sensitive-reads.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
path=$(jq -r '.tool_input.absolute_path // ""')

# Default note. Upgraded to a strong warning when the path looks sensitive.
ctx="File is being read under an audit hook. Do not paste full contents unless the user asks."
if printf '%s' "$path" | grep -qE '(\.ssh/|/\.env$|\.pem$|id_rsa)'; then
  ctx="SENSITIVE READ: $path. Redact any keys or tokens before quoting from this file."
fi

jq -n --arg ctx "$ctx" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    additionalContext: $ctx
  }
}'
```

**Test: Warn on sensitive reads**

Prompt in Command Code:

```text copy filename="Prompt"
Read the .env file in my home directory
```

Expected result:

-  The read is allowed. The hook never blocks it.
- The agent receives the injected note *"SENSITIVE READ: …/.env. Redact any keys or tokens before quoting from this file."* and refuses to paste the full contents.

**How it works**

- Always returns `permissionDecision: "allow"`. The Read is never blocked.
- Sends `additionalContext` to the model, appended to the tool result before the next turn.
- Upgrades the note to an explicit redaction warning when the path matches `.ssh/`, `.env`, `.pem`, or `id_rsa`.

### Audit tool calls to a log file

Log every matching tool call to an append-only file. The hook writes nothing to stdout, so it's observe-only: the tool runs unchanged. The pattern (read `tool_input` with `jq`, append a tab-separated line) is the same for any tool. Swap the event, matcher, and extracted field to fit what you want to observe.

Use `PostToolUse` to log what completed. Use `PreToolUse` to log what was attempted; this also catches commands that a later hook denies, as long as the audit hook runs first.

#### Writes and edits (`PostToolUse`)

Fires after the file mutation completes. Uses `COMMANDCODE_PROJECT_DIR` and `COMMANDCODE_SESSION_ID` directly, so there's no need to parse `cwd` or `session_id` from stdin.

**`.commandcode/settings.json`**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "write|edit",
        "hooks": [
          { 
            "type": "command", 
            "command": "./.commandcode/hooks/audit-writes.sh" 
          }
        ]
      }
    ]
  }
}
```

**`.commandcode/hooks/audit-writes.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="$COMMANDCODE_PROJECT_DIR/.commandcode/write-audit.log"

# Extract the target file path from the JSON payload on stdin.
path=$(jq -r '.tool_input.file_path // "?"')
timestamp=$(date -u +%FT%TZ)

# Append one tab-separated line per write: timestamp, session ID, file path.
printf '%s\t%s\t%s\n' "$timestamp" "$COMMANDCODE_SESSION_ID" "$path" >> "$LOG_FILE"
```

**Test: Audit writes**

Prompt in Command Code:

```text copy filename="Prompt"
Create a new file called config.txt with some test data
```

Expected result:

-  The file is created.
- The hook appends one line to `.commandcode/write-audit.log`.
- Verify with `cat .commandcode/write-audit.log`. You should see a tab-separated line (timestamp, session ID, file path).

#### Shell commands (`PreToolUse`)

Fires before execution, so this logs every shell command the agent issues.

**`.commandcode/settings.json`**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "shell",
        "hooks": [
          { 
            "type": "command", 
            "command": "./.commandcode/hooks/log-shell.sh" 
          }
        ]
      }
    ]
  }
}
```

**`.commandcode/hooks/log-shell.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="/tmp/cmd-shell.log"

# Extract the shell command from the JSON payload on stdin.
command=$(jq -r '.tool_input.command // ""')
timestamp=$(date -u +%FT%TZ)

# Append one tab-separated line to the audit log.
printf '%s\t%s\n' "$timestamp" "$command" >> "$LOG_FILE"
```

**Test: Audit shell commands**

Prompt in Command Code:

```text copy filename="Prompt"
Run this command: ls -la /home
Then tell me you're done.
```

Expected result:

-  The command runs as normal.
- The hook appends one line to `/tmp/cmd-shell.log`.
- Verify with `cat /tmp/cmd-shell.log`. Each entry in `/tmp/cmd-shell.log` has the shape (fields are tab-separated):

```
2026-04-21T17:38:51Z    ls -la /home
```

### Quality gate (Stop hook)

Block the agent from finishing the turn while a `DO NOT SHIP` marker is still in the code. The `Stop` event fires at end of turn; this hook greps for the marker and exits `2` when it finds one, sending the assistant back for another pass with the offending lines as feedback. The `stop_hook_active` check is the canonical loop-prevention pattern. Without it, the hook would fire forever.

**`.commandcode/settings.json`**

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "./.commandcode/hooks/no-ship-gate.sh"
          }
        ]
      }
    ]
  }
}
```

**`.commandcode/hooks/no-ship-gate.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)

# Already retrying, so let the turn end and don't loop.
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi

# Quality gate: don't finish while "DO NOT SHIP" markers remain.
# On a hit, echo the lines to stderr and exit 2. The engine feeds
# that text to the model on the retry so it knows what to remove.
# `.commandcode` is excluded so the hook can't match its own source.
HITS=$(grep -rn "DO NOT SHIP" . \
  --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.commandcode \
  2>/dev/null || true)
if [ -n "$HITS" ]; then
  echo "Remove these 'DO NOT SHIP' markers before finishing:" >&2
  echo "$HITS" | head -20 >&2
  exit 2
fi
```

**Test: Quality gate**

Prompt in Command Code:

```text copy filename="Prompt"
Write a JavaScript function that processes user data.
Include this comment: // DO NOT SHIP - add error handling
Then tell me you're done.
```

Expected result: the turn is blocked, the agent retries on its own, and it finishes once the marker is gone. Step by step:

-  **First turn:** the assistant finishes → the hook greps → finds the `DO NOT SHIP` marker → exits `2` with the matching lines on stderr. A gray Stop frame appears in the feed:

```text
  Ran 1 stop hook
  └ Stop hook [./.commandcode/hooks/no-ship-gate.sh] exited 2: Remove these 'DO NOT SHIP' markers before finishing: [retry 1/3]
```

- The engine feeds that stderr text back to the model as a user-role message and re-runs the turn.
-  **Second turn:** the assistant removes the marker and adds error handling. The hook fires again with `stop_hook_active: true` → exits `0`. The turn ends.

If the hook keeps blocking (e.g. it's broken), the engine caps retries at 3 and ends the turn with `Stop hook retry cap reached (3). Ending turn. Same outcome ×4. Fix or disable: ./.commandcode/hooks/no-ship-gate.sh`.

### Inject git status on session start

Give the model a head start by injecting the current git branch and any uncommitted changes explicitly into the first turn. The `SessionStart` event fires once when a session begins (startup, resume, or clear). This hook prints the repo state as `additionalContext`, so the model sees it before you even type a prompt. SessionStart is non-blocking, so a slow or failing hook never holds up the session.

**`.commandcode/settings.json`**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "./.commandcode/hooks/git-status.sh"
          }
        ]
      }
    ]
  }
}
```

**`.commandcode/hooks/git-status.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Build a short summary of the repo state.
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
CHANGES=$(git status --porcelain 2>/dev/null | head -20)

SUMMARY="Current git branch: ${BRANCH}."
if [ -n "$CHANGES" ]; then
  SUMMARY="${SUMMARY}"$'\n'"Uncommitted changes:"$'\n'"${CHANGES}"
else
  SUMMARY="${SUMMARY} Working tree is clean."
fi

# Emit additionalContext for the model's first turn.
jq -n --arg ctx "$SUMMARY" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $ctx
  }
}'
```

**Test: Inject git status**

Make a change so the working tree has uncommitted changes, then start a fresh Command Code session with the prompt:

```text copy filename="Prompt"
What branch am I on and what have I changed so far?
```

Expected result: the model answers with the branch name and the list of uncommitted files, even though you never told it. The context rode the first turn from the hook. A gray SessionStart frame also appears in the feed if the hook emits a `systemMessage`.

---

## Best practices

How to pick hooks over other mechanisms, write ones you can trust, test them without running Command Code, and debug the ones that misfire.

### When to use hooks

Hooks are the right tool when you need **deterministic, out-of-model enforcement** in your workflows. When to use hooks vs. other Command Code features:

| **Mechanism** | **When to use** |
| ------------- | --------------- |
| **Hooks** | Block destructive actions, audit every tool call, inject context the model must see, halt the session on a signal |
| **Mods** | Extend Command Code itself with new tools, commands, flags, or broader lifecycle behavior; see [Mods](https://commandcode.ai/docs/mods) |
| **Skills** | Give the model a workflow it can choose to invoke |
| **Slash commands** | Let the user trigger a fixed prompt or action |
| **`AGENTS.md`** | Describe project norms the model follows by default but can deviate from |

### Writing safe hooks

- **Parse stdin with `jq -r`, never `eval`.** Everything in `tool_input` came from the model and should be treated as untrusted.
- **Quote every variable** before passing it to shell. The [`deny-dangerous.sh`](#block-dangerous-bash-commands) example uses `grep -qE` on a quoted `printf`, never `eval $cmd`.
- **Keep `timeout` tight** (10 seconds or less for sync hooks). A slow hook blocks the tool call and makes Command Code feel laggy.
- **Prefer `additionalContext` over `systemMessage`** when guiding the model, and `systemMessage` when explaining a policy violation to the user.

### Testing a hook locally

You don't need to run Command Code to iterate on a hook. Pipe a fake payload in:

```bash
cat <<'EOF' | COMMANDCODE_PROJECT_DIR="$PWD" COMMANDCODE_SESSION_ID=test COMMANDCODE_HOOK_EVENT=PreToolUse ./.commandcode/hooks/deny-dangerous.sh
{
  "session_id": "test",
  "transcript_path": "/tmp/t.jsonl",
  "cwd": ".",
  "hook_event_name": "PreToolUse",
  "permission_mode": "default",
  "tool_name": "shell_command",
  "tool_display_name": "SHELL",
  "tool_input": { "command": "rm -rf /" }
}
EOF
```

Inspect stdout (JSON, or empty for "no opinion") and the exit code (`echo $?`). Ensure the script has execute permissions (`chmod +x`) to run as a hook in Command Code.

### Common failure modes

What you'll see when a hook doesn't behave the way you expect:

| **Symptom** | **Likely cause** | **Fix** |
| ----------- | ---------------- | ------- |
| Hook never runs | You're in plan mode (hooks are skipped). The matcher regex doesn't match any of `SHELL`, `READ`, `WRITE`, `EDIT`. The script isn't executable | Exit plan mode. Check `matcher` against the display names `SHELL`, `READ`, `WRITE`, `EDIT`. Run `chmod +x` for your executables. |
| Tool runs despite `"deny"` | `permissionDecision` is misspelled, or `hookSpecificOutput` is missing | Validate output against the [Hook output](#hook-output-stdout) schema |
| Timeout errors in the log | Hook takes longer than its `timeout` | Raise `timeout`, or move slow work to a background process |
| Hook crashes silently | Stdout is invalid JSON on exit `0` | Return empty stdout for "no opinion", or emit valid JSON |
| `jq: command not found` | `jq` isn't installed on the machine running Command Code | `brew install jq`, or rewrite the hook in Python or Node |

For all of these, `cmd --debug` logs each hook evaluation (see below).

### Debugging hooks

When a hook fires but doesn't behave the way you expect, run Command Code with `--debug` and tail the log:

```bash
cmd --debug
# in another terminal
tail -f ~/.commandcode/logs/command.log
```

The log records every hook evaluation: trust checks, config loads, matcher decisions, stdin/stdout payloads, and non-zero exit codes. You can see exactly why a hook was (or wasn't) invoked and what it returned.

The log file only exists while `--debug` is active and appends across sessions, so clear it between runs if noisy.

### Performance

Hooks fire on **every** matching tool call. A slow hook means added latency on every matching tool call.

- **Keep hooks fast.** Well under a second. Users notice lag immediately.
- **Push slow work to `PostToolUse`.** It runs after the tool completes and in parallel, so slowness there doesn't block the agent.
- **Move truly slow work out of process.** If you need to talk to a SIEM or policy server, send a fire-and-forget HTTP request or append to a local log. Don't block on the round trip.

---

## Next steps

- [Mods](https://commandcode.ai/docs/mods): extend Command Code itself with new tools, commands, and broader lifecycle behavior
- [CLI Reference](https://commandcode.ai/docs/reference/cli): flags and commands that pair with hooks
- [Skills](./skills.md): give the model workflows it can choose to invoke
- Stuck on a schema edge case? Ask in our [Discord community](https://commandcode.ai/discord)
