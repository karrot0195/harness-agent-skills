---
name: speckit-upgrade
description: Re-apply this repository's Spec Kit customizations after upgrading to a new upstream speckit release. Keeps the standard .harness/memory/constitution.md write, mirrors it to .specific/constitution.yaml, and relocates extension hooks plus preset/extension template layers under .specific/. Use when bumping the speckit version, refreshing .harness/ or workflow-skills/ from upstream, or when speckit skills start reading .harness/extensions.yml or .harness/memory/constitution.md again.
argument-hint: "[upstream_version]"
metadata:
  version: "1.0.0"
---

# speckit-upgrade

Upstream GitHub Spec Kit assumes everything lives under `.harness/`. This
repository deliberately keeps project-owned state under `.specific/`:

- the constitution is authored at `.harness/memory/constitution.md` (standard
  flow) and mirrored to `.specific/constitution.yaml` for project config;
- extension hooks live in `.specific/extensions.yml`;
- preset and extension template layers are resolved from `.specific/presets/`
  and `.specific/extensions/`.

A new upstream release overwrites `workflow-skills/speckit-*/SKILL.md`,
`.harness/scripts/`, and `.harness/templates/`, which reintroduces the upstream
paths. This skill re-applies the local layout after every upgrade.

## When to use

- The user bumps `speckit.version` in `.specific/workflow.yaml` or
  `template/input/workflow.template.yaml`.
- `.harness/` or `workflow-skills/` was refreshed from an upstream release.
- A `speckit-*` skill reads `.harness/extensions.yml` or
  `.harness/memory/constitution.md` again.
- `setup-workflow` starts writing `.harness/extensions.yml`.

## When NOT to use

- Normal feature work — use the `speckit-*` skills directly.
- Installing the workflow into a target project — use `setup-workflow`.
- The user only wants to change one project's constitution — use
  `speckit-constitution`.

## Inputs

1. **`upstream_version`** (optional) — the release being adopted, e.g. `1.2.3`.
   If omitted, read `speckit.version` from
   `template/input/workflow.template.yaml` and `.specific/workflow.yaml`.
2. **`source_root`** — this skills repository. Resolve it from the skill
   directory:

   ```sh
   SOURCE_ROOT="$(git -C "<skill-dir>" rev-parse --show-toplevel)"
   ```

3. **`target`** (optional) — a project that already has `.harness/` and
   `.specific/`. When provided, also run the setup refresh in step 6.

## Layout contract

| Concern | Standard upstream | This repository |
|---|---|---|
| Constitution authoring | `.harness/memory/constitution.md` | unchanged |
| Constitution for project config | — | `.specific/constitution.yaml` (mirror) |
| Extension hooks | `.harness/extensions.yml` | `.specific/extensions.yml` |
| Preset template layer | `.harness/presets/` | `.specific/presets/` |
| Extension template layer | `.harness/extensions/` | `.specific/extensions/` |
| Core templates | `.harness/templates/` | unchanged |

Do not move `.harness/scripts/`, `.harness/templates/`, or
`.harness/workflows/`; only the four concerns above change.

**Format contract.** `.specific/constitution.yaml` is the **parsed** form of the
constitution and MUST parse as YAML (the structured
`project_name`/`version`/`ratified`/`last_amended`/`principles`/`sections`/
`governance`/`body` schema in `.specific/workflow.yaml`). It is a mirror of
`.harness/memory/constitution.md`, but a copy of the Markdown bytes under a
`.yaml` name is a defect — the file would fail `yaml.safe_load`. See step 2b and
step 5a.

## Steps

### 0. Preflight

1. Confirm `SOURCE_ROOT/.harness/` and `SOURCE_ROOT/workflow-skills/` exist.
   Abort with the missing path if either is absent.
2. Record the current version:
   ```sh
   grep -n 'version:' "$SOURCE_ROOT/template/input/workflow.template.yaml"
   ```
3. Confirm the upstream refresh is complete. If `workflow-skills/` still
   contains the previous release, stop and tell the user to finish the upgrade
   first. Do not mix releases.

