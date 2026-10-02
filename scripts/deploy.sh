#!/usr/bin/env bash
# Uploads the meme token, deploys the launchpad and allows the three pairs.
source "$(dirname "$0")/lib.sh"

ensure_key "$ADMIN"
log "uploading meme-token wasm"
MEME_HASH=$(stellar contract upload --network "$NET" --source "$ADMIN" --wasm "$WASM_DIR/meme_token.wasm")

log "deploying launchpad"
LAUNCHPAD=$(stellar contract deploy --network "$NET" --source "$ADMIN" \
  --wasm "$WASM_DIR/launchpad.wasm" --alias garfio-launchpad \
  -- --admin "$ADMIN" --meme_wasm "$MEME_HASH")

for sym in tCETES tUSTRY tNVDA; do
  log "add_pair $sym"
  invoke "$ADMIN" "$LAUNCHPAD" add_pair \
    --pair "$(json_get ".pairs.$sym.id")" --v_pair0 "$(json_get ".pairs.$sym.v_pair0")" >/dev/null
done

json_set ".launchpad = \"$LAUNCHPAD\" | .meme_wasm = \"$MEME_HASH\" | .deployed_at = \"$(date -u +%FT%TZ)\""
log "launchpad $LAUNCHPAD"

# Typed TS clients for the app (single files, no extra package to build)
for pair in "launchpad:launchpad" "rwa_mock:rwa"; do
  wasm="${pair%%:*}" out="${pair##*:}" tmp="$(mktemp -d)"
  stellar contract bindings typescript --wasm "$WASM_DIR/$wasm.wasm" --output-dir "$tmp" --overwrite >/dev/null
  cp "$tmp/src/index.ts" "$ROOT/app/src/contracts/$out.ts"
  rm -rf "$tmp"
done
log "bindings written to app/src/contracts/"
