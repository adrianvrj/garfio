# Garfio

Memecoins backed by RWAs. A Stellar launchpad where every memecoin keeps its bonding-curve reserve in a tokenized real-world asset (CETES, US treasuries, NVDA) instead of XLM. If the asset yields or rises, the meme rises with it, without anyone trading.

## Layout

| Path | What it is |
| --- | --- |
| `contracts/launchpad` | `create`, `buy`, `sell`, `claim_fees`, `claim_protocol`, `add_pair`, plus read-only quotes. Constant-product curve with virtual reserves (pump.fun model). 1% fee: 0.5% to the creator, 0.5% to the protocol |
| `contracts/meme-token` | SEP-41 (OpenZeppelin). The constructor mints the fixed 1B supply to the launchpad, and there is no mint entrypoint |
| `contracts/rwa-mock` | SEP-41 test RWAs (tCETES, tUSTRY, tNVDA) with a public `faucet()` |
| `scripts/` | `assets.sh` → `deploy.sh` → `seed.sh` against testnet |
| `deployments/testnet.json` | Contract IDs; copied into the app |
| `app/` | Next.js app. Reads straight from the RPC, with no backend. Wallets: Cavos (email/OAuth, sponsored fees) or Freighter via Stellar Wallets Kit |

## Contracts

```bash
cargo test                 # needs target/wasm32v1-none/release/meme_token.wasm:
stellar contract build     # build first
```

## Testnet

```bash
./scripts/assets.sh   # deploys tCETES, tUSTRY, tNVDA
./scripts/deploy.sh   # uploads meme wasm, deploys launchpad, add_pair ×3, regenerates TS bindings
./scripts/seed.sh     # creates TACO, NVDOGE, CHILANGO, LAMBO, EAGLE with trades
```

Run `seed.sh` on demo day. Public RPCs keep events for about 24 h, and the charts are built from `trade` events.

## App

```bash
cd app
cp .env.example .env.local   # set NEXT_PUBLIC_CAVOS_APP_ID to enable Cavos
pnpm install
pnpm dev                     # http://localhost:3000 — add ?demo=1 for the demo controls
```

`?demo=1` shows "Mover el mundo real": it advances time for the tCETES/tUSTRY yield and overrides the NVDA price. These controls change only the USD values on screen. The curve and the on-chain reserves never move.
