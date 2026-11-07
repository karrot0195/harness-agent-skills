#!/usr/bin/env python3
"""Deploy configured components to a server target.

Behavior comes from <repo>/.specific/server-deploy.yaml (see
references/server-deploy.template.yaml). Nothing about a specific app is
hardcoded here.

Usage:
  deploy.py [--config PATH] [--target NAME] [--component NAME[,NAME]]
            [--source NAME=PATH] [--no-build] [--dry-run] [--yes] [--repo PATH]

Exit codes: 0 success, 1 unhealthy/rolled back, 2 usage or config error.
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
    clear_pointers,
    confirm_or_abort,
    git_commit,
    init_remote_state,
    load_config,
    log_line,
    q,
    remote_paths,
    report_services,
    resolve_repo,
    restart_services,
    restore_pointer,
    run_builds,
    run_push,
    run_rollout,
    select_target,
    upload_component,
    verify_connection,
    wait_healthy,
)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", help=f"deploy config (default <repo>/{DEFAULT_CONFIG})")
    parser.add_argument("--repo", help="project root (default: git root or cwd)")
    parser.add_argument("--target", help="target name from the config")
    parser.add_argument(
        "--component",
        "--only",
        dest="components",
        action="append",
        default=[],
        help="component(s) to deploy; repeatable or comma-separated",
    )
    parser.add_argument(
        "--source",
        action="append",
        default=[],
        metavar="NAME=PATH",
        help="override a component's local path (e.g. merged env file)",
    )
    parser.add_argument("--no-build", action="store_true", help="skip configured builds")
    parser.add_argument("--dry-run", action="store_true", help="print the plan, touch nothing")
    parser.add_argument("--yes", action="store_true", help="skip the interactive confirmation")
    return parser.parse_args(argv)


def select_components(cfg: dict, wanted: list[str]) -> list[dict]:
    components = [dict(comp) for comp in cfg["components"]]
    names: list[str] = []
    for chunk in wanted:
        names.extend(part.strip() for part in chunk.split(",") if part.strip())
    if not names:
        return components
    index = {comp["name"]: comp for comp in components}
    unknown = [name for name in names if name not in index]
    if unknown:
        raise DeployError(
            "unknown component(s): " + ", ".join(unknown)
            + " (configured: " + ", ".join(index) + ")"
        )
    return [index[name] for name in names]


def apply_sources(components: list[dict], pairs: list[str]) -> None:
    index = {comp["name"]: comp for comp in components}
    for pair in pairs:
        name, sep, path = pair.partition("=")
        if not sep or not name or not path:
            raise DeployError(f"--source expects NAME=PATH, got: {pair}")
        comp = index.get(name)
        if comp is None:
            raise DeployError(
                f"--source: component '{name}' is not selected "
                "(select it with --component)"
            )
        comp["local"] = path


def print_plan(cfg: dict, target: dict, components: list[dict], repo: Path) -> None:
    print(f"target: {target['name']} ({target['user']}@{target['host']}:{target['port']})")
    print(f"remote: {target['project_path']}")
    print(f"repo:   {repo}")
    print("components:")
    for comp in components:
        kind = comp.get("type") or "auto"
        transport = comp.get("transport") or "scp"
        build = "yes" if comp.get("build") else "no"
        print(
            f"  {comp['name']}: {comp['local']} -> "
            f"{target['project_path'].rstrip('/')}/{str(comp['remote']).strip('/')} "
            f"({kind}, {transport}, build={build})"
        )
    services = cfg.get("services") or {}
    units = services.get("units") or []
    print(f"services: {services.get('manager') or 'none'}"
          + (f" {units}" if units else ""))
    checks = (cfg.get("healthcheck") or {}).get("checks") or []
    print(f"health:   {len(checks)} check(s), "
          f"timeout {(cfg.get('healthcheck') or {}).get('timeout_seconds', 15)}s")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        repo = resolve_repo(args.repo)
        config_path = Path(args.config) if args.config else repo / DEFAULT_CONFIG
        cfg = load_config(config_path)
        target = select_target(cfg, args.target)
        components = select_components(cfg, args.components)
        apply_sources(components, args.source)

        if args.dry_run:
            print_plan(cfg, target, components, repo)
            return 0

        names = ",".join(comp["name"] for comp in components) or "(build-only)"
        confirm_or_abort(
            f"Deploy [{names}] to {target['name']} "
            f"({target['user']}@{target['host']}:{target['project_path']})?",
            args.yes,
        )

        if not args.no_build:
            run_builds(cfg, repo, components, target)
            run_push(cfg, repo, target)

        project, archive, log = remote_paths(cfg, target)
        ssh = Ssh(target)
        verify_connection(ssh)
        if ssh.run(f"test -d {q(project)}", check=False).returncode != 0:
            raise DeployError(
                f"remote project_path does not exist: {project} "
                "(prepare the host infrastructure first)"
            )
        init_remote_state(ssh, archive, log)

        stamp = time.strftime(STAMP_FMT)
        commit = git_commit(repo)
        print(f"==> deploy {names} to {target['name']} (commit {commit})")

        uploaded: list[dict] = []
        try:
            for comp in components:
                print(f"==> upload {comp['name']}")
                upload_component(ssh, comp, repo, project, archive, log, stamp)
                uploaded.append(comp)
        except DeployError as exc:
            if uploaded:
                print(
                    f"upload failed ({exc}); restoring {len(uploaded)} "
                    "already-uploaded component(s)",
                    file=sys.stderr,
                )
                for comp in uploaded:
                    restore_pointer(ssh, comp, project, archive, log, stamp)
            raise

        log_line(ssh, log, f"{stamp} deploy ({names}) commit {commit}")

        print("==> restart services")
        restart_services(ssh, cfg, project)
        run_rollout(cfg, repo, target)
        timeout = int((cfg.get("healthcheck") or {}).get("timeout_seconds", 15))
        print(f"waiting up to {timeout}s for health...")
        healthy, detail = wait_healthy(ssh, cfg, timeout)

        if healthy:
            clear_pointers(ssh, components, project)
            log_line(ssh, log, f"{stamp} deploy healthy")
            print("services:")
            report_services(ssh, cfg, project)
            record = append_record(
                repo, cfg,
                f"- {stamp} deploy {names} -> {target['name']} "
                f"commit {commit}: healthy",
            )
            if record:
                print(f"record: {record}")
            print("deploy OK")
            return 0

        print(f"UNHEALTHY ({detail}) - rolling back")
        report_services(ssh, cfg, project)
        for comp in components:
            restore_pointer(ssh, comp, project, archive, log, stamp)

        restart_services(ssh, cfg, project)
        print("re-checking after rollback...")
        healthy, detail = wait_healthy(ssh, cfg, timeout)
        if healthy:
            log_line(ssh, log, f"{stamp} auto-rollback healthy")
            print("services:")
            report_services(ssh, cfg, project)
            record = append_record(
                repo, cfg,
                f"- {stamp} deploy {names} -> {target['name']} "
                f"commit {commit}: unhealthy, auto-rollback",
            )
            if record:
                print(f"record: {record}")
            print("rolled back and healthy")
        else:
            log_line(ssh, log, f"{stamp} auto-rollback STILL UNHEALTHY")
            print("services:")
            report_services(ssh, cfg, project)
            print(
                f"rollback did not restore health ({detail}) - "
                "manual intervention required",
                file=sys.stderr,
            )
        return 1
    except DeployError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
