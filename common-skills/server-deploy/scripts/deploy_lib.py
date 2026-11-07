#!/usr/bin/env python3
"""Shared config, SSH, archive, and health helpers for the server-deploy skill.

Everything here runs locally; all remote work happens over SSH. The deploy
shape comes from <repo>/.specific/server-deploy.yaml, never from this file.
"""

from __future__ import annotations

import os
import posixpath
import re
import shlex
import subprocess
import sys
import tempfile
import time
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None

STAMP_FMT = "%Y%m%d-%H%M%S"
STAMP_RE = re.compile(r"^\d{8}-\d{6}-")
DEFAULT_CONFIG = ".specific/server-deploy.yaml"
DEFAULT_RECORD = ".specific/deploy-history.md"


class DeployError(RuntimeError):
    pass


def q(value: object) -> str:
    return shlex.quote(str(value))


def resolve_repo(explicit: str | None = None) -> Path:
    if explicit:
        return Path(explicit).expanduser().resolve()
    if os.environ.get("DEPLOY_REPO"):
        return Path(os.environ["DEPLOY_REPO"]).expanduser().resolve()
    proc = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], text=True, capture_output=True
    )
    if proc.returncode == 0 and proc.stdout.strip():
        return Path(proc.stdout.strip())
    return Path.cwd()


def load_config(path: str | Path) -> dict:
    config_path = Path(path).expanduser()
    if not config_path.is_file():
        raise DeployError(
            f"deploy config not found: {config_path}\n"
            "Run the first-deploy survey (SKILL.md, 'First deploy') to create it."
        )
    if yaml is None:
        raise DeployError("PyYAML is required: python3 -m pip install pyyaml")
    try:
        data = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        raise DeployError(f"cannot parse {config_path}: {exc}") from exc
    if not isinstance(data, dict):
        raise DeployError(f"{config_path}: top level must be a mapping")

    targets = data.get("targets") or []
    if not targets:
        raise DeployError(f"{config_path}: 'targets' must list at least one target")
    if any(not isinstance(t, dict) or not t.get("name") for t in targets):
        raise DeployError(f"{config_path}: every target needs a non-empty 'name'")

    components = data.get("components") or []
    if not isinstance(components, list):
        raise DeployError(f"{config_path}: 'components' must be a list")
    if any(not isinstance(c, dict) for c in components):
        raise DeployError(f"{config_path}: every component must be a mapping")
    names = [c.get("name") for c in components]
    if any(not n for n in names):
        raise DeployError(f"{config_path}: every component needs a non-empty 'name'")
    if len(set(names)) != len(names):
        raise DeployError(f"{config_path}: component names must be unique")
    for comp in components:
        if not comp.get("local") or not comp.get("remote"):
            raise DeployError(
                f"{config_path}: component '{comp.get('name')}' needs 'local' and 'remote'"
            )
    return data


def select_target(cfg: dict, name: str | None = None) -> dict:
    targets = cfg["targets"]
    wanted = name or os.environ.get("DEPLOY_TARGET") or cfg.get("target")
    if not wanted:
        if len(targets) == 1:
            wanted = targets[0]["name"]
        else:
            known = ", ".join(str(t.get("name")) for t in targets)
            raise DeployError(f"multiple targets configured ({known}); pass --target NAME")
    raw = next((t for t in targets if t.get("name") == wanted), None)
    if raw is None:
        known = ", ".join(str(t.get("name")) for t in targets)
        raise DeployError(f"unknown target '{wanted}' (configured: {known})")

    target = dict(raw)
    target["name"] = wanted
    overrides = {
        "host": "DEPLOY_HOST",
        "user": "DEPLOY_USER",
        "key": "DEPLOY_KEY",
        "port": "DEPLOY_PORT",
        "project_path": "DEPLOY_PROJECT_PATH",
    }
    for field, env_name in overrides.items():
        if os.environ.get(env_name):
            target[field] = os.environ[env_name]

    target["user"] = target.get("user") or "root"
    target["port"] = int(target.get("port") or 22)
    if not target.get("host"):
        raise DeployError(f"target '{wanted}' has no host")
    if not target.get("project_path"):
        raise DeployError(f"target '{wanted}' has no project_path")
    return target


def remote_paths(cfg: dict, target: dict) -> tuple[str, str, str]:
    project = target["project_path"].rstrip("/") or "/"
    remote = cfg.get("remote") or {}
    archive = posixpath.join(project, str(remote.get("archive_dir") or "archived"))
    log = posixpath.join(project, str(remote.get("log_file") or "LOG-CHANGES.md"))
    return project, archive, log


