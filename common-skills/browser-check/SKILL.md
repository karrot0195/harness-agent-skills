---
name: browser-check
description: >
  Access URLs via Playwright and verify page content or status.
  Supports named verification tasks (e.g., "verify login screen") with
  first-time investigation/survey that saves a reusable flow_step under
  .personal/, then reuses it on subsequent runs. Also supports YAML input
  or interactive prompts.
metadata:
  version: "1.2.0"
---

# Browser Check

Verify webpages via Playwright: check titles, text content, DOM elements, or HTTP status. Named tasks save reusable `flow_step` definitions under `.personal/` on first run and reuse them subsequently. Also supports YAML input or interactive prompts.

## When to Use

- Verify a page is accessible and contains expected content (title, text, element, or status)
- Named verification tasks that should be reusable across sessions
- Validate HTTP status codes and page load behavior in CI-like flows

## When NOT to Use

- Visual regression / screenshot comparison (use a dedicated visual-testing tool)
- Performance benchmarking or Lighthouse-style audits
- Anything requiring real user interaction (clicking, form filling beyond field selectors)

## Inputs

### Named Task (default)

```bash
browser-check verify login screen
```

Passes `"verify login screen"` as `--task`. First invocation runs a lightweight survey of `spec/`, `docs/`, and `specific/*` for matching URL hints, prompts the user for remaining fields, and writes a `flow_step`. Subsequent invocations load and reuse it.

### YAML Input

```bash
browser-check --yaml config/verify-url.yaml
```

The file should contain at minimum `url:` plus one verification key (`title:`, `text:`, `element:`, or `status:`). See the [template](./templates/browser-check-template.yaml).

### Interactive (no args)

Prompts for URL, verification type, expected value, and optional personal info.

## Deterministic Steps

### Step 1 — Resolve Input

1. Parse CLI flags: `--task <name>`, `--yaml <path>`, `--personal-dir <dir>` (default `./.personal`).
2. Positional `verify …` shorthand maps to `--task`.
3. For `--task`: look for `.personal/flow_steps/<slugified-name>.yaml`. If found and readable, load it and jump to Step 3.
4. For `--yaml`: parse the file (js-yaml if available, fall back to simple line-based parser) and use its contents.
5. If neither flag is set or the flow_step was missing/invalid, proceed to Step 2.

### Step 2 — Survey & Collect (first time only, named tasks)

1. Scan `spec/`, `docs/`, `specific/*` for lines containing `http://` or `https://`. Match lines whose surrounding context mentions the task name (case-insensitive substring). Present up to 5 matched URLs along with their source file paths.
2. Present any title-like patterns (`title:"..."`, `title = "..."`) from the same matched files.
3. Prompt the user for: URL, verification type (1=title, 2=text, 3=element, 4=status), expected value, and whether to store personal info. Personal info is always written under `.personal/`.
4. Ask to save the flow_step for reuse (default yes). Ask **public or private?** — public routes to `.specific/browser-check/`, private to `.personal/flow_steps/`. Secrets/personal data never go to `.specific/`.

### Step 3 — Run Playwright

1. Execute the inline Playwright check script (bundled inside `scripts/browser-check.js`). It launches Chromium in headless mode, navigates to the URL with `waitUntil: 'networkidle'` and a 30-second timeout, performs the selected verification, logs `Result: PASS` or `Result: FAIL` to stdout, exits 0 or 1 accordingly, and closes the browser. No temporary files are created.
2. Capture the script's stdout. If the process exits non-zero or throws, print the error and exit 1.

> Note: Playwright must be installed beforehand. This skill does not attempt auto-installation.

### Step 4 — Report

Print:

```
== Browser Check Results ==
Task:     {task-name or "unnamed"}
URL:      {url}
Type:     {title|text|element|status}
Expected: {expected}
Actual:   {actual value}
Status:   {HTTP status or "N/A"}
Result:   {PASS|FAIL}
Flow:     {reused | created | skipped}
```

Exit code 0 on PASS, 1 on FAIL or error.

## Idempotency

- Named tasks reuse the existing `flow_step`; first run creates it.
- User can decline to save the `flow_step` on first run (subsequent runs will re-survey).
- YAML input always runs fresh — no caching.
- Visibility tag on the `flow_step` controls storage location; secrets stay in `.personal/`.

## Failure Modes

| Scenario | Behavior |
|---|---|
| Playwright not installed | Script fails immediately with a clear message — install before retrying |
| URL unreachable / DNS failure | Playwright throws; print the error, exit 1 |
| Page load timeout (>30 s) | Playwright throws TimeoutError; print it, exit 1 |
| Verification mismatch | Prints actual vs expected details, exits 1 |
| `--yaml` file missing | Prints error, exits 1 |

## Done Criteria

- Playwright ran against the target URL.
- At least one verification criterion passed or failed with full detail.
- Result printed and exit code returned.
- For named tasks: `flow_step` saved or reused as described.
- Browser instance closed.

## Flow Step Schema

```yaml
task:       "verify login screen"
url:        "https://example.com/login"
type:       "title"            # title | text | element | status
expected:   "Login - MyApp"
visibility: "private"          # private | public
personal_info:                 # optional; always stored under .personal/
  username_field: "input[name='username']"
  password_field: "input[name='password']"
created_at: "2024-01-01T00:00:00Z"
reused:    false
```

## References

- Script: [`scripts/browser-check.js`](./scripts/browser-check.js)
- Template: [`templates/browser-check-template.yaml`](./templates/browser-check-template.yaml)
- Playwright: https://playwright.dev/
- js-yaml: https://github.com/nodeca/js-yaml