#!/usr/bin/env bash
# Builds the contracts, deploys a new launchpad wired to Soroswap and allows Etherfuse's bonds.
# Usage: [NET=mainnet] [PAIRS="CETES TESOURO USTRY"] ./scripts/deploy.sh
source "$(dirname "$0")/lib.sh"

# Soroswap's factory: github.com/soroswap/core/blob/main/public/{testnet,mainnet}.contracts.json
case "$NET" in
# The router is only for the app: it trades graduated memes against their pool.
case "$NET" in
  testnet) DEFAULT_FACTORY=CDP3HMUH6SMS3S7NPGNDJLULCOXXEPSHY4JKUKMBNQMATHDHWXRRJTBY DEFAULT_ROUTER=CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD ;;
  mainnet) DEFAULT_FACTORY=CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2 DEFAULT_ROUTER=CAG5LRYQ5JVEUI5TEID72EYOVX44TTUJT5BQR2J6J77FH65PCCFAJDDH ;;
esac
AMM_FACTORY="${AMM_FACTORY:-$DEFAULT_FACTORY}"
AMM_ROUTER="${AMM_ROUTER:-$DEFAULT_ROUTER}"
PAIRS="${PAIRS:-CETES TESOURO USTRY}"

ensure_key "$ADMIN"
log "building contracts"
(cd "$ROOT" && stellar contract build >/dev/null)

log "uploading meme-token wasm"
MEME_HASH=$(stellar contract upload --network "$NET" --source "$ADMIN" --wasm "$WASM_DIR/meme_token.wasm")

log "deploying launchpad"
LAUNCHPAD=$(stellar contract deploy --network "$NET" --source "$ADMIN" \
  --wasm "$WASM_DIR/launchpad.wasm" --alias "garfio-launchpad-$NET" \
  -- --admin "$ADMIN" --meme_wasm "$MEME_HASH" --amm_factory "$AMM_FACTORY")

echo '{}' >"$DEPLOY_JSON"
json_set ".network = \"$NET\" | .launchpad = \"$LAUNCHPAD\" | .admin = \"$(stellar keys address "$ADMIN")\" |
  .meme_wasm = \"$MEME_HASH\" | .amm_factory = \"$AMM_FACTORY\" | .amm_router = \"$AMM_ROUTER\" | .deployed_at = \"$(date -u +%FT%TZ)\" | .pairs = {}"
log "launchpad $LAUNCHPAD"
extend_code "$(shasum -a 256 "$WASM_DIR/launchpad.wasm" | cut -c1-64)"

for symbol in $PAIRS; do "$(dirname "$0")/etherfuse-pair.sh" "$symbol"; done

# Typed TS clients for the app (single files, no extra package to build). The meme token's
# client reads any SEP-41 balance, the bonds included.
for pair in "launchpad:launchpad" "meme_token:token"; do
  wasm="${pair%%:*}" out="${pair##*:}" tmp="$(mktemp -d)"
  # the output dir doubles as the npm package name, so it must be lowercase
  stellar contract bindings typescript --wasm "$WASM_DIR/$wasm.wasm" --output-dir "$tmp/$out" --overwrite >/dev/null
  cp "$tmp/$out/src/index.ts" "$ROOT/app/src/contracts/$out.ts"
  rm -rf "$tmp"
done
log "bindings written to app/src/contracts/"