class Ssh:
    def __init__(self, target: dict):
        self.target = target
        self.dest = f"{target['user']}@{target['host']}"
        common = [
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=10",
            "-o",
            "StrictHostKeyChecking=accept-new",
        ]
        key = target.get("key")
        key_args = ["-i", str(Path(key).expanduser())] if key else []
        self.ssh_opts = ["-p", str(target["port"]), *common, *key_args]
        self.scp_opts = ["-P", str(target["port"]), *common, *key_args]

    def run(self, command: str, check: bool = True, stdin: str | None = None):
        proc = subprocess.run(
            ["ssh", *self.ssh_opts, self.dest, command],
            input=stdin,
            text=True,
            capture_output=True,
        )
        if check and proc.returncode != 0:
            raise DeployError(
                f"ssh command failed ({proc.returncode}): {command}\n{proc.stderr.strip()}"
            )
        return proc

    def script(self, body: str, check: bool = True):
        return self.run("bash -s", check=check, stdin=body)

    def scp(self, source: str | Path, dest: str, recursive: bool = False):
        cmd = ["scp", *self.scp_opts]
        if recursive:
            cmd.append("-r")
        cmd.extend([str(source), f"{self.dest}:{dest}"])
        proc = subprocess.run(cmd, text=True, capture_output=True)
        if proc.returncode != 0:
            raise DeployError(f"scp failed ({proc.returncode}): {proc.stderr.strip()}")
        return proc


def verify_connection(ssh: Ssh) -> None:
    try:
        ssh.run("echo ok")
    except DeployError as exc:
        raise DeployError(f"cannot SSH to {ssh.dest}: {exc}") from exc


def init_remote_state(ssh: Ssh, archive: str, log: str) -> None:
    ssh.script(
        f"mkdir -p {q(archive)}\n"
        f"[ -f {q(log)} ] || printf '# Change Log\\n\\n' > {q(log)}\n"
    )


def log_line(ssh: Ssh, log: str, message: str) -> None:
    ssh.script(f"printf '%s\\n' {q(message)} >> {q(log)}\n")


def component_type(comp: dict, repo: Path) -> str:
    if comp.get("type"):
        return str(comp["type"])
    local = Path(comp["local"]).expanduser()
    if not local.is_absolute():
        local = repo / local
    return "dir" if local.is_dir() else "file"


def component_dest(comp: dict, project: str) -> str:
    return posixpath.join(project, str(comp["remote"]).strip("/"))


def archive_component(
    ssh: Ssh, comp: dict, project: str, archive: str, log: str, stamp: str, ctype: str
) -> None:
    name = comp["name"]
    dest = component_dest(comp, project)
    archived = posixpath.join(archive, f"{stamp}-{name}")
    pointer = posixpath.join(project, f".rollback_{name}")
    if ctype == "dir":
        guard = f'[ -e {q(dest)} ] && [ -n "$(ls -A {q(dest)} 2>/dev/null)" ]'
        copy = f"mv {q(dest)} {q(archived)}"
    else:
        guard = f"[ -f {q(dest)} ]"
        copy = f"cp {q(dest)} {q(archived)}"
    ssh.script(
        f"if {guard}; then\n"
        f"    {copy}\n"
        f"    printf '%s\\n' {q(stamp + ' archived ' + name + ' -> ' + archived)} >> {q(log)}\n"
        f"    [ -f {q(pointer)} ] || printf '%s\\n' {q(archived)} > {q(pointer)}\n"
        f"fi\n"
    )


def upload_component(
    ssh: Ssh, comp: dict, repo: Path, project: str, archive: str, log: str, stamp: str
) -> None:
    local = Path(comp["local"]).expanduser()
    if not local.is_absolute():
        local = repo / local
    if not local.exists():
        raise DeployError(f"component '{comp['name']}': local path not found: {local}")

    ctype = component_type(comp, repo)
    transport = str(comp.get("transport") or "scp")
    dest = component_dest(comp, project)
    parent = posixpath.dirname(dest) or project

    archive_component(ssh, comp, project, archive, log, stamp, ctype)

    if ctype == "file":
        ssh.script(f"mkdir -p {q(parent)}\n")
        ssh.scp(local, dest)
        return

    if transport == "tar":
        with tempfile.TemporaryDirectory() as tmp:
            tarball = Path(tmp) / "upload.tar.gz"
            subprocess.run(
                ["tar", "-czf", str(tarball), "-C", str(local.parent), local.name],
                check=True,
            )
            staged = posixpath.join(project, f".upload-{comp['name']}.tar.gz")
            ssh.scp(tarball, staged)
            ssh.script(
                f"set -e\n"
                f"mkdir -p {q(parent)}\n"
                f"rm -rf {q(dest)}\n"
                f"tar -xzf {q(staged)} -C {q(parent)}\n"
                f"rm -f {q(staged)}\n"
            )
        return

    if transport != "scp":
        raise DeployError(f"component '{comp['name']}': unknown transport '{transport}'")
    ssh.script(f"mkdir -p {q(parent)}\nrm -rf {q(dest)}\n")
    ssh.scp(local, dest, recursive=True)


