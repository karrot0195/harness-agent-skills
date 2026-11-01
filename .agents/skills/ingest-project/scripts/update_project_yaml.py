#!/usr/bin/env python3
"""Plan or apply an idempotent merge into <target>/.specific/project.yaml.

ingest-project scans a project read-only, derives architecture facts and
verification-skill candidates, then calls this helper so re-runs are
deterministic:

  name / summary        set only when empty or null (user-owned once filled)
  architecture.*        overwritten with scanned values; blank scan values keep
                        the existing entry (never blank or invent a value)
  skills                appended when the name is new (case-insensitive);
                        existing entries and order are preserved
  rules                 never touched
  all other keys        preserved verbatim

Usage:
  update_project_yaml.py --project-yaml PATH [--arch-json JSON]
                        [--skills-json JSON] [--apply] [--json]

  --arch-json   JSON object, e.g. '{"framework":"feathersjs","language":"nodejs"}'
  --skills-json JSON array, e.g. '[{"name":"migrate","description":"pnpm run knex:latest"}]'

Exit codes: 0 ok, 2 usage/config error.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None

ARCH_KEYS = ("framework", "language", "database", "unit_test_framework")
DEFAULTS = {
    "apiVersion": "agent-skills/v1",
    "kind": "Project",
    "name": "",
    "summary": "",
    "architecture": {key: "" for key in ARCH_KEYS},
    "skills": [],
    "rules": [],
    "features_file": ".specific/project-features.yaml",
}


def load_yaml(path: Path) -> dict:
    if yaml is None:
        raise RuntimeError("PyYAML is required: python3 -m pip install pyyaml")
    if not path.is_file():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def parse_json_arg(raw: str, expected: type, flag: str):
    if not raw:
        return expected()
    try:
        value = json.loads(raw)
    except ValueError as exc:
        raise ValueError(f"{flag}: invalid JSON: {exc}") from exc
    if not isinstance(value, expected):
        raise ValueError(f"{flag}: expected a JSON {expected.__name__}")
    return value


def clean(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def merge(existing: dict, arch: dict, skills: list) -> tuple[dict, list[str]]:
    """Return (merged_doc, list_of_change_descriptions)."""
    changes: list[str] = []
    doc = dict(existing) if existing else dict(DEFAULTS)
    for key, value in DEFAULTS.items():
        doc.setdefault(key, value if not isinstance(value, dict) else dict(value))

    if not clean(doc.get("name")) and clean(arch.get("name")):
        doc["name"] = clean(arch.get("name"))
        changes.append(f"name -> {doc['name']}")
    if not clean(doc.get("summary")) and clean(arch.get("summary")):
        doc["summary"] = clean(arch.get("summary"))
        changes.append("summary -> set from scan")

    arch_doc = doc.get("architecture")
    if not isinstance(arch_doc, dict):
        arch_doc = {key: "" for key in ARCH_KEYS}
    for key in ARCH_KEYS:
        new_value = clean((arch or {}).get(key))
        if new_value and new_value != clean(arch_doc.get(key)):
            changes.append(f"architecture.{key}: {clean(arch_doc.get(key))!r} -> {new_value!r}")
            arch_doc[key] = new_value
    doc["architecture"] = arch_doc

    existing_skills = doc.get("skills")
    if not isinstance(existing_skills, list):
        existing_skills = []
    seen = {clean(item.get("name")).lower() for item in existing_skills if isinstance(item, dict)}
    for item in skills or []:
        if not isinstance(item, dict):
            continue
        name = clean(item.get("name"))
        if not name or name.lower() in seen:
            continue
        entry = {"name": name, "description": clean(item.get("description"))}
        existing_skills.append(entry)
        seen.add(name.lower())
        changes.append(f"skills += {name}")
    doc["skills"] = existing_skills

    doc.setdefault("rules", [])
    if not isinstance(doc.get("rules"), list):
        doc["rules"] = []
    doc.setdefault("features_file", DEFAULTS["features_file"])
    return doc, changes


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=str(path.parent), prefix=path.name + ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
        os.replace(tmp_name, path)
    except BaseException:
        Path(tmp_name).unlink(missing_ok=True)
        raise


def render(doc: dict) -> bytes:
    if yaml is None:
        raise RuntimeError("PyYAML is required: python3 -m pip install pyyaml")
    return yaml.safe_dump(doc, sort_keys=False, allow_unicode=True).encode()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-yaml", required=True)
    parser.add_argument("--arch-json", default="")
    parser.add_argument("--skills-json", default="")
    parser.add_argument("--apply", action="store_true", help="write changes (default: plan only)")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    path = Path(args.project_yaml).expanduser()
    try:
        arch = parse_json_arg(args.arch_json, dict, "--arch-json")
        skills = parse_json_arg(args.skills_json, list, "--skills-json")
        existing = load_yaml(path)
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    try:
        doc, changes = merge(existing, arch, skills)
        payload = render(doc)
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    current = path.read_bytes() if path.is_file() else None
    if args.apply and current != payload:
        atomic_write(path, payload)

    if args.json:
        print(json.dumps({"path": str(path), "applied": args.apply,
                          "changed": current != payload, "changes": changes}, indent=2))
    else:
        for line in changes:
            print(f"CHANGE    {line}")
        if not changes:
            print("NOCHANGE  project.yaml already up to date")
        print(f"summary: {len(changes)} change(s){' (applied)' if args.apply else ' (plan)'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
