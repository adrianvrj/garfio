#!/usr/bin/env bash
# Creates example memes on each bond, with trades from three seed accounts that the faucet
# treasury funds. Stock the treasury first, once per bond:
#   ./scripts/etherfuse-onramp.sh garfio-faucet 500 <orders> <SYMBOL>   # about $28 per order
# Amounts are in dollars and converted at each bond's deploy-time price.
source "$(dirname "$0")/lib.sh"

LP=$(json_get .launchpad)
SEED_USD=40 # per seed account and bond

# Bonds the treasury holds enough of for the three seed accounts; the rest are skipped.
stocked() { [ "$(balance garfio-faucet "$1")" -ge "$(usd_units "$1" $((SEED_USD * 3)))" ]; }
BONDS=""
for sym in $(json_get '.pairs | keys[]'); do
  if stocked "$sym"; then BONDS="$BONDS $sym"; else log "skipping $sym: stock it with ./scripts/etherfuse-onramp.sh garfio-faucet 500 <orders> $sym"; fi
done

for s in 1 2 3; do
  seed="garfio-seed-$s"
  ensure_key "$seed"
  for sym in $BONDS; do
    invoke "$seed" "$(pair_id "$sym")" trust --addr "$seed" >/dev/null # no-op once the trustline exists
    invoke garfio-faucet "$(pair_id "$sym")" transfer --from garfio-faucet --to "$seed" --amount "$(usd_units "$sym" $SEED_USD)" >/dev/null
  done
done

seed_meme() { # creator bond symbol name dev_usd buyer:usd...
  local creator="$1" bond="$2" sym="$3" name="$4" dev="$5" meme; shift 5
  log "create \$$sym on $bond with a \$$dev creator buy"
  meme=$(invoke "garfio-seed-$creator" "$LP" create --creator "garfio-seed-$creator" --name "$name" --symbol "$sym" \
    --pair "$(pair_id "$bond")" --dev_buy "$(usd_units "$bond" "$dev")" | tr -d '"')
  for trade in "$@"; do
    local buyer="garfio-seed-${trade%%:*}"
    invoke "$buyer" "$LP" buy --buyer "$buyer" --meme "$meme" --pair_in "$(usd_units "$bond" "${trade##*:}")" --min_out 0 >/dev/null
  done
  json_set ".seeded.$sym = \"$meme\""
}

has() { [[ " $BONDS " == *" $1 "* ]]; }

has CETES && seed_meme 1 CETES NOPAL "Nopal Coin" 4 2:3 3:2 1:2
has CETES && seed_meme 2 CETES TACO "Taco Coin" 3 3:6 1:2 2:3
has TESOURO && seed_meme 3 TESOURO CAIPI "Caipirinha" 2 1:3 2:1
has USTRY && seed_meme 1 USTRY EAGLE "Bald Eagle" 2 3:4
log "seeded $(invoke garfio-seed-1 "$LP" meme_count) memes"