def restart_services(ssh: Ssh, cfg: dict, project: str) -> None:
    services = cfg.get("services") or {}
    if services.get("restart", True) is False:
        return
    manager = services.get("manager") or "none"
    if manager == "none":
        return
    if manager == "systemd":
        units = services.get("units") or []
        body = "systemctl daemon-reload || true\n"
        body += "".join(f"systemctl restart {q(unit)}.service || true\n" for unit in units)
        ssh.script(body, check=False)
        return
    if manager == "compose":
        runtime = services.get("runtime") or "docker"
        compose_file = services.get("compose_file") or "docker-compose.yml"
        pull = services.get("pull", False)
        cmd = f"cd {q(project)} && {runtime} compose -f {q(compose_file)}"
        if pull:
            cmd += " pull"
        cmd += " up -d"
        ssh.run(cmd, check=False)
        return
    raise DeployError(f"unknown services.manager: {manager}")


def run_health_checks(ssh: Ssh, cfg: dict) -> tuple[bool, str]:
    checks = (cfg.get("healthcheck") or {}).get("checks") or []
    if not checks:
        return True, "no health checks configured"
    for check in checks:
        kind = check.get("type") or "command"
        if kind == "systemd":
            for unit in check.get("units") or []:
                if ssh.run(f"systemctl is-active --quiet {q(unit)}", check=False).returncode:
                    return False, f"systemd unit inactive: {unit}"
        elif kind == "http":
            url = check.get("url")
            if not url:
                return False, "http check without url"
            accept = {str(code) for code in (check.get("accept_status") or [200])}
            timeout = int(check.get("timeout_seconds") or 3)
            proc = ssh.run(
                f"curl -s -o /dev/null -w '%{{http_code}}' --max-time {timeout} {q(url)}",
                check=False,
            )
            code = proc.stdout.strip()
            if code not in accept:
                return False, f"http {url} -> {code or 'unreachable'}"
        elif kind == "command":
            command = check.get("run")
            if not command:
                return False, "command check without run"
            if ssh.script(command, check=False).returncode:
                return False, f"command failed: {command}"
        elif kind == "none":
            continue
        else:
            return False, f"unknown healthcheck type: {kind}"
    return True, "healthy"


def wait_healthy(ssh: Ssh, cfg: dict, timeout: int) -> tuple[bool, str]:
    deadline = time.time() + max(timeout, 0)
    while True:
        ok, detail = run_health_checks(ssh, cfg)
        if ok:
            return True, detail
        if time.time() >= deadline:
            return False, detail
        time.sleep(1)


def report_services(ssh: Ssh, cfg: dict, project: str) -> None:
    services = cfg.get("services") or {}
    manager = services.get("manager") or "none"
    if manager == "systemd":
        for unit in services.get("units") or []:
            proc = ssh.run(f"systemctl is-active {q(unit)}", check=False)
            print(f"  {unit}: {proc.stdout.strip() or 'unknown'}")
    elif manager == "compose":
        runtime = services.get("runtime") or "docker"
        proc = ssh.run(
            f"cd {q(project)} && {runtime} compose -f "
            f"{q(services.get('compose_file') or 'docker-compose.yml')} ps",
            check=False,
        )
        if proc.stdout.strip():
            print(proc.stdout.rstrip())
    for check in (cfg.get("healthcheck") or {}).get("checks") or []:
        if check.get("type") == "http" and check.get("url"):
            proc = ssh.run(
                f"curl -s -o /dev/null -w '%{{http_code}}' --max-time "
                f"{int(check.get('timeout_seconds') or 3)} {q(check['url'])}",
                check=False,
            )
            print(f"  http {check['url']}: {proc.stdout.strip() or 'unreachable'}")


def restore_pointer(
    ssh: Ssh, comp: dict, project: str, archive: str, log: str, stamp: str
) -> None:
    name = comp["name"]
    dest = component_dest(comp, project)
    pointer = posixpath.join(project, f".rollback_{name}")
    failed = posixpath.join(archive, f"{stamp}-{name}-failed-{os.getpid()}")
    body = (
        "set -e\n"
        f'P={q(pointer)}\n'
        'if [ -f "$P" ]; then\n'
        '    target=$(cat "$P")\n'
        '    if [ -e "$target" ]; then\n'
        f"        if [ -e {q(dest)} ]; then\n"
        f"            mkdir -p {q(archive)}\n"
        f"            mv {q(dest)} {q(failed)}\n"
        "        fi\n"
        f"        mkdir -p {q(posixpath.dirname(dest))}\n"
        f'        mv "$target" {q(dest)}\n'
        '        rm -f "$P"\n'
        f"        printf '%s\\n' {q(stamp + ' auto-rollback ' + name)} >> {q(log)}\n"
        "    fi\n"
        "fi\n"
    )
    ssh.script(body)


