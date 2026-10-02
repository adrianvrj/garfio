#!/usr/bin/env bash
# Creates the example memes with the simulator's trades. Run it on demo day:
# public RPCs may keep events for only 24 h, and the charts read events.
source "$(dirname "$0")/lib.sh"

LP=$(json_get .launchpad)
SEEDS=(garfio-seed-1 garfio-seed-2 garfio-seed-3)
for s in "${SEEDS[@]}"; do
  ensure_key "$s"
  # three faucet calls per pair cover every seed buy below
  for sym in tCETES tUSTRY tNVDA tCETES tUSTRY tNVDA tCETES tUSTRY tNVDA; do
    invoke "$s" "$(json_get ".pairs.$sym.id")" faucet --to "$s" >/dev/null
  done
done

seed_meme() { # creator symbol name pair buys...
  local creator="$1" sym="$2" name="$3" pair="$4"; shift 4
  log "create \$$sym / $pair"
  local meme
  meme=$(invoke "$creator" "$LP" create --creator "$creator" --name "$name" --symbol "$sym" \
    --pair "$(json_get ".pairs.$pair.id")" | tr -d '"')
  local i=0
  for amt in "$@"; do
    local buyer="${SEEDS[$((i % 3))]}"
    invoke "$buyer" "$LP" buy --buyer "$buyer" --meme "$meme" --pair_in "$(units "$amt")" --min_out 0 >/dev/null
    i=$((i + 1))
  done
  json_set ".seeded.$sym = \"$meme\""
}

seed_meme garfio-seed-1 TACO     "Taco Coin"   tCETES 220 500 140 900 60 1300 300
seed_meme garfio-seed-2 NVDOGE   "Nvidia Doge" tNVDA  1.2 3 0.6 4.5 2.2 1.1
seed_meme garfio-seed-3 CHILANGO "Chilango"    tCETES 80 150 40 260
seed_meme garfio-seed-1 LAMBO    "Lambo Inu"   tNVDA  0.5 0.9 2.1
seed_meme garfio-seed-2 EAGLE    "Bald Eagle"  tUSTRY 120 300 90 450
log "seeded $(invoke garfio-seed-1 "$LP" memes | jq length) memes"
