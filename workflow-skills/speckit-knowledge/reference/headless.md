<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Headless Mode

Run Command Code non-interactively in scripts, CI/CD pipelines, and automation workflows. Headless mode executes a single query, outputs the response to stdout, and exits.

```
  stdin ──┐
          ├──► cmd -p "query" ──┬──► stdout
  argv  ──┘         │           │    text, or
                    │           │    JSON frames
                    │           └──► stderr
                    │                --verbose
                    ▼                progress
              exit code
              0 ok · 8 max-turns hit
```

---

## Basic usage

Use the `-p` (or `--print`) flag to run in headless mode:

```bash
cmd -p "explain this file"
```

Always wrap your query in quotes. Unquoted multi-word queries cause argument parsing errors.

---

## Authentication

On your own machine, `cmd login` once and headless runs reuse that login. For non-interactive environments (CI pipelines, Docker images, scheduled jobs, SSH boxes without a browser), [create an API key](https://commandcode.ai/docs/studio#api-keys) and export it as the `COMMAND_CODE_API_KEY` environment variable. The CLI reads the env var at startup and uses it as the auth token. No need to run `cmd login` or pre-write an `auth.json` file.

**Set the API key**

```bash {{ title: 'macOS / Linux' }}
export COMMAND_CODE_API_KEY=""  # add your API key here
cmd -p "Run my workflow"        # already logged in
```

```bash {{ title: 'Windows' }}
$env:COMMAND_CODE_API_KEY = ""  # PowerShell: add your API key here
cmdc -p "Run my workflow"       # already logged in
```

The env var takes precedence over `~/.commandcode/auth.json`. It overrides any local authentication method.

Run `cmd status` to confirm. The output shows `Source: $COMMAND_CODE_API_KEY` when the env var is the active credential.

### GitHub Actions

Store the key as a repository secret and pass it through `env`:

```yaml
- name: Install Command Code
  run: npm i -g command-code@latest

- name: Run Command Code
  run: cmd -p "review the changes in this PR"
  env:
    COMMAND_CODE_API_KEY: ${{ secrets.COMMAND_CODE_API_KEY }}
```

Treat the key as a secret: use your CI provider's encrypted-secrets store (GitHub Actions secrets, GitLab CI variables, etc.) rather than committing it to the repo.

---

## Input methods

### Direct argument

Pass your query directly after the `-p` flag:

```bash
cmd -p "refactor the auth module"
```

### Piped stdin

Pipe input from another command or file:

```bash
echo "explain this error" | cmd -p
```

```bash
cat prompt.txt | cmd -p
```

Command Code auto-detects piped input when no query argument is provided. If stdin is a TTY and no query is given, it exits with an error.

---

## Permissions

By default, headless mode **blocks tools that modify your system** - file writes, file edits, and shell commands are denied. This keeps automated runs safe.

To enable all tools, pass `--yolo`:

```bash
cmd -p "fix the lint errors" --yolo
```

> `--dangerously-skip-permissions` is also accepted as an alias. `--permission-mode yolo` does not lift the block in headless mode. Pass `--yolo`.

| **Tool** | **Default (no flag)** | **With `--yolo`** |
| -------- | --------------------- | ----------------------------------------- |
| File reads, grep, glob | Allowed | Allowed |
| File edits and writes | Blocked | Allowed |
| Shell commands | Blocked | Allowed |

Only use `--yolo` in trusted environments. It allows Command Code to modify files and run shell commands without confirmation.

---

**Permissions**
	Headless runs still go through the permission engine. The complete guide
	covers `dont-ask`, the fail-closed allowlist mode built for CI, plus rule
	syntax and the decision ladder.

## Tool calls

Headless mode supports multi-turn tool execution. Command Code can read files, search code, and (with permissions) edit files and run commands, just like [interactive mode](https://commandcode.ai/docs/interactive-mode).

The conversation loop runs for up to **100 turns** by default. Raise or lower it with `--max-turns`. If the limit is reached, a warning is printed to stderr and the partial response is returned.

A few tools are disabled from headless runs. These tools are not useful in headless context, and usually are useful with a person
at the keyboard, such as asking you a question or opening a plan for approval.

You can enable these tools if you want:

```bash
# Everything
cmd -p "..." --tools-all
CMD_TOOLS_ALL_ENABLE=true cmd -p "..."

# Only enable the ones you name (comma-separated, repeatable)
cmd -p "..." --tools-enable ask_user_question
CMD_TOOLS_ASK_USER_QUESTION_ENABLE=true cmd -p "..."
```

---

## JSON output

`--output-format json` turns print mode into a machine-readable stream. Use it when a script needs to react to the run, not just read the final answer.

```bash
cmd -p "summarize the auth module" --output-format json
```

The stream is **newline-delimited JSON** (NDJSON), one object per line, in two shapes.

**Event frames**, one per `AgentEvent` as the run progresses:

```json
{"type": "event", "event": {"type": "tool_running", "toolCallId": "…", "toolName": "read_file", "description": "…"}}
```

**One final result line**, always last:

```json
{"type": "result", "subtype": "success", "sessionId": "…", "stopReason": "end_turn", "usage": {…}, "durationMs": 8421, "finalText": "…"}
```

| **Field** | **Always present?** | **Notes** |
| --------- | ------------------- | --------- |
| `subtype` | yes | `success`, `error`, or `max_turns` - comes first so a consumer can peek the outcome cheaply |
| `usage` | yes | Token usage totals for the run |
| `durationMs` | yes | Wall-clock duration |
| `finalText` | yes | The assistant's final answer, same text `--output-format text` would print. Empty string on an error result |
| `sessionId` | **optional** | Omitted when the run fails before a session is resolved (bad input, auth failure) |
| `stopReason` | **optional** | Why the loop ended (`end_turn`, `max_turns`, …). Omitted entirely on an error result |
| `error` | **optional** | Present only when `subtype` is `error` - stderr keeps the human-readable copy |

Treat `sessionId` and `stopReason` as optional. A run that fails early (auth, invalid input, session setup) emits `subtype: "error"` with neither field, so a script that indexes them unconditionally will break on exactly the cases it most needs to handle.

`--output-format text` (the default) keeps the classic behavior: just the final answer on stdout.

Parse line by line rather than buffering the whole stream. The event list grows over time, so treat unknown `event.type` values as forward-compatible and ignore them.

---

## Sessions & resuming

Each headless run persists its transcript to disk, so you can chain follow-up queries that keep prior context. Headless sessions are tagged separately and stay **hidden** from the interactive `/resume` menu and from interactive `--continue` - automation never pollutes your interactive history.

### Continue the most recent run

`--continue` (or `-c`) resumes the most recent headless session in the current directory:

```bash
cmd -p "find the slowest test"
cmd -p --continue "now suggest a fix"   # carries the previous turn's context
```

If no headless session exists yet, `--continue` starts a fresh one - so a `-p --continue` loop works from the first iteration.

### Resume a specific session

Print the session id with `--verbose` (written to **stderr**, so stdout stays clean for piping):

```bash
cmd -p --verbose "start a code review"   # stderr → session: 9f4e1c0a-...
```

Then resume that exact session by id:

```bash
cmd -p --resume 9f4e1c0a-... "continue the review"
```

A bare `--resume` with no id errors in headless mode - there is no interactive picker. Use `--continue` to pick up the latest run instead.

### Open a headless session in interactive mode

Pass a headless session id to plain `cmd --resume <id>` (without `-p`) to load that transcript into a full interactive session:

```bash
cmd --resume 9f4e1c0a-...
```

---

## Exit codes

Use exit codes to handle results in scripts and CI/CD:

| **Code** | **Meaning** | **Constant** |
| -------- | ----------- | ------------ |
| `0` | Success | `EXIT_SUCCESS` |
| `1` | General error | `EXIT_ERROR` |
| `3` | Not authenticated | `EXIT_AUTH_ERROR` |
| `4` | Permission denied | `EXIT_PERMISSION_DENIED` |
| `5` | Rate limit exceeded | `EXIT_RATE_LIMITED` |
| `6` | Network failure | `EXIT_CONNECTION_ERROR` |
| `7` | API server error (5xx) | `EXIT_SERVER_ERROR` |
| `8` | Max turns reached before final answer | `EXIT_MAX_TURNS_REACHED` |
| `9` | Model produced no response | `EXIT_NO_RESPONSE` |
| `10` | Insufficient credits | `EXIT_INSUFFICIENT_CREDITS` |
| `130` | Interrupted (SIGINT/SIGTERM) | `EXIT_INTERRUPTED` |

Example usage in a script:

```bash
cmd -p "check for security issues" --yolo
if [ $? -ne 0 ]; then
  echo "Command Code failed"
  exit 1
fi
```

---

## Decision models (typesafe/jev)

`typesafe/jev` is available on the headless mode as a decision model. It runs headless, on your normal login, and it bills $0.042 per 1M input tokens at cost; everything else is free.

It answers typed questions about a **state** with **probabilities** instead of text, so a script can branch on the number. The headless prompt is typesafe/jev's request as JSON. Request and response follow TypeSafe's [official shape](https://docs.typesafe.ai/api).

Here is an example of how to run it headlessly with cmd:

```bash
cmd -p '{
  "state": {"diff": "- if (user.isAdmin)\n+ if (true)"},
  "questions": {
    "risky":    {"type": "noul",   "instructions": "Does this weaken an authorization check?"},
    "category": {"type": "choice", "instructions": "Which kind of change is this?", "criteria": {"security": "auth or secrets", "bugfix": "wrong behavior", "refactor": "no behavior change"}}
  }
}' -m typesafe/jev
```

```json
{
  "model": "typesafe/jev",
  "answers": {
    "risky":    {"type": "noul",   "noul": 0.93},
    "category": {"type": "choice", "choice": "security", "confidence": 0.81, "probabilities": {"security": 0.8, "bugfix": 0.15, "refactor": 0.05}}
  },
  "usage": {"input_tokens": 360, "output_tokens": 57}
}
```

Interactive use is refused, since Jev is not a chat model. You can find the full request and response reference on the [Provider API page](https://commandcode.ai/docs/provider#decision-models-typesafe-jev).

---

## Shell script

```bash
#!/bin/bash
set -e

# Generate docs for changed files
CHANGED=$(git diff --name-only HEAD~1)
echo "Document these changed files: $CHANGED" | cmd -p --skip-onboarding
```

## Piping output

Headless mode is pipe-friendly. Output goes to stdout, errors and warnings go to stderr:

```bash
# Save response to a file
cmd -p "generate a README for this project" > README.md

# Pipe to another command
cmd -p "list all TODO comments" | grep "critical"

# Use in command substitution
SUMMARY=$(cmd -p "summarize this codebase in one paragraph")
```

---

## Related flags

Flags useful for headless and automated workflows:

| **Flag** | **Description** |
| -------- | --------------- |
| `-p, --print [query]` | Run in headless mode |
| `--output-format <format>` | Print-mode output: `text` (default) or `json` - see [JSON output](#json-output) |
| `-c, --continue` | Resume the most recent headless session in this directory |
| `-r, --resume <id>` | Resume a specific headless session by id (no bare picker in print mode) |
| `--verbose` | Print the resolved session id to stderr (for chaining `--resume`) |
| `--max-turns <number>` | Maximum conversation turns in print mode (default: `100`, no upper bound) |
| `--tools-all` | Enable every tool, including the ones headless runs disable - see [Tool calls](#tool-calls) |
| `--tools-enable <names>` | Enable specific withheld tools by name (comma-separated, repeatable) |
| `-m, --model <model>` | Run on a specific model this session |
| `--effort <level>` | Set reasoning effort (`low`, `medium`, `high`, …) |
| `--theme <theme>` | Set the color theme (`dark`, `light`, or `auto` to match the terminal background) |
| `--config <key=value>` | Set any setting headlessly (repeatable) - see below |
| `--yolo` | Allow file writes and shell commands |
| `--accept-edits` | Start in accept edits mode (alias for `--permission-mode accept-edits`) |
| `--skip-onboarding` | Skip taste onboarding (for CI/automated runs) |
| `-t, --trust` | Auto-trust project (skip initial permission prompt) |
| `--plan` | Start in plan mode (read-only exploration) |
| `--permission-mode <mode>` | Set permission mode: `default`, `plan`, `accept-edits`, `yolo`, `dont-ask` (`auto-accept`, `bypass`, and legacy `standard` accepted as aliases) |

---

## Configuring settings

Slash commands are interactive-only, but the settings behind them are available as **flags** -
never as a `/slash` string on the command line. The common ones have dedicated flags
(`--model`, `--effort`, `--theme`), and `--config key=value` reaches any setting the `/config`
UI can change:

```bash
# Set your model + reasoning effort for this run
cmd -p "review this diff" --model claude-sonnet-4-6 --effort high

# Set any setting; repeatable. Invalid keys/values exit non-zero.
cmd --config theme=dark --config compact-mode=fast
```

`--config` is the headless equivalent of the interactive `/config` UI, so a new setting becomes
scriptable automatically. Confirmations print to stderr, keeping `-p` stdout clean.

---

## Limitations

| **Limitation** | **Details** |
| -------------- | ----------- |
| **No interactive prompts** | No keyboard shortcuts or interactive UI. Slash commands aren't typed here - use flags instead (see [Configuring settings](#configuring-settings)); session-lifecycle commands like `/clear` and `/reload` have no meaning in one-shot mode |
| **No resume picker** | A bare `--resume` errors in print mode; resume by explicit id or use `--continue` |
| **Stdin timeout** | Piped stdin times out after 30 seconds if no data is received |
| **Decision models are headless only** | `typesafe/jev` answers typed questions, not chat, so it runs with `-p` only (see [Decision model: Jev](#decision-models-typesafe-jev)) |

---

## Next steps

- See [CLI Reference](https://commandcode.ai/docs/reference/cli) for the full list of flags and commands
- Learn about [Interactive Mode](https://commandcode.ai/docs/interactive-mode) for full-featured sessions
- Join our [Discord community](https://commandcode.ai/discord) for support
