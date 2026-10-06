#!/usr/bin/env bash
# Replaces the deployed launchpad's code in place: same address, same memes and positions.
source "$(dirname "$0")/lib.sh"

log "building contracts"
(cd "$ROOT" && stellar contract build >/dev/null)

log "uploading launchpad wasm"
HASH=$(stellar contract upload --network "$NET" --source "$ADMIN" --wasm "$WASM_DIR/launchpad.wasm")
invoke "$ADMIN" "$(json_get .launchpad)" upgrade --wasm_hash "$HASH" >/dev/null
extend_code "$HASH"
json_set ".launchpad_wasm = \"$HASH\" | .upgraded_at = \"$(date -u +%FT%TZ)\""
log "launchpad now runs $HASH"
