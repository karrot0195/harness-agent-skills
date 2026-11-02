#!/usr/bin/env python3
"""Plan or apply relative symlinks from a target project to common skills.

Reads skills.link from <target>/.specific/common.yaml (empty = all
common-skills/*). Re-runs are idempotent: a link already pointing at the
right source is skipped, and a real directory is never deleted.

Usage:
  link_common_skills.py --target DIR --source-root DIR [--apply] [--overwrite] [--json]

Exit codes: 0 ok, 2 usage/config error.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None


def load_names(target: Path, source_root: Path) -> list[str]:
    available = sorted(
        entry.name for entry in (source_root / "common-skills").iterdir()
        if entry.is_dir()
    )
    config_path = target / ".specific/common.yaml"
    selected: list[str] = []
    if config_path.is_file():
        if yaml is None:
            raise RuntimeError("PyYAML is required: python3 -m pip install pyyaml")
        data = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
        selected = ((data.get("skills") or {}).get("link")) or []
    names = list(selected) if selected else available
    unknown = [name for name in names if name not in available]
    if unknown:
        raise ValueError(
            "unknown common skill(s): " + ", ".join(unknown)
            + " (available: " + ", ".join(available) + ")"
        )
    return names


def plan(target: Path, source_root: Path, names: list[str]) -> list[dict]:
    skills_dir = target / ".agents/skills"
    items = []
    for name in names:
        source = source_root / "common-skills" / name
        dest = skills_dir / name
        rel = os.path.relpath(source, skills_dir)
        if not source.is_dir():
            status = "error"
        elif dest.is_symlink() and os.readlink(dest) == rel:
            status = "skip_linked"
        elif dest.is_symlink():
            status = "replace"
        elif dest.exists() and dest.is_dir():
            status = "skip_real_dir"
        elif dest.exists():
            status = "replace"
        else:
            status = "add"
        items.append({"name": name, "source": str(source), "dest": str(dest),
                      "rel": rel, "status": status})
    return items


def apply(target: Path, items: list[dict], overwrite: bool) -> None:
    skills_dir = target / ".agents/skills"
    skills_dir.mkdir(parents=True, exist_ok=True)
    for item in items:
        status = item["status"]
        dest = Path(item["dest"])
        if status in ("skip_linked", "skip_real_dir", "error"):
            continue
        if status == "replace" and not overwrite:
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.is_symlink() or dest.exists():
            dest.unlink()
        os.symlink(item["rel"], dest)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", required=True)
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--apply", action="store_true", help="create links (default: plan only)")
    parser.add_argument("--overwrite", action="store_true", help="also replace wrong links")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    target = Path(args.target).expanduser().resolve()
    source_root = Path(args.source_root).expanduser().resolve()
    if not target.is_dir() or not (source_root / "common-skills").is_dir():
        print("error: target or common-skills/ not found", file=sys.stderr)
        return 2
    try:
        items = plan(target, source_root, load_names(target, source_root))
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.apply:
        apply(target, items, args.overwrite)

    summary: dict[str, int] = {}
    for item in items:
        summary[item["status"]] = summary.get(item["status"], 0) + 1
    if args.json:
        print(json.dumps({"applied": args.apply, "overwrite": args.overwrite,
                          "skills": items, "summary": summary}, indent=2))
    else:
        for item in items:
            print(f"{item['status'].upper():13} {item['name']} -> {item['rel']}")
        print("summary: " + ", ".join(f"{k}={v}" for k, v in sorted(summary.items())))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