def clear_pointers(ssh: Ssh, comps: list[dict], project: str) -> None:
    pointers = " ".join(q(posixpath.join(project, f".rollback_{c['name']}")) for c in comps)
    if pointers:
        ssh.script(f"rm -f {pointers}\n", check=False)


def list_archives(ssh: Ssh, archive: str) -> list[str]:
    proc = ssh.run(f"ls -1t {q(archive)} 2>/dev/null || true", check=False)
    return [line.strip() for line in proc.stdout.splitlines() if line.strip()]


def component_for_archive(name: str, components: list[dict]) -> dict | None:
    remainder = STAMP_RE.sub("", name)
    for comp in sorted(components, key=lambda c: len(c["name"]), reverse=True):
        comp_name = comp["name"]
        if (
            remainder == comp_name
            or remainder == f"{comp_name}-pre-rollback"
            or re.fullmatch(re.escape(comp_name) + r"-failed-\d+", remainder)
        ):
            return comp
    return None


def rollback_component(
    ssh: Ssh, comp: dict, project: str, archive: str, log: str, stamp: str, archive_name: str
) -> None:
    dest = component_dest(comp, project)
    target = posixpath.join(archive, archive_name)
    pointer = posixpath.join(project, f".rollback_{comp['name']}")
    aside = posixpath.join(archive, f"{stamp}-{comp['name']}-pre-rollback")
    ssh.script(
        "set -e\n"
        f"[ -f {q(log)} ] || printf '# Change Log\\n\\n' > {q(log)}\n"
        f"if [ -e {q(dest)} ]; then\n"
        f"    mkdir -p {q(archive)}\n"
        f"    mv {q(dest)} {q(aside)}\n"
        "fi\n"
        f"mkdir -p {q(posixpath.dirname(dest))}\n"
        f"mv {q(target)} {q(dest)}\n"
        f"rm -f {q(pointer)}\n"
        f"printf '%s\\n' {q(stamp + ' rollback ' + comp['name'] + ' <- ' + archive_name)} >> {q(log)}\n"
    )


def run_shell(command: str | list, cwd: Path) -> None:
    if isinstance(command, list):
        command = " && ".join(str(part) for part in command)
    proc = subprocess.run(str(command), shell=True, cwd=str(cwd))
    if proc.returncode != 0:
        raise DeployError(f"command failed ({proc.returncode}): {command}")


def _steps(cfg: dict, key: str, target: dict | None = None) -> list:
    target_name = (target or {}).get("name", "")
    # Per-target override takes precedence over global
    if target and isinstance(target.get(key), dict):
        steps = list(target[key].get("steps") or [])
    else:
        steps = list((cfg.get(key) or {}).get("steps") or [])
    return steps, target_name


def run_phase(cfg: dict, repo: Path, comps: list[dict], target: dict | None,
              phase: str, label: str) -> None:
    steps, target_name = _steps(cfg, phase, target)
    for step in steps:
        if step.get("run"):
            cmd = str(step["run"]).replace("{target}", target_name)
            print(f"==> {label}: {step.get('name') or 'step'}")
            run_shell(cmd, repo)
    if phase == "build":
        for comp in comps:
            if comp.get("build"):
                cmd = str(comp["build"]).replace("{target}", target_name)
                print(f"==> build {comp['name']}")
                run_shell(cmd, repo)


def run_builds(cfg: dict, repo: Path, comps: list[dict], target: dict | None = None) -> None:
    run_phase(cfg, repo, comps, target, "build", "build")

def run_push(cfg: dict, repo: Path, target: dict | None = None) -> None:
    run_phase(cfg, repo, [], target, "push", "push")

def run_rollout(cfg: dict, repo: Path, target: dict | None = None) -> None:
    run_phase(cfg, repo, [], target, "rollout", "rollout")


def git_commit(repo: Path) -> str:
    proc = subprocess.run(
        ["git", "-C", str(repo), "rev-parse", "--short", "HEAD"],
        text=True,
        capture_output=True,
    )
    return proc.stdout.strip() if proc.returncode == 0 else "unknown"


def append_record(repo: Path, cfg: dict, line: str) -> Path | None:
    rel = (cfg.get("record") or {}).get("file", DEFAULT_RECORD)
    if not rel:
        return None
    path = repo / str(rel)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(line.rstrip() + "\n")
    return path


def confirm_or_abort(question: str, assume_yes: bool) -> None:
    if assume_yes:
        return
    if not sys.stdin.isatty():
        raise DeployError("refusing to run without --yes in a non-interactive shell")
    answer = input(f"{question} [y/N] ").strip().lower()
    if answer not in ("y", "yes"):
        raise SystemExit("aborted")
