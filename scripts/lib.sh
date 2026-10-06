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
  cp "$DEPLOY_JSON" "$ROOT/app/src/contracts/deployments.$NET.json"
}

invoke() {
  local src="$1" id="$2"; shift 2
  stellar contract invoke --network "$NET" --source "$src" --id "$id" -- "$@"
}

# New code starts at the network's minimum TTL, and the launchpad's first call after that would
# extend it to 120 days at the caller's expense. The admin pays that once instead.
extend_code() {
  stellar contract extend --network "$NET" --source-account "$ADMIN" --wasm-hash "$1" \
    --ledgers-to-extend 2073600 --durability persistent >/dev/null
}

# Dollars → base units of a pair in the deployment ("CETES" 10 → about 151 CETES).
usd_units() { units "$(awk -v a="$2" -v p="$(json_get ".pairs.$1.usd")" 'BEGIN { printf "%.7f", a / p }')"; }

# A pair's contract id in the deployment.
pair_id() { json_get ".pairs.$1.id"; }

# Base units of `asset` (a pair symbol) the identity holds, via its Stellar asset contract.
balance() { invoke "$1" "$(pair_id "$2")" balance --id "$(stellar keys address "$1")" | tr -d '"'; }
