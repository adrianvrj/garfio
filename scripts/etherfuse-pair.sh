#!/usr/bin/env bash
# Allows an Etherfuse stablebond as a pair, with a curve and a create fee sized in dollars. On
# testnet it is the sandbox issuer's token, which the app prices at the production NAV and rate:
# the token is sandbox, the instrument is the real one. On mainnet it is the real token.
# Usage: START_USD=300 CREATE_FEE_USD=1 ./scripts/etherfuse-pair.sh [SYMBOL]   (default CETES)
source "$(dirname "$0")/lib.sh"

SYMBOL="${1:-CETES}"
# Virtual reserve the curve starts with: it sets the opening price, and graduation happens at
# about 2.93 times it, which caps what one meme's reserve can hold.
START_USD="${START_USD:-300}"
CREATE_FEE_USD="${CREATE_FEE_USD:-1}"

LOOKUP=https://api.sand.etherfuse.com/lookup
[ "$NET" = mainnet ] && LOOKUP=https://api.etherfuse.com/lookup

ISSUER=$(curl -fsS "$LOOKUP/stablebonds" |
  jq -r --arg s "$SYMBOL" '.stablebonds[] | select(.symbol == $s) | .blockchains[] | select(.blockchain == "stellar") | .tokenIdentifier' | head -1)
[ -n "$ISSUER" ] || { log "$SYMBOL is not on Stellar at $LOOKUP"; exit 1; }
ASSET="${ISSUER/-/:}"
SAC=$(stellar contract id asset --asset "$ASSET" --network "$NET")
if ! stellar contract info interface --id "$SAC" --network "$NET" >/dev/null 2>&1; then
  log "deploying the asset contract for $ASSET"
  stellar contract asset deploy --asset "$ASSET" --network "$NET" --source "$ADMIN" >/dev/null
fi

COST=$(curl -fsS https://api.etherfuse.com/lookup/tokens/cost | jq ".$SYMBOL")
USD=$(jq -r .token_cost_in_usd <<<"$COST")
CUR=$(jq -r .currency <<<"$COST")
in_bond() { units "$(awk -v a="$1" -v p="$USD" 'BEGIN { printf "%.7f", a / p }')"; }
V0=$(in_bond "$START_USD")
FEE=$(in_bond "$CREATE_FEE_USD")

log "$ASSET · $SAC · \$$USD · curve \$$START_USD · create fee \$$CREATE_FEE_USD"
json_set ".pairs.$SYMBOL = {id: \"$SAC\", asset: \"$ASSET\", currency: \"$CUR\", usd: $USD, v_pair0: \"$V0\", create_fee: \"$FEE\"}"
invoke "$ADMIN" "$(json_get .launchpad)" add_pair --pair "$SAC" --v_pair0 "$V0" --create_fee "$FEE" >/dev/null
log "$SYMBOL allowed on $(json_get .launchpad)"
