#!/usr/bin/env python3
"""Plan or apply an idempotent GitHub Spec Kit (.specify) install for a target project.

Safe re-runs: every installed/generated file is recorded in
<target>/.specify/.install-manifest.json with its sha256. On the next run a
file is updated only when its current hash still matches the recorded one.
Anything the user edited is a conflict and is never silently overwritten.

Linked mode: when <target>/.specify is a symlink (shared runtime created by
create-relative-link), the .specify install is skipped entirely — only the
.specific/* renders are planned/applied and no manifest is written, so the
shared runtime is never modified.

Usage:
  setup_specify.py --target DIR --source-root DIR [--apply] [--json]
                   [--on-conflict prompt|keep|overwrite] [--verbose]

Exit codes: 0 ok, 3 conflicts need a decision, 2 usage/config error.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None

MANIFEST_REL = ".specify/.install-manifest.json"

MANAGED_TREES = (
    ".specify/scripts",
    ".specify/templates",
    ".specify/workflows/speckit",
)
MANAGED_FILES = (".specify/.gitignore",)

GENERATED_FILES = (
    ".specify/init-options.json",
    ".specify/integration.json",
    ".specific/extensions.yml",
    ".specify/memory/constitution.md",
    ".specific/constitution.yaml",
    ".specify/memory/.constitution-template.json",
    ".specify/workflows/workflow-registry.json",
)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_yaml(path: Path) -> dict:
    if yaml is None:
        raise RuntimeError("PyYAML is required: python3 -m pip install pyyaml")
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def deep_merge(base: dict, override: dict) -> dict:
    if not isinstance(base, dict) or not isinstance(override, dict):
        return override if override is not None else base
    out = dict(base)
    for key, value in override.items():
        if isinstance(out.get(key), dict) and isinstance(value, dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = value
    return out


def load_config(target: Path, source_root: Path) -> dict:
    defaults_path = source_root / "template/input/workflow.template.yaml"
    defaults = read_yaml(defaults_path) if defaults_path.is_file() else {}
    config_path = target / ".specific/workflow.yaml"
    override = read_yaml(config_path) if config_path.is_file() else {}
    return deep_merge(defaults, override)


def speckit_cfg(cfg: dict) -> dict:
    return cfg.get("speckit") or {}


def render_init_options(cfg: dict) -> bytes:
    sk = speckit_cfg(cfg)
    payload = {
        "ai": sk.get("integration", "command-code"),
        "ai_skills": True,
        "allow_symlinks": bool(sk.get("allow_symlinks", False)),
        "feature_numbering": sk.get("feature_numbering", "sequential"),
        "here": True,
        "integration": sk.get("integration", "command-code"),
        "script": sk.get("script", "py"),
        "speckit_version": sk.get("version", "1.2.2.dev0"),
    }
    return (json.dumps(payload, indent=2) + "\n").encode()


def render_integration(cfg: dict) -> bytes:
    sk = speckit_cfg(cfg)
    integration = sk.get("integration", "command-code")
    payload = {
        "version": sk.get("version", "1.2.2.dev0"),
        "integration_state_schema": 1,
        "installed_integrations": [integration],
        "integration_settings": {
            integration: {"script": sk.get("script", "py"), "invoke_separator": "-"}
        },
        "integration": integration,
        "default_integration": integration,
    }
    return (json.dumps(payload, indent=2) + "\n").encode()


def render_extensions(cfg: dict, source_root: Path) -> bytes:
    template_path = source_root / "template/output/extensions.template.yaml"
    base = read_yaml(template_path) if template_path.is_file() else {"hooks": {}}
    base.setdefault("apiVersion", "agent-skills/v1")
    base.setdefault("kind", "Extensions")
    hooks = base.get("hooks") or {}
    user_hooks = (cfg.get("extensions") or {}).get("hooks") or {}
    merged = deep_merge(hooks, user_hooks)
    base["hooks"] = {key: value for key, value in merged.items() if value}
    if yaml is None:
        raise RuntimeError("PyYAML is required: python3 -m pip install pyyaml")
    return yaml.safe_dump(base, sort_keys=False, allow_unicode=True).encode()


def render_registry(cfg: dict, source_root: Path, target: Path) -> bytes:
    workflow_path = source_root / ".specify/workflows/speckit/workflow.yml"
    meta = (read_yaml(workflow_path).get("workflow") or {}) if workflow_path.is_file() else {}
    enabled = bool(((cfg.get("workflows") or {}).get("speckit") or {}).get("enabled", True))
    now = datetime.now(timezone.utc).isoformat()
    existing_path = target / ".specify/workflows/workflow-registry.json"
    existing: dict = {}
    if existing_path.is_file():
        try:
            loaded = json.loads(existing_path.read_text(encoding="utf-8"))
            existing = loaded.get("workflows", {}) if isinstance(loaded, dict) else {}
        except (OSError, ValueError):
            pass
    previous = existing.get("speckit", {})
    base = {
        "name": meta.get("name", "Full SDD Cycle"),
        "version": meta.get("version", "1.0.1"),
        "description": meta.get("description", "Specify -> plan -> tasks -> implement"),
        "source": "bundled",
    }
    if enabled:
        unchanged = all(previous.get(key) == value for key, value in base.items())
        existing["speckit"] = {
            **base,
            "installed_at": previous.get("installed_at", now),
            "updated_at": previous.get("updated_at", now) if unchanged else now,
        }
    else:
        existing.pop("speckit", None)
    payload = {"schema_version": "1.0", "workflows": existing}
    return (json.dumps(payload, indent=2) + "\n").encode()


def render_constitution(cfg: dict, source_root: Path) -> bytes:
    con = cfg.get("constitution") or {}
    body = (con.get("body") or "").strip()
    if body:
        return (body + "\n").encode()
    principles = con.get("principles") or []
    sections = con.get("sections") or []
    governance = con.get("governance") or []
    if not (principles or sections or governance):
        template = source_root / ".specify/templates/constitution-template.md"
        return template.read_bytes() if template.is_file() else b""
    numerals = ("I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X")
    lines = [f"# {con.get('project_name') or 'TBD'} Constitution", "", "## Core Principles", ""]
    for index, principle in enumerate(principles):
        number = numerals[index] if index < len(numerals) else str(index + 1)
        lines += [f"### {number}. {principle.get('name', 'Principle')}", "",
                  str(principle.get("description", "")).strip(), ""]
    for section in sections:
        lines += [f"## {section.get('name', 'Section')}", "",
                  str(section.get("content", "")).strip(), ""]
    lines += ["## Governance", ""]
    lines += [f"- {item}" for item in governance]
    lines += ["", f"**Version**: {con.get('version', '1.0.0')} | "
                  f"**Ratified**: {con.get('ratified', 'TBD')} | "
                  f"**Last Amended**: {con.get('last_amended', 'TBD')}", ""]
    return "\n".join(lines).encode()


def render_constitution_yaml(cfg: dict) -> bytes:
    """Serialize the constitution config as valid YAML for .specific/constitution.yaml.

    This is the parsed/mirror form of .specify/memory/constitution.md and must
    parse as YAML; it is never a verbatim copy of the rendered Markdown.
    """
    con = cfg.get("constitution") or {}
    if yaml is None:
        raise RuntimeError("PyYAML is required: python3 -m pip install pyyaml")
    doc = {
        "project_name": con.get("project_name") or "TBD",
        "version": str(con.get("version") or "1.0.0"),
        "ratified": str(con.get("ratified") or "TBD"),
        "last_amended": str(con.get("last_amended") or "TBD"),
        "body": (con.get("body") or "").strip(),
        "principles": con.get("principles") or [],
        "sections": con.get("sections") or [],
        "governance": con.get("governance") or [],
    }
    return yaml.safe_dump(doc, sort_keys=False, allow_unicode=True).encode()


def render_constitution_template(source_root: Path) -> bytes:
    template = source_root / ".specify/templates/constitution-template.md"
    digest = sha(template.read_bytes()) if template.is_file() else ""
    return (json.dumps({"sha256": digest, "source": "core"}, indent=2) + "\n").encode()


def collect_desired(target: Path, source_root: Path, cfg: dict) -> dict[str, tuple[bytes, int | None]]:
    desired: dict[str, tuple[bytes, int | None]] = {}
    for rel in MANAGED_FILES:
        src = source_root / rel
        if src.is_file():
            desired[rel] = (src.read_bytes(), src.stat().st_mode & 0o777)
    for rel_root in MANAGED_TREES:
        src_root = source_root / rel_root
        if not src_root.is_dir():
            continue
        for src in sorted(src_root.rglob("*")):
            if not src.is_file():
                continue
            rel = src.relative_to(source_root).as_posix()
            if rel == ".specify/workflows/workflow-registry.json":
                continue
            desired[rel] = (src.read_bytes(), src.stat().st_mode & 0o777)
    desired[".specify/init-options.json"] = (render_init_options(cfg), None)
    desired[".specify/integration.json"] = (render_integration(cfg), None)
    desired[".specific/extensions.yml"] = (render_extensions(cfg, source_root), None)
    desired[".specify/memory/constitution.md"] = (render_constitution(cfg, source_root), None)
    desired[".specific/constitution.yaml"] = (render_constitution_yaml(cfg), None)
    desired[".specify/memory/.constitution-template.json"] = (
        render_constitution_template(source_root), None)
    desired[".specify/workflows/workflow-registry.json"] = (
        render_registry(cfg, source_root, target), None)
    return desired


def load_manifest(target: Path) -> dict:
    path = target / MANIFEST_REL
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("files", {}) if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def classify(dest: Path, desired: bytes, entry: dict | None) -> str:
    if not dest.exists():
        return "add"
    if not dest.is_file():
        return "conflict"
    current = sha(dest.read_bytes())
    if current == sha(desired):
        return "same"
    if entry:
        if entry.get("pinned"):
            return "pinned"
        if current == entry.get("sha256"):
            return "update"
    return "conflict"


def atomic_write(dest: Path, data: bytes, mode: int | None) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=str(dest.parent), prefix=dest.name + ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
        if mode is not None:
            os.chmod(tmp_name, mode)
        os.replace(tmp_name, dest)
    except BaseException:
        Path(tmp_name).unlink(missing_ok=True)
        raise


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", required=True)
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--apply", action="store_true", help="write changes (default: plan only)")
    parser.add_argument("--json", action="store_true", help="machine-readable summary")
    parser.add_argument("--verbose", action="store_true", help="also list unchanged files")
    parser.add_argument("--on-conflict", choices=("prompt", "keep", "overwrite"))
    args = parser.parse_args(argv)

    target = Path(args.target).expanduser().resolve()
    source_root = Path(args.source_root).expanduser().resolve()
    if not target.is_dir():
        print(f"error: target is not a directory: {target}", file=sys.stderr)
        return 2
    if not (source_root / ".specify").is_dir():
        print(f"error: source .specify/ not found under {source_root}", file=sys.stderr)
        return 2

    linked = (target / ".specify").is_symlink()

    try:
        cfg = load_config(target, source_root)
        desired = collect_desired(target, source_root, cfg)
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if linked:
        desired = {rel: item for rel, item in desired.items()
                   if rel.startswith(".specific/")}

    on_conflict = args.on_conflict or ((cfg.get("sync") or {}).get("on_conflict") or "prompt")
    manifest = {} if linked else load_manifest(target)
    results = []
    for rel in sorted(desired):
        data, mode = desired[rel]
        dest = target / rel
        status = classify(dest, data, manifest.get(rel))
        results.append({"path": rel, "status": status, "data": data, "mode": mode})

    conflicts = [r["path"] for r in results if r["status"] in ("conflict",)]

    if args.apply:
        if conflicts and on_conflict == "prompt":
            for item in results:
                if item["status"] == "conflict":
                    print(f"CONFLICT {item['path']}")
            print("error: conflicts require --on-conflict keep|overwrite", file=sys.stderr)
            return 3
        new_manifest = dict(manifest)
        for item in results:
            rel, status = item["path"], item["status"]
            dest = target / rel
            if dest.is_dir():
                continue
            if status in ("add", "update"):
                atomic_write(dest, item["data"], item["mode"])
                new_manifest[rel] = {"sha256": sha(item["data"]), "mode": item["mode"]}
            elif status == "same":
                new_manifest.setdefault(rel, {"sha256": sha(item["data"]), "mode": item["mode"]})
            elif status == "conflict" and on_conflict == "overwrite":
                atomic_write(dest, item["data"], item["mode"])
                new_manifest[rel] = {"sha256": sha(item["data"]), "mode": item["mode"]}
            elif status == "conflict" and on_conflict == "keep":
                new_manifest[rel] = {"sha256": sha(dest.read_bytes()), "pinned": True}
            elif status == "pinned":
                new_manifest[rel] = manifest[rel]
        if not linked:
            atomic_write(
                target / MANIFEST_REL,
                (json.dumps({"schema_version": 1, "generator": "setup-workflow",
                             "files": new_manifest}, indent=2, sort_keys=True) + "\n").encode(),
                0o644,
            )

    summary = {}
    for item in results:
        summary[item["status"]] = summary.get(item["status"], 0) + 1
    if args.json:
        print(json.dumps({"target": str(target), "applied": args.apply,
                          "linked": linked,
                          "on_conflict": on_conflict,
                          "files": [{k: v for k, v in item.items()
                                     if k not in ("data", "mode")} for item in results],
                          "summary": summary}, indent=2))
    else:
        if linked:
            print("LINKED .specify")
        for item in results:
            if item["status"] == "same" and not args.verbose:
                continue
            print(f"{item['status'].upper():9} {item['path']}")
        print("summary: " + ", ".join(f"{key}={value}" for key, value in sorted(summary.items())))
        if conflicts and not args.apply:
            if on_conflict == "prompt":
                print("conflicts: choose --on-conflict keep or overwrite")
                return 3
            print(f"conflicts will be handled with on_conflict={on_conflict}")
    if conflicts and not args.apply and on_conflict == "prompt":
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
