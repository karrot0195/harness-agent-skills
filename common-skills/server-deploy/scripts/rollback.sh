#!/bin/bash
# Restore a previous version of a deployed component on the server.
#
# usage: rollback.sh <host> [list|latest|<archive-name|archive-path>]
#
# Archives live in $PROJECT_PATH/archived as <TS>-<component>. The live copy is
# moved aside as <TS>-<component>-pre-rollback first, so a manual rollback is
# itself reversible.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

SERVER=${1:-}
shift || true
ARG=${1:-list}

source "$SCRIPT_DIR/lib.sh"
require_server

if [ "$ARG" = "list" ]; then
    echo "Archives (newest first):"
    remote "ls -1t '$PROJECT_PATH/archived' 2>/dev/null || true"
    echo
    echo "Recent changes:"
    remote "tail -n 20 '$LOG' 2>/dev/null || true"
    exit 0
fi

if [ "$ARG" = "latest" ]; then
    ARG=$(remote "ls -1t '$PROJECT_PATH/archived' 2>/dev/null | head -n1")
    [ -n "$ARG" ] || { echo "No archives found" >&2; exit 1; }
fi

case "$ARG" in
    /*) TARGET="$ARG" ;;
    *) TARGET="$PROJECT_PATH/archived/$ARG" ;;
esac

NAME=$(basename "$TARGET")
remote "[ -e '$TARGET' ]" || { echo "Archive not found: $TARGET" >&2; exit 1; }

case "$NAME" in
    *-client-dist*)
        COMP=client-dist
        DEST="$PROJECT_PATH/client/dist"
        POINTER=.rollback_client
        ;;
    *-bin|*-bin-*)
        COMP=bin
        DEST="$PROJECT_PATH/bin"
        POINTER=.rollback_bin
        ;;
    *-env|*-env-*)
        COMP=env
        DEST="$PROJECT_PATH/.env"
        POINTER=.rollback_env
        ;;
    *-partner|*-partner-*)
        COMP=partner
        DEST="$PROJECT_PATH/partner.yaml"
        POINTER=.rollback_partner
        ;;
    *)
        echo "Unknown archive type: $NAME" >&2
        exit 1
        ;;
esac

echo "Rolling back $COMP <- $NAME"
remote_script <<EOF
set -e
TS="$TS"
DEST="$DEST"
TARGET="$TARGET"
[ -f "$LOG" ] || printf '# Change Log\\n\\n' > "$LOG"
if [ -e "\$DEST" ]; then
    mkdir -p "$PROJECT_PATH/archived"
    mv "\$DEST" "$PROJECT_PATH/archived/\$TS-$COMP-pre-rollback"
fi
mkdir -p "\$(dirname "\$DEST")"
mv "\$TARGET" "\$DEST"
rm -f "$PROJECT_PATH/$POINTER"
echo "\$TS rollback $COMP <- $NAME" >> "$LOG"
EOF

echo "==> restart services"
restart_services
echo "waiting for services to become healthy..."
if wait_healthy 15; then
    report_services
    echo "rollback OK"
    exit 0
fi

report_services
echo "services unhealthy after rollback - manual intervention required" >&2
exit 1
