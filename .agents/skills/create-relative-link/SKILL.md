---
name: create-relative-link
description: Create a portable relative symlink from a target project to a file or directory in this repository (e.g. template/AGENTS.md, .specify). Use when the user asks to link, symlink, or mirror a repo file into another project directory.
argument-hint: "<file_link> <target_project> <target_file>"
metadata:
  version: "1.1.0"
---

# create-relative-link

Create a relative symlink so the link keeps working when the whole workspace is moved or shared.

## Arguments

Positional, all required:

1. `file_link` — path to the source file or directory relative to this repository root (e.g. `./template/AGENTS.md`, `.specify`).
2. `target_project` — destination project directory (e.g. `~/projects/my-project` or `../my-project`).
3. `target_file` — name/path of the link inside the destination (e.g. `AGENTS.md` or `./example/agents.md`).

If any argument is missing, ask the user for it before proceeding.

## When to use

- User asks to "create a relative link", "symlink a file into a project", or "link template/AGENTS.md into <project>".
- User wants a repo file or directory (e.g. `.specify/`) mirrored into another project without copying, so both sides stay in sync.

## When NOT to use

- The destination should hold an independent copy (use `cp` instead).
- The link target is outside this repository (resolve paths manually).

## Steps

1. **Resolve the source repository root** (the repo containing this skill):
   ```sh
   SOURCE_ROOT="$(git rev-parse --show-toplevel)"
   ```
   If this fails, fall back to the current working directory.

2. **Resolve and validate inputs**:
   - `file_link` → strip a leading `./`; ensure `$SOURCE_ROOT/$file_link` exists — a regular file or a directory. Abort if not. A directory source is linked as a directory; the whole tree resolves through the link.
   - `target_project` → expand `~` and resolve to an absolute path; ensure it is an existing directory. Abort if not.
   - `target_file` → resolve relative to `target_project`.

3. **Compute the relative path** from `target_project` to `SOURCE_ROOT`:
   ```sh
   REL="$(python3 -c 'import os,sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))' "$SOURCE_ROOT" "$target_project")"
   ```
   The link target becomes `$REL/$file_link`.

4. **Ensure the parent directory** of `$target_project/$target_file` exists:
   ```sh
   mkdir -p "$(dirname "$target_project/$target_file")"
   ```

5. **Handle an existing destination**:
   - If `$target_project/$target_file` does not exist → proceed.
   - If it exists and is a symlink or regular file → ask: "Overwrite existing `<target_file>`? (Y/n)" (default Y). On Y, remove it first (`rm -f`); on N, abort.
   - If it exists and is a directory → abort with an error (do not delete directories).

6. **Create the symlink**:
   ```sh
   ln -s "$REL/$file_link" "$target_project/$target_file"
   ```

7. **Verify**:
   ```sh
   ls -la "$target_project/$target_file"
   readlink "$target_project/$target_file"
   ```
   Confirm the resolved path points back to `$SOURCE_ROOT/$file_link`.

## Rules

- Always compute a *relative* link target; never use absolute paths in the symlink.
- Never delete a directory at the destination; only replace files/symlinks after explicit confirmation.
- Prompt once for overwrite (default Y) instead of per-item or silent skipping.
- Expand `~` in `target_project` before computing paths.
- If any required input is missing, ask the user rather than guessing.

## Example

Inputs:
- `file_link` = `./template/AGENTS.md`
- `target_project` = `~/projects/my-project`
- `target_file` = `AGENTS.md`

With `SOURCE_ROOT` = `/home/kai/Workspaces/partner-apps/esp-webservices/agent-skills` and `target_project` = `/home/kai/projects/my-project`:

- `REL` = `../../Workspaces/partner-apps/esp-webservices/agent-skills`
- Link target = `../../Workspaces/partner-apps/esp-webservices/agent-skills/template/AGENTS.md`
- Command: `ln -s ../../Workspaces/partner-apps/esp-webservices/agent-skills/template/AGENTS.md /home/kai/projects/my-project/AGENTS.md`

Linking a directory works identically: with `file_link` = `.specify` and `target_file` = `.specify`, the command becomes `ln -s <REL>/.specify /home/kai/projects/my-project/.specify`.
