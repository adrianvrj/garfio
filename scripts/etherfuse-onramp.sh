#!/usr/bin/env bash
# Buys a real sandbox stablebond (CETES, TESOURO, USTRY…) on Stellar testnet through Etherfuse's
# onramp, with simulated pesos. Usage: ./scripts/etherfuse-onramp.sh [identity] [mxn] [orders] [symbol]
# Needs ETHERFUSE_API_KEY (a sandbox key) in .env.local. The sandbox caps each order at
# 500 MXN (about 435 CETES, or $28 of any bond), so `orders` repeats it. First run registers a sandbox bank
# account (with Etherfuse's placeholder RFC) and the wallet; later runs reuse them.
source "$(dirname "$0")/lib.sh"

WHO="${1:-garfio-seed-1}"
MXN="${2:-500}"
ORDERS="${3:-1}"
SYMBOL="${4:-CETES}"
API=https://api.sand.etherfuse.com

set -a
# shellcheck disable=SC1091
source "$ROOT/.env.local"
set +a
: "${ETHERFUSE_API_KEY:?add ETHERFUSE_API_KEY to .env.local}"

ef() { # method path [json]
  local out
  if ! out=$(curl -sS --fail-with-body -X "$1" "$API$2" \
    -H "Authorization: $ETHERFUSE_API_KEY" -H "Content-Type: application/json" ${3:+-d "$3"}); then
    echo "Etherfuse $1 $2 failed: $out" >&2
    return 1
  fi
  printf '%s' "$out"
}
uuid() { uuidgen | tr '[:upper:]' '[:lower:]'; }

ensure_key "$WHO"
WALLET=$(stellar keys address "$WHO")
ORG=$(ef GET /ramp/me | jq -r .id)

BANK=$(ef GET /ramp/bank-accounts | jq -r '.items[0].bankAccountId // empty')
if [ -z "$BANK" ]; then
  log "registering a sandbox bank account"
  # XEX010101000 is Etherfuse's sandbox RFC for businesses: it skips SPEI and is active at once.
  # The CLABE is made up (BBVA code 012, valid check digit); Etherfuse rejects STP (646) ones.
  BANK=$(ef POST "/ramp/customer/$ORG/bank-account" "{
    \"account\": {\"transactionId\": \"$(uuid)\", \"name\": \"Garfio Sandbox\", \"incorporatedDate\": \"20260101\",
                  \"rfc\": \"XEX010101000\", \"clabe\": \"012180001234567899\", \"countryIsoCode\": \"MX\"},
    \"label\": \"Garfio sandbox\"}" | jq -r .bankAccountId)
fi

log "registering wallet $WALLET"
ef POST /ramp/wallet "{\"publicKey\": \"$WALLET\", \"blockchain\": \"stellar\", \"claimOwnership\": true}" >/dev/null

BOND=$(ef GET "/ramp/assets?blockchain=stellar&currency=mxn&wallet=$WALLET" |
  jq -r --arg s "$SYMBOL" '[.. | objects | select(.symbol? == $s and .identifier != null) | .identifier][0]')
[ "$BOND" != null ] || { log "the sandbox onramp does not sell $SYMBOL"; exit 1; }

onramp() { # n
  local quote order o status claim
  quote=$(uuid)
  ef POST /ramp/quote "{\"quoteId\": \"$quote\", \"customerId\": \"$ORG\", \"blockchain\": \"stellar\",
    \"quoteAssets\": {\"type\": \"onramp\", \"sourceAsset\": \"MXN\", \"targetAsset\": \"$BOND\"},
    \"sourceAmount\": \"$MXN\", \"walletAddress\": \"$WALLET\"}" >/dev/null

  order=$(uuid)
  ef POST /ramp/order "{\"orderId\": \"$order\", \"bankAccountId\": \"$BANK\", \"quoteId\": \"$quote\", \"publicKey\": \"$WALLET\"}" >/dev/null
  log "order $1/$ORDERS ($order): simulating the SPEI deposit"
  ef POST /ramp/order/fiat_received "{\"orderId\": \"$order\"}" >/dev/null

  for _ in $(seq 60); do
    o=$(ef GET "/ramp/order/$order")
    status=$(jq -r .status <<<"$o")
    claim=$(jq -r '.stellarClaimTransaction // empty' <<<"$o")
    case "$status" in failed | refunded | canceled) log "order $status"; return 1 ;; esac
    [ "$status" = completed ] && break
    sleep 5
  done

  # First-time wallets get the tokens as a claimable balance: signing the claim adds the trustline.
  if [ -n "$claim" ]; then
    log "claiming the balance"
    stellar tx sign --sign-with-key "$WHO" --network "$NET" <<<"$claim" | stellar tx send --network "$NET" >/dev/null
  fi
}

log "buying $ORDERS × $MXN MXN of $BOND"
for n in $(seq "$ORDERS"); do onramp "$n"; done

BAL=$(curl -fsS "https://horizon-testnet.stellar.org/accounts/$WALLET" |
  jq -r --arg c "${BOND%%[:-]*}" '.balances[] | select(.asset_code == $c) | .balance')
log "$WHO holds $BAL $SYMBOL"
