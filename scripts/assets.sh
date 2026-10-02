#!/usr/bin/env bash
# Builds the contracts and deploys the three test RWAs (tCETES, tUSTRY, tNVDA).
source "$(dirname "$0")/lib.sh"

ensure_key "$ADMIN"
log "building contracts"
(cd "$ROOT" && stellar contract build >/dev/null)

deploy_rwa() { # symbol name faucet_amount
  log "deploying $1"
  stellar contract deploy --network "$NET" --source "$ADMIN" \
    --wasm "$WASM_DIR/rwa_mock.wasm" --alias "garfio-$1" \
    -- --name "$2" --symbol "$1" --faucet_amount "$(units "$3")"
}

T_CETES=$(deploy_rwa tCETES "Test CETES (Etherfuse mock)" 1000)
T_USTRY=$(deploy_rwa tUSTRY "Test USTRY (Etherfuse mock)" 1000)
T_NVDA=$(deploy_rwa tNVDA "Test NVDA" 5)

json_set ".network = \"$NET\" | .pairs = {
  tCETES: {id: \"$T_CETES\", v_pair0: \"$(units 3000)\"},
  tUSTRY: {id: \"$T_USTRY\", v_pair0: \"$(units 3000)\"},
  tNVDA:  {id: \"$T_NVDA\",  v_pair0: \"$(units 16)\"}
}"
log "pairs written to $DEPLOY_JSON"
