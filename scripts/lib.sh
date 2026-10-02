#!/usr/bin/env bash
# Shared helpers for the testnet scripts.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NET="${NET:-testnet}"
ADMIN="${ADMIN:-garfio-admin}"
WASM_DIR="$ROOT/target/wasm32v1-none/release"
DEPLOY_JSON="$ROOT/deployments/$NET.json"

log() { printf '\033[1m▸ %s\033[0m\n' "$*" >&2; }

# Creates and funds a local identity once.
ensure_key() {
  if ! stellar keys address "$1" >/dev/null 2>&1; then
    log "creating identity $1"
    stellar keys generate "$1" --network "$NET" --fund >/dev/null
  fi
}

# 7-decimal amount → base units ("1.5" → 15000000).
units() { awk -v a="$1" 'BEGIN { printf "%.0f", a * 10000000 }'; }

json_get() { jq -r "$1" "$DEPLOY_JSON"; }

json_set() {
  [ -f "$DEPLOY_JSON" ] || echo '{}' >"$DEPLOY_JSON"
  local tmp; tmp="$(mktemp)"
  jq "$1" "$DEPLOY_JSON" >"$tmp" && mv "$tmp" "$DEPLOY_JSON"
}

invoke() {
  local src="$1" id="$2"; shift 2
  stellar contract invoke --network "$NET" --source "$src" --id "$id" -- "$@"
}
