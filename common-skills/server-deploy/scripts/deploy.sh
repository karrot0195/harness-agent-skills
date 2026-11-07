#!/bin/bash
# Deploy the SimLive application to a prepared server.
#
# Ships only: cmd/api, cmd/engines, cmd/planner binaries, client/dist, and
# optionally .env + partner.yaml from .config/<env>/.
# Server infrastructure (systemd units, docker-compose, nginx, rclone) is set
# up manually on the host and is never uploaded by this script.
#
# usage: deploy.sh <host> [--env-name prod] [--only bin,client,env,partner] [--env-file path]
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../../../.." && pwd)

SERVER=${1:-}
shift || true

ENV_NAME=prod
ONLY=""
ENV_FILE=""

while [ $# -gt 0 ]; do
    case "$1" in
        --env-name) ENV_NAME=${2:?}; shift 2 ;;
        --only) ONLY=${2:?}; shift 2 ;;
        --env-file) ENV_FILE=${2:?}; shift 2 ;;
        -h|--help)
            echo "usage: $0 <host> [--env-name prod] [--only bin,client,env,partner] [--env-file path]"
            exit 0
            ;;
        *) echo "unknown option: $1" >&2; exit 2 ;;
    esac
done

source "$SCRIPT_DIR/lib.sh"
require_server

COMPONENTS=${ONLY:-bin,client,env,partner}
want() { case ",$COMPONENTS," in *",$1,"*) return 0 ;; *) return 1 ;; esac; }

SRC_ENV="$REPO_ROOT/.config/$ENV_NAME/.env"
SRC_PARTNER="$REPO_ROOT/.config/$ENV_NAME/partner.yaml"

missing=()
if want env && [ ! -f "$SRC_ENV" ]; then missing+=("$SRC_ENV"); fi
if want partner && [ ! -f "$SRC_PARTNER" ]; then missing+=("$SRC_PARTNER"); fi
if [ ${#missing[@]} -gt 0 ]; then
    printf 'Missing deploy config:\n' >&2
    printf '  %s\n' "${missing[@]}" >&2
    echo "Ask the user to prepare .config/$ENV_NAME/{.env,partner.yaml} first (.config/prod/ shows the expected shape), or re-run with --only bin,client." >&2
    exit 3
fi

if want env; then
    [ -n "$ENV_FILE" ] || ENV_FILE=$SRC_ENV
    [ -f "$ENV_FILE" ] || { echo "env file not found: $ENV_FILE" >&2; exit 3; }
fi

COMMIT=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)
echo "==> target $SSH_USER@$SERVER:$PROJECT_PATH (env=$ENV_NAME, components=$COMPONENTS, commit=$COMMIT)"
init_remote_state

if want bin; then
    echo "==> build api, planner, engines"
    mkdir -p "$REPO_ROOT/config/bin"
    for svc in api planner engines; do
        (cd "$REPO_ROOT" && go build -o "config/bin/$svc" "./cmd/$svc/")
    done
fi

if want client; then
    echo "==> build client"
    (cd "$REPO_ROOT/client" && pnpm build)
    [ -d "$REPO_ROOT/client/dist" ] || { echo "client/dist missing after build" >&2; exit 1; }
fi

if want bin; then
    echo "==> upload bin (previous archived)"
    archive_dir "$PROJECT_PATH/bin" bin .rollback_bin
    remote "rm -rf '$PROJECT_PATH/bin' && mkdir -p '$PROJECT_PATH/bin'"
    scp_to "$REPO_ROOT/config/bin/api" "$REPO_ROOT/config/bin/planner" "$REPO_ROOT/config/bin/engines" \
        "$SSH_USER@$SERVER:$PROJECT_PATH/bin/"
fi

if want client; then
    echo "==> upload client/dist (previous archived)"
    archive_dir "$PROJECT_PATH/client/dist" client-dist .rollback_client
    tmp=$(mktemp -d)
    tar -cf "$tmp/dist.tar.gz" -C "$REPO_ROOT" client/dist
    scp_to "$tmp/dist.tar.gz" "$SSH_USER@$SERVER:$PROJECT_PATH/"
    remote "cd '$PROJECT_PATH' && mkdir -p client && rm -rf client/dist && tar -xf dist.tar.gz && rm -f dist.tar.gz"
    rm -rf "$tmp"
fi

if want env; then
    echo "==> upload .env (previous archived)"
    archive_file "$PROJECT_PATH/.env" env .rollback_env
    scp_to "$ENV_FILE" "$SSH_USER@$SERVER:$PROJECT_PATH/.env"
fi

if want partner; then
    echo "==> upload partner.yaml (previous archived)"
    archive_file "$PROJECT_PATH/partner.yaml" partner .rollback_partner
    scp_to "$SRC_PARTNER" "$SSH_USER@$SERVER:$PROJECT_PATH/partner.yaml"
fi

remote "echo '$TS deploy ($COMPONENTS) commit $COMMIT' >> '$LOG'"

echo "==> restart services"
restart_services
echo "waiting for services to become healthy..."
if wait_healthy 15; then
    remote "rm -f '$PROJECT_PATH/.rollback_bin' '$PROJECT_PATH/.rollback_client' '$PROJECT_PATH/.rollback_env' '$PROJECT_PATH/.rollback_partner'
            echo '$TS deploy healthy' >> '$LOG'"
    report_services
    echo "deploy OK"
    exit 0
fi

echo "UNHEALTHY after restart - rolling back"
report_services
restore_pointer .rollback_env "$PROJECT_PATH/.env" env
restore_pointer .rollback_partner "$PROJECT_PATH/partner.yaml" partner
restore_pointer .rollback_bin "$PROJECT_PATH/bin" bin
restore_pointer .rollback_client "$PROJECT_PATH/client/dist" client-dist

restart_services
echo "re-checking after rollback..."
if wait_healthy 15; then
    remote "echo '$TS auto-rollback healthy' >> '$LOG'"
    report_services
    echo "rolled back and healthy"
else
    remote "echo '$TS auto-rollback STILL UNHEALTHY' >> '$LOG'"
    report_services
    echo "rollback did not restore health - manual intervention required" >&2
fi
exit 1
