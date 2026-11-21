---
name: secrets-check
description: Scan staged or proposed changes for leaked secrets, API keys, tokens, credentials, and personally identifiable information (PII). Shows findings with severity, lets the user confirm or block the commit, and can suggest safe replacements.
metadata:
  version: "1.0.0"
---

# Secrets Check

Scans code changes for accidentally committed sensitive data — AWS keys, GitHub tokens, private keys, passwords, email addresses, phone numbers, credit card numbers, etc. Use when the user asks to check for secrets, scan for leaks, or review changes before committing/pushing.

## When to use

- User asks to check for secrets, leaks, credentials, or PII before committing or pushing.
- A pre-commit hook is needed that blocks or warns on sensitive matches.
- Reviewing a diff or a set of files for accidental data exposure.

## When NOT to use

- The project legitimately stores secrets in version control (use at your own risk — this tool still flags them).
- Scanning binary files where false positives are likely (skip by default; only scan text and code files).

## Steps

### Step 1 — Collect candidate files

1. If called from a git context, run `git diff --cached --name-only` for staged files, then `git diff --name-only HEAD` for unstaged working-tree changes. Let the user decide which set to scan (`--staged`, `--all`, or specific paths).
2. For each file, read its content using `read_file`. Skip binary files (those failing UTF-8 decode) and large generated assets (build output, node_modules, vendor, dist by default).

### Step 2 — Scan patterns

Run pattern matching against each file's content. Use these categories:

**High severity (always flag):**
- AWS access key IDs: `[A-Z0-9]{20}` preceded by `AKIA` or near `"AWS_ACCESS_KEY"` / `aws_access_key_id`
- AWS secret access keys: strings matching `[A-Za-z0-9/+=]{40}` near `aws_secret_access_key` or `AWS_SECRET_ACCESS_KEY`
- GitHub tokens: `gh[pousr]_[A-Za-z0-9_]{36,}`
- Generic API keys/Tokens: values assigned to variables named `API_KEY`, `TOKEN`, `SECRET`, `PRIVATE_KEY`, `ACCESS_KEY` (case-insensitive), where the value is a non-placeholder string (not `<placeholder>`, `TODO`, `FIXME`, or empty)
- Private keys: PEM headers `-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----`
- JWT tokens: strings matching `eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*`
- Database connection strings with embedded passwords: patterns like `postgres://user:pass@host`, `mongodb+srv://user:pass@host`, `mysql://user:pass@host`
- Slack/webhook URLs containing long tokens in the path
- Stripe keys: `sk_live_[A-Za-z0-9]{24,}`, `rk_live_[A-Za-z0-9]{24,}`

**Medium severity (flag, lower noise threshold):**
- Email addresses in config/env files or source code that look like hardcoded credentials
- Phone numbers in non-documentation files: `\+[1-9]\d{6,14}` outside of test/data fixtures
- Credit card number patterns: sequences of 13–19 digits with spaces/dashes near fields named `card`, `credit_card`, `cc_number`
- SSN patterns: `\d{3}-\d{2}-\d{4}` in non-test code
- UUIDs assigned to auth/session identifiers

**Low severity (informational):**
- Placeholder-like values that look incomplete but might indicate work-in-progress credential handling (`${SOME_VAR}`, `changeme`, `xxx`, `TODO_REPLACE`)

For each match, record: `file`, `line_number`, `severity`, `category`, `matched_text_masked` (first/last 4 chars visible, rest masked as `****`), and a short description.

### Step 3 — Report findings

Print results grouped by severity level:

```
== HIGH (3 found) ==
.env.local:12    AWS access key ID      AKIA**MASKED**
src/config.js:45 API key                sk_live**MASKED**
.pem:1           Private key            -----BEGIN PRIVATE KEY-----

== MEDIUM (1 found) ==
data/users.json:7    Phone number        +1 (555) ***-**89

== LOW (2 found) ==
README.md:20         Placeholder          changeme
test/fixtures.yaml:5 Incomplete cred      ${MISSING_VAR}
```

Total counts per category. Include file:line references so the user can inspect.

### Step 4 — Action decision

Present options:

1. **Block & fix** — stop here. User corrects the issue manually or you propose fixes (replace with env variable references, move to `.env`, remove test credentials).
2. **Allow & proceed** — let the commit/push continue despite findings (user accepts the risk).
3. **Ignore & proceed** — add a skip list for this session/file pattern, then continue.

If no findings are detected, report `No secrets or PII detected.` and let the workflow continue naturally.

## Rules

- Always mask matched sensitive values in reports — never print full secrets or keys in output.
- Skip `node_modules`, `vendor`, `dist`, `build`, `__pycache__`, and binary files automatically.
- Do not modify any files — this skill is read-only. Only report and suggest.
- If a file path appears in an existing ignore list (e.g., `.secretignore` or similar), respect it.
- Be conservative: if unsure whether something is a real secret vs. a test fixture or documentation example, flag it as medium rather than ignoring it.
- Never store scanned values in logs, scratchpad, or any persistent artifact beyond the session.

## Done criteria

- All requested files have been scanned against the pattern set.
- Findings reported with severity, location, masked values, and categories.
- User has chosen one of: block (fix later), allow, or ignore.
- No sensitive data printed in full in the report.

## Failure modes

| Scenario | Behavior |
|---|---|
| No files to scan | Report nothing to do; exit cleanly |
| File unreadable / permission denied | Skip with a warning, continue scanning others |
| Too many matches (>100) | Cap display at 100, report total count, ask user if they want details |
| Binary detection fails | Mask file name partially, flag as skipped rather than falsely positive |
| False positive in well-known test fixtures | Keep as medium severity; note it looks like test data |
