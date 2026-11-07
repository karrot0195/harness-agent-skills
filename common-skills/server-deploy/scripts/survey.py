#!/usr/bin/env python3
"""Survey a project (and optionally a host) and propose a deploy config.

Read-only: this script never writes unless --apply is passed, and --apply only
creates the config when it is missing. It never overwrites an existing
.specific/server-deploy.yaml.

Usage:
  survey.py [--repo PATH] [--config-out PATH] [--json] [--apply]
            [--host HOST] [--user USER] [--key PATH] [--port PORT]
            [--project-path PATH]

Exit codes: 0 ok, 2 usage/config error.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from deploy_lib import (  # noqa: E402
    DEFAULT_CONFIG,
    DeployError,
    Ssh,
    q,
    resolve_repo,
)

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None

MANIFESTS = [
    "go.mod",
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "Cargo.toml",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "Gemfile",
    "composer.json",
    "Makefile",
]
FRONTEND_DIRS = ["client", "web", "frontend", "ui", "admin"]
DIST_DIRS = ["dist", "build", "out", "public"]
COMPOSE_FILES = ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"]
ENV_CANDIDATES = [
    ".config/prod/.env",
    ".env.production",
    ".env",
    "config/prod/.env",
]


def detect_package_manager(directory: Path, repo: Path) -> str:
    for root in (directory, repo):
        if (root / "pnpm-lock.yaml").exists():
            return "pnpm"
        if (root / "yarn.lock").exists():
            return "yarn"
        if (root / "bun.lockb").exists() or (root / "bun.lock").exists():
            return "bun"
        if (root / "package-lock.json").exists():
            return "npm"
    return "npm"


def node_build_command(pm: str, directory: Path, repo: Path) -> str:
    if directory == repo:
        return f"{pm} run build"
    if pm == "pnpm":
        return f"pnpm --dir {directory.relative_to(repo)} run build"
    if pm == "yarn":
        return f"yarn --cwd {directory.relative_to(repo)} run build"
    if pm == "bun":
        return f"bun --cwd {directory.relative_to(repo)} run build"
    return f"npm --prefix {directory.relative_to(repo)} run build"


def scan_node_apps(repo: Path) -> list[dict]:
    apps = []
    candidates = [repo]
    candidates += [repo / name for name in FRONTEND_DIRS if (repo / name / "package.json").is_file()]
    seen = set()
    for directory in candidates:
        package_json = directory / "package.json"
        if not package_json.is_file() or directory in seen:
            continue
        seen.add(directory)
        try:
            data = json.loads(package_json.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        scripts = data.get("scripts") or {}
        if "build" not in scripts:
            continue
        dist = next(
            (name for name in DIST_DIRS if (directory / name).is_dir()),
            "dist",
        )
        pm = detect_package_manager(directory, repo)
        name = "app" if directory == repo else directory.name
        remote = dist if directory == repo else f"{directory.name}/{dist}"
        apps.append(
            {
                "name": name,
                "dir": "." if directory == repo else str(directory.relative_to(repo)),
                "build": node_build_command(pm, directory, repo),
                "local": str((directory / dist).relative_to(repo)),
                "remote": remote,
                "dist": dist,
                "package_manager": pm,
            }
        )
    return apps


def scan_go_commands(repo: Path) -> list[dict]:
    commands = []
    cmd_dir = repo / "cmd"
    if cmd_dir.is_dir():
        for child in sorted(cmd_dir.iterdir()):
            if child.is_dir() and any(child.glob("*.go")):
                commands.append({"name": child.name, "package": f"./cmd/{child.name}/"})
    if (repo / "main.go").is_file() and not commands:
        name = re.sub(r"[^A-Za-z0-9_.-]+", "-", repo.name).strip("-") or "app"
        commands.append({"name": name, "package": "."})
    return commands


def scan_systemd_units(repo: Path) -> list[str]:
    units = set()
    patterns = ["*.service", "deploy/**/*.service", "systemd/**/*.service", "ops/**/*.service"]
    for pattern in patterns:
        for unit in repo.glob(pattern):
            units.add(unit.stem)
    return sorted(units)


def scan_make_targets(repo: Path) -> list[str]:
    makefile = repo / "Makefile"
    if not makefile.is_file():
        return []
    targets = []
    for line in makefile.read_text(encoding="utf-8", errors="ignore").splitlines():
        match = re.match(r"^([A-Za-z0-9_.-]+):", line)
        if match and not match.group(1).startswith("."):
            targets.append(match.group(1))
    return targets[:20]


def scan_repo(repo: Path) -> dict:
    manifests = [name for name in MANIFESTS if (repo / name).is_file()]
    languages = []
    if (repo / "go.mod").is_file():
        languages.append("Go")
    if (repo / "package.json").is_file():
        languages.append("Node")
    if (repo / "pyproject.toml").is_file() or (repo / "requirements.txt").is_file():
        languages.append("Python")
    if (repo / "Cargo.toml").is_file():
        languages.append("Rust")
    if (repo / "pom.xml").is_file() or (repo / "build.gradle").is_file():
        languages.append("Java")
    if (repo / "Gemfile").is_file():
        languages.append("Ruby")

    node_apps = scan_node_apps(repo)
    if node_apps and "Node" not in languages:
        languages.append("Node")

    compose = next((name for name in COMPOSE_FILES if (repo / name).is_file()), None)
    env_files = [name for name in ENV_CANDIDATES if (repo / name).is_file()]
    env_files += [
        str(path.relative_to(repo))
        for path in sorted(repo.glob(".config/*/.env"))
        if str(path.relative_to(repo)) not in env_files
    ]

    return {
        "manifests": manifests,
        "languages": languages,
        "go_commands": scan_go_commands(repo),
        "node_apps": node_apps,
        "compose": compose,
        "systemd_units": scan_systemd_units(repo),
        "env_files": env_files,
        "make_targets": scan_make_targets(repo),
        "has_dockerfile": (repo / "Dockerfile").is_file(),
    }


def scan_host(ssh: Ssh, project_path: str) -> dict:
    def run(command: str) -> str:
        return ssh.run(command, check=False).stdout.strip()

    units = run(
        f"grep -l {q(project_path)} /etc/systemd/system/*.service 2>/dev/null "
        "| xargs -r -n1 basename || true"
    )
    return {
        "project_listing": run(f"ls -la {q(project_path)} 2>/dev/null || true"),
        "env_keys": run(
            f"sed -n 's/^[[:space:]]*\\([A-Za-z_][A-Za-z0-9_]*\\)=.*/\\1/p' "
            f"{q(project_path)}/.env 2>/dev/null | sort -u || true"
        ),
        "project_units": [line.strip() for line in units.splitlines() if line.strip()],
        "running_units": run(
            "systemctl list-units --type=service --state=running --no-legend "
            "--no-pager 2>/dev/null | awk '{print $1}' | head -n 40 || true"
        ).splitlines(),
        "containers": run(
            "docker ps --format '{{.Names}} {{.Image}} {{.Ports}}' 2>/dev/null || true"
        ).splitlines(),
        "disk": run(f"df -h {q(project_path)} 2>/dev/null || true"),
    }


def propose(scan: dict, host: dict | None, target_args: dict) -> dict:
    components = []

    if scan["go_commands"]:
        builds = [
            f"go build -o build/bin/{cmd['name']} {cmd['package']}"
            for cmd in scan["go_commands"]
        ]
        components.append(
            {
                "name": "bin",
                "build": builds if len(builds) > 1 else builds[0],
                "local": "build/bin",
                "remote": "bin",
                "type": "dir",
                "transport": "scp",
            }
        )

    for app in scan["node_apps"]:
        components.append(
            {
                "name": app["name"],
                "build": app["build"],
                "local": app["local"],
                "remote": app["remote"],
                "type": "dir",
                "transport": "tar",
            }
        )

    if scan["env_files"]:
        components.append(
            {
                "name": "env",
                "local": scan["env_files"][0],
                "remote": ".env",
                "type": "file",
                "merge": "env",
            }
        )

    units = []
    if host and host.get("project_units"):
        units = [name[:-8] if name.endswith(".service") else name
                 for name in host["project_units"]]
    elif scan["systemd_units"]:
        units = scan["systemd_units"]

    if units:
        services = {"manager": "systemd", "units": units, "restart": True}
    elif scan["compose"]:
        services = {
            "manager": "compose",
            "compose_file": scan["compose"],
            "restart": True,
        }
    else:
        services = {"manager": "none", "restart": False}

    checks = []
    if services["manager"] == "systemd" and units:
        checks.append({"type": "systemd", "units": units})

    return {
        "apiVersion": "agent-skills/v1",
        "kind": "ServerDeploy",
        "name": "server-deploy",
        "target": target_args.get("name") or "prod",
        "targets": [
            {
                "name": target_args.get("name") or "prod",
                "host": target_args.get("host") or "",
                "user": target_args.get("user") or "root",
                "port": int(target_args.get("port") or 22),
                "key": target_args.get("key") or "~/.ssh/id_ed25519",
                "project_path": target_args.get("project_path") or "",
            }
        ],
        "build": {"steps": []},
        "components": components,
        "remote": {"archive_dir": "archived", "log_file": "LOG-CHANGES.md"},
        "services": services,
        "healthcheck": {"timeout_seconds": 15, "checks": checks},
        "record": {"file": ".specific/deploy-history.md"},
    }


def format_evidence(scan: dict, host: dict | None) -> str:
    lines = ["== repo evidence =="]
    for key in ("languages", "manifests", "compose", "env_files", "systemd_units",
                "make_targets", "has_dockerfile"):
        value = scan.get(key)
        if isinstance(value, list):
            value = ", ".join(value) if value else "none"
        lines.append(f"  {key}: {value}")
    if scan["go_commands"]:
        lines.append("  go commands: " + ", ".join(c["name"] for c in scan["go_commands"]))
    for app in scan["node_apps"]:
        lines.append(
            f"  node app: {app['dir']} (build: {app['build']}, dist: {app['dist']})"
        )
    if host:
        lines.append("== host evidence (read-only) ==")
        for key in ("project_units", "running_units", "containers", "disk"):
            value = host.get(key)
            if isinstance(value, list):
                value = ", ".join(value) if value else "none"
            lines.append(f"  {key}: {value}")
        if host.get("env_keys"):
            lines.append("  env keys: " + ", ".join(host["env_keys"].splitlines()))
        if host.get("project_listing"):
            lines.append("  project listing:")
            lines.extend("    " + line for line in host["project_listing"].splitlines()[:15])
    return "\n".join(lines)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", help="project root (default: git root or cwd)")
    parser.add_argument(
        "--config-out",
        help=f"output path (default <repo>/{DEFAULT_CONFIG})",
    )
    parser.add_argument("--host", help="probe this host read-only")
    parser.add_argument("--user", default=os.environ.get("DEPLOY_USER") or "root")
    parser.add_argument("--key", default=os.environ.get("DEPLOY_KEY"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("DEPLOY_PORT") or 22))
    parser.add_argument("--project-path", default=os.environ.get("DEPLOY_PROJECT_PATH"))
    parser.add_argument("--name", default="prod", help="target name (default prod)")
    parser.add_argument("--json", action="store_true", help="emit one JSON object")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="write the proposal when the config file does not exist yet",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if yaml is None:
        print("error: PyYAML is required: python3 -m pip install pyyaml", file=sys.stderr)
        return 2
    try:
        repo = resolve_repo(args.repo)
        if not repo.is_dir():
            raise DeployError(f"repo not found: {repo}")
        config_out = (
            Path(args.config_out).expanduser()
            if args.config_out
            else repo / DEFAULT_CONFIG
        )

        scan = scan_repo(repo)
        host = None
        if args.host:
            target = {
                "host": args.host,
                "user": args.user,
                "key": args.key,
                "port": args.port,
            }
            if not args.project_path:
                raise DeployError("--project-path is required when probing a host")
            ssh = Ssh(target)
            host = scan_host(ssh, args.project_path)

        proposal = propose(
            scan,
            host,
            {
                "name": args.name,
                "host": args.host,
                "user": args.user,
                "key": args.key,
                "port": args.port,
                "project_path": args.project_path,
            },
        )
        rendered = yaml.safe_dump(proposal, sort_keys=False, default_flow_style=False)

        if args.json:
            print(json.dumps(
                {"repo": str(repo), "config_out": str(config_out),
                 "scan": scan, "host": host, "proposal": proposal},
                indent=2,
            ))
        else:
            print(format_evidence(scan, host))
            print()
            print(f"== proposed config ({config_out}) ==")
            print("# Generated by survey.py - review before relying on it.")
            print("# Schema: references/server-deploy.template.yaml")
            print(rendered, end="")

        if not args.apply:
            return 0
        if config_out.exists():
            print(
                f"error: {config_out} already exists; not overwriting. "
                "Edit it directly or pass --config-out to another path.",
                file=sys.stderr,
            )
            return 2
        config_out.parent.mkdir(parents=True, exist_ok=True)
        config_out.write_text(
            "# Generated by survey.py - review before relying on it.\n"
            "# Schema: references/server-deploy.template.yaml\n" + rendered,
            encoding="utf-8",
        )
        print(f"wrote {config_out}", file=sys.stderr)
        return 0
    except DeployError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
