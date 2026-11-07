#!/bin/bash
# Shared helpers for the SimLive server-deploy skill.
# Everything here runs locally; all remote work happens over SSH.

PROJECT_PATH="${PROJECT_PATH:-/root/simlive-go}"
SSH_USER="${SSH_USER:-root}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/partner_vultr}"
TS="${TS:-$(date +%Y%m%d-%H%M%S)}"
LOG="$PROJECT_PATH/LOG-CHANGES.md"

SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new)

remote() { ssh "${SSH_OPTS[@]}" "$SSH_USER@$SERVER" "$@"; }
remote_script() { ssh "${SSH_OPTS[@]}" "$SSH_USER@$SERVER" 'bash -s'; }
scp_to() { scp "${SSH_OPTS[@]}" "$@"; }

require_server() {
    [ -n "${SERVER:-}" ] || { echo "Error: pass the server host as the first argument." >&2; exit 2; }
    [ -f "$SSH_KEY" ] || { echo "Error: SSH key not found: $SSH_KEY (override with SSH_KEY=...)" >&2; exit 2; }
    command -v ssh >/dev/null 2>&1 || { echo "Error: ssh not installed." >&2; exit 2; }
    remote 'echo ok' >/dev/null 2>&1 || {
        echo "Error: cannot SSH to $SSH_USER@$SERVER with key $SSH_KEY" >&2
        exit 2
    }
}

init_remote_state() {
    remote "mkdir -p '$PROJECT_PATH/archived'
            [ -f '$LOG' ] || printf '# Change Log\n\n' > '$LOG'"
}

# archive_dir <remote-path> <component> <pointer>
# Moves an existing non-empty directory aside and pins the first archive of
# this deploy session as the rollback target.
archive_dir() {
    local path="$1" comp="$2" pointer="$3"
    remote "if [ -e '$path' ] && [ -n \"\$(ls -A '$path' 2>/dev/null)\" ]; then
                mv '$path' '$PROJECT_PATH/archived/$TS-$comp'
                echo '$TS archived $comp -> archived/$TS-$comp' >> '$LOG'
                [ -f '$PROJECT_PATH/$pointer' ] || echo '$PROJECT_PATH/archived/$TS-$comp' > '$PROJECT_PATH/$pointer'
            fi"
}

# archive_file <remote-path> <component> <pointer>
# Copies an existing file aside (the live file is replaced by the upload).
archive_file() {
    local path="$1" comp="$2" pointer="$3"
    remote "if [ -f '$path' ]; then
                cp '$path' '$PROJECT_PATH/archived/$TS-$comp'
                echo '$TS archived $comp -> archived/$TS-$comp' >> '$LOG'
                [ -f '$PROJECT_PATH/$pointer' ] || echo '$PROJECT_PATH/archived/$TS-$comp' > '$PROJECT_PATH/$pointer'
            fi"
}

is_healthy() {
    remote 'for svc in simlive-planner simlive-engines simlive-api; do
                systemctl is-active --quiet "$svc" || exit 1
            done
            if command -v curl >/dev/null 2>&1; then
                curl -s -o /dev/null --max-time 3 http://127.0.0.1:8080/ || exit 1
            fi' >/dev/null 2>&1
}

wait_healthy() {
    local timeout="${1:-15}" i
    for ((i = 1; i <= timeout; i++)); do
        sleep 1
        is_healthy && return 0
    done
    return 1
}

restart_services() {
    remote 'systemctl daemon-reload || true
            for svc in simlive-planner simlive-engines simlive-api; do
                systemctl restart "$svc.service" || true
            done' || true
}

report_services() {
    remote_script <<'EOF'
for svc in simlive-planner simlive-engines simlive-api; do
    if systemctl is-active --quiet "$svc"; then
        echo "  $svc: active"
    else
        echo "  $svc: INACTIVE"
    fi
done
if command -v curl >/dev/null 2>&1; then
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:8080/ || true)
    echo "  api http: ${code:-unreachable}"
fi
EOF
}

# restore_pointer <pointer-file> <remote-dest> <component>
restore_pointer() {
    local pointer="$1" dest="$2" comp="$3"
    remote_script <<EOF
set -e
P="$PROJECT_PATH/$pointer"
if [ -f "\$P" ]; then
    target=\$(cat "\$P")
    if [ -e "\$target" ]; then
        if [ -e "$dest" ]; then
            mkdir -p "$PROJECT_PATH/archived"
            mv "$dest" "$PROJECT_PATH/archived/$TS-$comp-failed-\$\$"
        fi
        mkdir -p "\$(dirname "$dest")"
        mv "\$target" "$dest"
        rm -f "\$P"
        echo "$TS auto-rollback $comp <- \$(basename "\$target")" >> "$LOG"
    fi
fi
EOF
}