### 1. Detect drift

Run the verifier to see what is already correct:

```sh
bash "$SOURCE_ROOT/.agents/skills/speckit-upgrade/scripts/verify_customizations.sh"
```

Every `FAIL` line names a file and the stale pattern. Continue with only the
failing sections below; the patch set is idempotent.

### 2. Patch the constitution paths

**2a. Reader skills.** For every `workflow-skills/speckit-*/SKILL.md` except
`speckit-constitution`, replace the constitution read path:

```sh
for f in "$SOURCE_ROOT"/workflow-skills/speckit-*/SKILL.md; do
  case "$f" in
    */speckit-constitution/SKILL.md) continue ;;
  esac
  sed -i 's|\.harness/memory/constitution\.md|.specific/constitution.yaml|g' "$f"
done
```

**2b. Constitution skill.** `workflow-skills/speckit-constitution/SKILL.md`
MUST keep the standard flow and add the mirror. Its Outline must contain these
three properties:

- The intro says the constitution is updated at
  `.harness/memory/constitution.md`.
- Step 1 loads `.harness/memory/constitution.md` when present, falls back to
  `.specific/constitution.yaml`, and otherwise uses the resolved template.
- Step 6 writes `.harness/memory/constitution.md`, then serializes the same
  constitution into `.specific/constitution.yaml` as **valid YAML** (structured
  `project_name`/`version`/`ratified`/`last_amended`/`principles`/`sections`/
  `governance`/`body` per the `.specific/workflow.yaml` schema). Copying the
  rendered Markdown into the `.yaml` path is a defect: the file MUST parse as
  YAML.

If upstream changed the surrounding wording, preserve its structure and apply
the same intent. The final constraint line must read:

```text
Write only `.harness/memory/constitution.md` and `.specific/constitution.yaml`; do not create or modify template source files.
```

### 3. Patch extension hooks

**3a. Skills.** Replace every hook path:

```sh
sed -i 's|\.harness/extensions\.yml|.specific/extensions.yml|g' \
  "$SOURCE_ROOT"/workflow-skills/speckit-*/SKILL.md
```

**3b. Move the file.** If `.harness/extensions.yml` exists, move it:

```sh
if [ -f "$SOURCE_ROOT/.harness/extensions.yml" ]; then
  if [ -f "$SOURCE_ROOT/.specific/extensions.yml" ]; then
    echo "Both extensions files exist; merge hooks manually"
  else
    mv "$SOURCE_ROOT/.harness/extensions.yml" "$SOURCE_ROOT/.specific/extensions.yml"
  fi
fi
```

Never overwrite an existing `.specific/extensions.yml`; merge hooks manually if
both exist.

**3c. Install manifest.** In `.harness/.install-manifest.json`, rename the
`".harness/extensions.yml"` key to `".specific/extensions.yml"`.

### 4. Patch preset and extension template layers

Patch the source resolvers under `SOURCE_ROOT/.harness/scripts/`. Target
projects receive the same files when `setup-workflow` refreshes them (step 6).

Python (`common.py`):

```sh
sed -i \
  -e 's|\.harness/presets|.specific/presets|g' \
  -e 's|\.harness/extensions|.specific/extensions|g' \
  -e 's|repo_root / "\.harness" / "presets"|repo_root / ".specific" / "presets"|g' \
  -e 's|repo_root / "\.harness" / "extensions"|repo_root / ".specific" / "extensions"|g' \
  "$SOURCE_ROOT/.harness/scripts/python/common.py"
```

Bash (`common.sh`):

```sh
sed -i \
  -e 's|\.harness/presets|.specific/presets|g' \
  -e 's|\.harness/extensions|.specific/extensions|g' \
  -e 's|\$repo_root/\.harness/presets|$repo_root/.specific/presets|g' \
  -e 's|\$repo_root/\.harness/extensions|$repo_root/.specific/extensions|g' \
  "$SOURCE_ROOT/.harness/scripts/bash/common.sh"
```

