#!/usr/bin/env bash
# Prepares the live demo: a meme on BOND whose curve is about 95% sold, so one buy on stage
# graduates it, and the migration to Soroswap follows in the same session.
# Usage: ./scripts/demo.sh [BOND] [SYMBOL] [NAME]   (default CETES AJOLOTE "Ajolote Inu")
source "$(dirname "$0")/lib.sh"

BOND="${1:-CETES}"
SYM="${2:-AJOLOTE}"
NAME="${3:-Ajolote Inu}"
SHARE=95 # percent of the graduation target bought ahead of time

LP=$(json_get .launchpad)
PAIR=$(pair_id "$BOND")
TARGET=$(invoke garfio-seed-1 "$LP" pair --pair "$PAIR" | jq -r .grad_target)
# gross pair to bring the real reserve to SHARE% of the target, fee (1%) included
NEED=$(awk -v t="$TARGET" -v s=$SHARE 'BEGIN { printf "%.0f", t * s / 100 / 0.99 }')
CREATE_FEE=$(json_get ".pairs.$BOND.create_fee")
HAVE=$(balance garfio-faucet "$BOND")
log "$BOND graduates at $TARGET base units; buying $NEED ahead of time"
if [ "$HAVE" -lt $((NEED + CREATE_FEE)) ]; then
  log "the treasury holds $HAVE: stock it with ./scripts/etherfuse-onramp.sh garfio-faucet 500 <orders> $BOND"
  exit 1
fi

# The buys are split over the three seed accounts so the chart and holders look like a market.
PART=$((NEED / 3))
for s in 1 2 3; do
  seed="garfio-seed-$s"
  ensure_key "$seed"
  invoke "$seed" "$PAIR" trust --addr "$seed" >/dev/null
  invoke garfio-faucet "$PAIR" transfer --from garfio-faucet --to "$seed" --amount $((PART + CREATE_FEE)) >/dev/null
done

log "create \$$SYM on $BOND"
MEME=$(invoke garfio-seed-1 "$LP" create --creator garfio-seed-1 --name "$NAME" --symbol "$SYM" \
  --pair "$PAIR" --dev_buy 0 | tr -d '"')
for chunk in 1 2 3; do
  for s in 1 2 3; do
    invoke "garfio-seed-$s" "$LP" buy --buyer "garfio-seed-$s" --meme "$MEME" --pair_in $((PART / 3)) --min_out 0 >/dev/null
  done
done
json_set ".demo = \"$MEME\""
SOLD=$(invoke garfio-seed-1 "$LP" curve --meme "$MEME" | jq -r '.sold')
log "\$$SYM is ready: $MEME, $(awk -v s="$SOLD" 'BEGIN { printf "%.1f", s / 8e15 * 100 }')% of the curve sold"
