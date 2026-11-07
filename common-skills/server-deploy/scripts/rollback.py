#!/usr/bin/env python3
"""List or restore archived component versions on a server target.

Usage:
  rollback.py [--config PATH] [--target NAME] [--repo PATH] [--yes]
              [list | latest | <archive-name>]

Archives live under <project_path>/<remote.archive_dir> as
<timestamp>-<component>. The live copy is moved aside as
<timestamp>-<component>-pre-rollback first, so a rollback is itself reversible.

Exit codes: 0 success, 1 unhealthy, 2 usage or config error.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from deploy_lib import (  # noqa: E402
    DEFAULT_CONFIG,
    STAMP_FMT,
    DeployError,
    Ssh,
    append_record,
    component_for_archive,
    confirm_or_abort,
    list_archives,
    load_config,
    q,
    remote_paths,
    report_services,
    resolve_repo,
    restart_services,
    rollback_component,
    select_target,
    verify_connection,
    wait_healthy,
)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", nargs="?", default="list",
                        help="list | latest | <archive-name>")
    parser.add_argument("--config", help=f"deploy config (default <repo>/{DEFAULT_CONFIG})")
    parser.add_argument("--repo", help="project root (default: git root or cwd)")
    parser.add_argument("--target", help="target name from the config")
    parser.add_argument("--yes", action="store_true", help="skip the interactive confirmation")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        repo = resolve_repo(args.repo)
        config_path = Path(args.config) if args.config else repo / DEFAULT_CONFIG
        cfg = load_config(config_path)
        target = select_target(cfg, args.target)
        project, archive, log = remote_paths(cfg, target)

        ssh = Ssh(target)
        verify_connection(ssh)

        if args.action == "list":
            archives = list_archives(ssh, archive)
            print("Archives (newest first):")
            for name in archives:
                comp = component_for_archive(name, cfg["components"])
                label = f" [{comp['name']}]" if comp else " [unknown]"
                print(f"  {name}{label}")
            if not archives:
                print("  (none)")
            print("\nRecent changes:")
            tail = ssh.run(f"tail -n 20 {q(log)} 2>/dev/null || true", check=False)
            print(tail.stdout.rstrip() or "  (no log)")
            return 0

        archive_name = args.action
        if archive_name == "latest":
            archives = list_archives(ssh, archive)
            if not archives:
                raise DeployError("no archives found")
            archive_name = archives[0]

        comp = component_for_archive(archive_name, cfg["components"])
        if comp is None:
            raise DeployError(
                f"cannot map archive '{archive_name}' to a configured component"
            )
        ssh.run(f"[ -e {q(archive + '/' + archive_name)} ]", check=True)

        print(f"rollback {comp['name']} <- {archive_name} on {target['name']}")
        confirm_or_abort("Proceed?", args.yes)

        stamp = time.strftime(STAMP_FMT)
        rollback_component(ssh, comp, project, archive, log, stamp, archive_name)

        print("==> restart services")
        restart_services(ssh, cfg, project)
        timeout = int((cfg.get("healthcheck") or {}).get("timeout_seconds", 15))
        print(f"waiting up to {timeout}s for health...")
        healthy, detail = wait_healthy(ssh, cfg, timeout)

        print("services:")
        report_services(ssh, cfg, project)
        if healthy:
            record = append_record(
                repo, cfg,
                f"- {stamp} rollback {comp['name']} <- {archive_name} "
                f"-> {target['name']}: healthy",
            )
            if record:
                print(f"record: {record}")
            print("rollback OK")
            return 0

        append_record(
            repo, cfg,
            f"- {stamp} rollback {comp['name']} <- {archive_name} "
            f"-> {target['name']}: unhealthy ({detail})",
        )
        print(f"services unhealthy after rollback ({detail}) - "
              "manual intervention required", file=sys.stderr)
        return 1
    except DeployError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