Keep the `.harness/templates` base path unchanged.

### 5. Patch the setup tooling and docs

**5a. `setup_specify.py`** (`.agents/skills/setup-workflow/scripts/`):

- `GENERATED_FILES` includes `.specific/extensions.yml`,
  `.harness/memory/constitution.md`, and `.specific/constitution.yaml`.
- `collect_desired` writes the rendered Markdown to
  `.harness/memory/constitution.md` and serializes the constitution to **YAML**
  for `.specific/constitution.yaml` (helper `render_constitution_yaml`, schema
  per `.specific/workflow.yaml`). Never copy the Markdown bytes into the `.yaml`
  path — the file MUST parse as YAML (`yaml.safe_load`).
- The extensions render target is `.specific/extensions.yml`.

**5b. Docs and templates.** Replace the same paths in:

- `README.md`
- `.agents/skills/init-flow/SKILL.md`
- `.agents/skills/setup-workflow/SKILL.md`
- `template/output/extensions.template.yaml`

The setup-workflow mapping row must read:

```text
| `constitution.*` | `.harness/memory/constitution.md`, then serialized as YAML into `.specific/constitution.yaml` |
```

### 6. Refresh a target (optional)

If the user passed `target`, run the installer in plan mode first:

```sh
python3 "$SOURCE_ROOT/.agents/skills/setup-workflow/scripts/setup_specify.py" \
  --target "$TARGET" --source-root "$SOURCE_ROOT"
```

Expect `same` for unchanged files. A `conflict` on `.specific/constitution.yaml`
is normal when the project edited its constitution; resolve with
`--on-conflict keep` unless the user says otherwise.

### 7. Verify

Run the verifier again and require zero `FAIL` lines:

```sh
bash "$SOURCE_ROOT/.agents/skills/speckit-upgrade/scripts/verify_customizations.sh"
```

The verifier checks:

- no stale `.harness/extensions.yml`, `.harness/presets`, or
  `.harness/extensions/` references in `workflow-skills/` or the resolvers;
- `common.py` and `common.sh` resolve presets/extensions from `.specific/`;
- `resolve_template.py constitution-template --json` succeeds;
- `python3 -m py_compile` and `bash -n` pass;
- `setup_specify.py` serializes `.specific/constitution.yaml` as YAML (contains
  `render_constitution_yaml`) rather than copying the Markdown;
- when a target is given, its `.specific/extensions.yml` exists and parses as
  YAML, its `.specific/constitution.yaml` exists and parses as YAML (a verbatim
  Markdown copy FAILs), its `.install-manifest.json` tracks the new path, and
  its installed resolvers use `.specific/`.

### 8. Report

Report, per section: files changed, files already correct, the upstream version
adopted, and any manual merge left for the user (for example two competing
`extensions.yml` files). Suggest a commit message:

```text
chore(speckit): re-apply .specific layout for speckit <version>
```

## Failure modes

| Failure | Behavior |
|---|---|
| `workflow-skills/` missing | Abort; the upstream refresh is incomplete |
| Mixed release files | Abort; finish the upgrade before patching |
| Both `.harness/extensions.yml` and `.specific/extensions.yml` exist | Do not overwrite; show both and ask which hooks win |
| `.specific/constitution.yaml` does not parse as YAML (Markdown copy) | Add/restore `render_constitution_yaml` in `setup_specify.py` and re-check the constitution skill step 6 (step 5a, step 2b) |
| Upstream rewrote the constitution skill | Apply the intent from step 2b; do not blindly sed the standard path away |
| Verifier reports a stale path in a new file | Add the path to the patch set and re-run |
| PyYAML unavailable | Skip YAML parsing checks; report the install hint |

## Notes

- The patch set is intentionally textual and idempotent. Re-running it is safe.
- Never edit `.harness/templates/*.md`; those are the versioned template layer.
- Never touch `specs/` or application source while running this skill.
- When upstream adds a new skill, run step 2a and 3a over it too; the glob
  `workflow-skills/speckit-*/SKILL.md` covers it automatically.
