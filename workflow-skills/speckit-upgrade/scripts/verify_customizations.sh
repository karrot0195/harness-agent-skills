#!/usr/bin/env bash
# Verify that the .specific layout customizations are applied.
#
# Usage: verify_customizations.sh [target_project]
#
# The source repository (this skill's git root) is always checked. When a
# target project is given, its installed .specify/ copy and .specific/ config
# are checked too. Exit 0 when every check passes, 1 otherwise.

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || true)"
TARGET="${1:-}"

if [ -z "$SOURCE_ROOT" ]; then
    echo "FAIL  cannot resolve source root from $SCRIPT_DIR"
    exit 1
fi

FAILURES=0

pass() { printf 'PASS  %s\n' "$1"; }
skip() { printf 'SKIP  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; FAILURES=$((FAILURES + 1)); }

check_absent() {
    local label="$1"
    local pattern="$2"
    shift 2
    local hits
    hits="$(grep -rn --include='*.md' --include='*.py' --include='*.sh' -e "$pattern" "$@" 2>/dev/null || true)"
    if [ -n "$hits" ]; then
        fail "$label"
        printf '%s\n' "$hits" | sed 's/^/      /'
    else
        pass "$label"
    fi
}

check_resolver() {
    local resolver="$1"
    local label="${resolver#"$SOURCE_ROOT"/}"
    if [ ! -f "$resolver" ]; then
        fail "resolver missing: $resolver"
        return
    fi
    if grep -q '\.specify/presets' "$resolver" || grep -q '\.specify/extensions' "$resolver"; then
        fail "resolver still uses .specify layers: $label"
    elif grep -q '\.specific/presets' "$resolver" && grep -q '\.specific/extensions' "$resolver"; then
        pass "resolver uses .specific layers: $label"
    else
        fail "resolver does not reference .specific layers: $label"
    fi
}

# 1. Skills must not read the upstream extension or preset paths.
check_absent "workflow-skills: no .specify/extensions.yml" \
    '\.specify/extensions\.yml' "$SOURCE_ROOT/workflow-skills"
check_absent "workflow-skills: no .specify/presets" \
    '\.specify/presets' "$SOURCE_ROOT/workflow-skills"
check_absent "workflow-skills: no .specify/extensions/" \
    '\.specify/extensions/' "$SOURCE_ROOT/workflow-skills"

# 2. Reader skills must use .specific/constitution.yaml; the constitution
#    skill legitimately keeps the standard .specify/memory/constitution.md.
hits="$(grep -rn --include='*.md' '\.specify/memory/constitution\.md' \
    "$SOURCE_ROOT/workflow-skills" 2>/dev/null | grep -v '/speckit-constitution/' || true)"
if [ -n "$hits" ]; then
    fail "workflow-skills: reader skills use .specific/constitution.yaml"
    printf '%s\n' "$hits" | sed 's/^/      /'
else
    pass "workflow-skills: reader skills use .specific/constitution.yaml"
fi

# 3. The constitution skill must keep the standard write and add the mirror.
CONSTITUTION_SKILL="$SOURCE_ROOT/workflow-skills/speckit-constitution/SKILL.md"
if [ -f "$CONSTITUTION_SKILL" ] \
    && grep -q '\.specify/memory/constitution\.md' "$CONSTITUTION_SKILL" \
    && grep -q '\.specific/constitution\.yaml' "$CONSTITUTION_SKILL"; then
    pass "speckit-constitution: standard write plus .specific mirror"
else
    fail "speckit-constitution: standard write plus .specific mirror"
fi

# 4. Resolvers must read presets/extensions from .specific/.
check_resolver "$SOURCE_ROOT/.specify/scripts/python/common.py"
check_resolver "$SOURCE_ROOT/.specify/scripts/bash/common.sh"

# 5. Syntax checks.
if python3 -m py_compile "$SOURCE_ROOT/.specify/scripts/python/common.py" 2>/dev/null; then
    pass "common.py compiles"
else
    fail "common.py does not compile"
fi
if bash -n "$SOURCE_ROOT/.specify/scripts/bash/common.sh" 2>/dev/null; then
    pass "common.sh parses"
else
    fail "common.sh does not parse"
fi

# 6. Template resolution must still succeed.
if python3 "$SOURCE_ROOT/.specify/scripts/python/resolve_template.py" \
    constitution-template --json >/dev/null 2>&1; then
    pass "resolve_template.py constitution-template succeeds"
else
    fail "resolve_template.py constitution-template fails"
fi

# 7. Target project checks (optional).
if [ -n "$TARGET" ]; then
    if [ ! -d "$TARGET" ]; then
        fail "target is not a directory: $TARGET"
    else
        EXTENSIONS_FILE="$TARGET/.specific/extensions.yml"
        if [ -f "$EXTENSIONS_FILE" ]; then
            if python3 -c 'import sys, yaml; yaml.safe_load(open(sys.argv[1]))' "$EXTENSIONS_FILE" 2>/dev/null; then
                pass "target .specific/extensions.yml exists and parses as YAML"
            else
                fail "target .specific/extensions.yml exists but does not parse as YAML"
            fi
        else
            fail "target .specific/extensions.yml is missing"
        fi

        MANIFEST="$TARGET/.specify/.install-manifest.json"
        if [ -f "$MANIFEST" ]; then
            if python3 -c 'import json, sys; json.load(open(sys.argv[1]))' "$MANIFEST" 2>/dev/null; then
                if grep -q '"\.specific/extensions\.yml"' "$MANIFEST"; then
                    pass "target .install-manifest.json tracks .specific/extensions.yml"
                else
                    fail "target .install-manifest.json does not track .specific/extensions.yml"
                fi
            else
                fail "target .install-manifest.json does not parse as JSON"
            fi
        else
            skip "target .install-manifest.json absent"
        fi

        check_resolver "$TARGET/.specify/scripts/python/common.py"
        check_resolver "$TARGET/.specify/scripts/bash/common.sh"
    fi
fi

echo
if [ "$FAILURES" -eq 0 ]; then
    echo "OK: all customization checks passed"
    exit 0
fi
echo "FAILED: $FAILURES check(s)"
exit 1
