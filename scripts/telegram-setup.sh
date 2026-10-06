#!/usr/bin/env bash
# Points the Telegram bot at the deployed app and has Mercury push the launchpad's `create` and
# `graduate` events to it, for the channel alerts. Run it once per deployment of the app.
# Needs in app/.env.local: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, NEXT_PUBLIC_SITE_URL,
# MERCURY_JWT and MERCURY_WEBHOOK_SECRET (any random string; Mercury signs with it).
source "$(dirname "$0")/lib.sh"

set -a
# shellcheck disable=SC1091
source "$ROOT/app/.env.local"
set +a
: "${TELEGRAM_BOT_TOKEN:?}" "${TELEGRAM_WEBHOOK_SECRET:?}" "${NEXT_PUBLIC_SITE_URL:?}" "${MERCURY_JWT:?}" "${MERCURY_WEBHOOK_SECRET:?}"
SITE="${NEXT_PUBLIC_SITE_URL%/}"
TG="https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN"
MERCURY="https://$NET.mercurydata.app/rest"

log "Telegram webhook → $SITE/api/telegram"
curl -fsS "$TG/setWebhook" -d "url=$SITE/api/telegram" -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" -d 'allowed_updates=["message"]' >/dev/null
curl -fsS "$TG/setMyCommands" -H 'Content-Type: application/json' -d '{"commands": [
  {"command": "top", "description": "La meme más cerca de graduar"},
  {"command": "nuevas", "description": "Las últimas cinco"},
  {"command": "meme", "description": "Una meme por su ticker"}]}' >/dev/null

# Topics are matched on their XDR, base64.
topic() { (cd "$ROOT/app" && node -e "console.log(require('@stellar/stellar-sdk').xdr.ScVal.scvSymbol('$1').toXDR('base64'))"); }
for event in create graduate; do
  log "Mercury webhook for $event → $SITE/api/mercury"
  curl -fsS "$MERCURY/webhooks/new" -H "Authorization: Bearer $MERCURY_JWT" -H 'Content-Type: application/json' -d "{
    \"webhook_endpoint\": \"$SITE/api/mercury\", \"contract_ids\": [\"$(json_get .launchpad)\"],
    \"topic1\": \"$(topic "$event")\", \"webhook_secret\": \"$MERCURY_WEBHOOK_SECRET\"}" >/dev/null
done
log "done: the bot answers /top, /nuevas and /meme; alerts go to TELEGRAM_CHANNEL_ID"
