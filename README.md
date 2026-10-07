# Hooks

**Memecoins backed by sovereign bonds, on Stellar.** Every memecoin launched on Hooks keeps its bonding-curve reserve in an Etherfuse stablebond (Mexico's CETES, Brazil's Tesouro) instead of XLM. Every meme launched buys sovereign debt, the reserve earns the bond's yield even when nobody trades, and a quarter of every fee goes to the meme's vault: half of it is paid to the meme's holders as dividends in the bond, and the rest buys the meme back and burns it once it trades on Soroswap.

Hooks is the retail channel for Stellar's tokenized assets.

## The pitch

### Stellar has the assets, not the retail demand

- Stellar holds about **$4B in tokenized real-world assets**, up 360% in 2026 (RWA.xyz, Aug 29, 2026). Its whole DeFi TVL is **$271.6M** (DefiLlama, Oct 6, 2026).
- Etherfuse's CETES on Stellar mainnet: **58.7M tokens, about $3.9M**, held by 1,170 accounts and 36 contracts (Horizon, Oct 6, 2026).
- The Stellar Development Foundation lists *DeFi composability for existing and new RWAs* as a 2026 priority. Its Builder Summit in São Paulo (Aug 2026) ran tracks for **emerging-market yield** and **anchors & ramps**.

The assets are there. What is missing is a reason for retail to hold them on-chain.

### Robinhood Chain showed what that reason looks like

Robinhood launched its chain on July 1, 2026, to trade tokenized stocks. Memecoins took it over, and the stocks came along:

| | |
| --- | --- |
| Memecoins' share of the chain's daily DEX volume | **79.2%** (Jul 27) |
| Pons, the largest launchpad | **$4.5B** volume in under two months; **207,893** coins in 32 days |
| Coins on Pons quoted in tokenized stocks or commodities | over a third: **73,896 coins, $232M** of volume |
| Long.xyz's Artificial Inu, a meme paired with tokenized Nvidia | its pool held **16–23%** of all tokenized NVDA |
| Flap | pays meme holders a drip of the paired stock |

Pairing memes with real assets turned speculation into demand for those assets. In CEO Vlad Tenev's words, the chain built for real-world assets "works great for memes too".

### Hooks brings that pattern to Stellar's strongest asset class

| Lesson from Robinhood Chain | In Hooks |
| --- | --- |
| Memes are the distribution channel for RWAs | Every curve's reserve is a sovereign bond. The home page counts the bonds memes have bought |
| The paired asset has to give holders something | The reserve earns 5.55% (CETES) or 11.55% (Tesouro) a year. A quarter of every fee goes to the meme's vault: half is paid to its holders in the bond, by balance, and the rest buys the meme back and burns it |
| Creators need to get paid | Half of every fee goes to the creator, paid in a bond that keeps earning |
| Noxa held 65.8% of launches and lost them to bot spam in days | A ~$1 create fee that seeds the meme's vault, and a rate-limited faucet |
| Retail did not come through the Robinhood app (1–2% of activity) but through bots and terminals | Share cards on every coin and a key-less Telegram bot (ready, not yet deployed) |
| 66.8% of 314,736 Pons wallets ended with less than they started | No promise of gains. What we promise is that the reserve sits in sovereign debt, not idle XLM |

It works on Stellar today because Etherfuse's bonds are there already, freely transferable (no authorization or clawback flags on mainnet), with an onramp from pesos by bank transfer. Nobody else on Stellar pairs memes with real assets: Smol, the closest launchpad, quotes in XLM.

### The 3-minute demo

1. Log in with email (Cavos): no seed phrase and no XLM, Cavos pays the fees.
2. Deposit: pesos to CETES, simulated on testnet with our faucet.
3. Create a meme backed by CETES or Tesouro, with a first buy in the same transaction.
4. Make the last buy on a meme prepared at 95% (`demo.sh`). It graduates, and `migrate` opens its Soroswap pool with the liquidity locked for good.
5. Trade it on Soroswap from the same page, and fire the vault's buyback and burn.
6. Claim the meme's dividends from the Dividends page: every trade already paid them, and the bond lands in the holder's wallet.
7. The backing panel: what the reserve earns per day in pesos, and the total of bonds bought by memes.

Every step runs on testnet today (launchpad `CA3W7XW7TREX77B5EN3ZQOEZUBJ2M4FELRKQA42RCFPVMDYJ56SQ453W`).

### What we have not solved yet

- **Unaudited contracts.** The admin can replace the launchpad's code, and with it every rule; the app says so in its footer. Mainnet needs a multisig admin.
- **Small markets.** CETES on Stellar is a ~$3.9M float. A $300 curve graduates into a pool of about $600, where a $7 buy moves the price over 30%. Mainnet needs larger curves, and a meme that succeeds could hold a meaningful share of the float, like NVDA on Robinhood Chain.
- **Regulation.** Memecoins whose reserve is sovereign debt, and that pay their holders in it, will raise questions we have not answered yet. The SEC staff's [statement on meme coins](https://www.sec.gov/newsroom/speeches-statements/staff-statement-meme-coins) describes them as coins that do not "generate a yield"; we will settle this before mainnet.

<details>
<summary>Sources</summary>

- CoinDesk, [Robinhood built a blockchain for tokenized stocks; memecoins took over](https://www.coindesk.com/tech/2026/07/13/robinhood-built-a-blockchain-for-tokenized-stocks-memecoins-took-over) (Jul 13, 2026)
- CoinGecko, [Robinhood Chain: built for RWA, loved for memes](https://www.coingecko.com/learn/robinhood-chain-built-for-rwa-loved-for-memes)
- Bitquery, [Pons launchpad growth](https://bitquery.io/investigations/pons-launchpad)
- AirdropAlert, [Biggest Robinhood launchpads](https://airdropalert.com/blogs/robinhood-launchpads/)
- DeFiPrime, [Inside the stock-paired memecoin boom](https://defiprime.com/stock-paired-memecoins)
- Bloomingbit, [Robinhood Chain nears $1B TVL](https://en.bloomingbit.io/feed/news/120358)
- KuCoin, [Stellar's tokenized RWA market surpasses $3.996B](https://www.kucoin.com/news/flash/stellar-s-tokenized-rwa-market-surpasses-3-996b-up-360-in-2026)
- SDF, [The Stellar Way](https://stellar.org/blog/foundation-news/the-stellar-way); [Builder Summit São Paulo winners](https://developers.stellar.org/meetings/2026/08/13)
- [kalepail/smol-contracts](https://github.com/kalepail/smol-contracts)
- Live data: `api.llama.fi`, Horizon (testnet and mainnet), `api.etherfuse.com`

</details>

## Layout

| Path | What it is |
| --- | --- |
| `contracts/launchpad` | `create`, `buy`, `sell`, `migrate`, `buyback`, `claim_fees`, `claim_protocol`, `add_pair`, `upgrade`, plus paged views and quotes. Constant-product curve with virtual reserves (pump.fun model). Tests run against Soroswap's real factory and pair (`testdata/`) |
| `contracts/meme-token` | SEP-41 (OpenZeppelin), burnable. The constructor mints the fixed 1B supply to the launchpad, and there is no mint entrypoint. It also keeps the meme's dividends (`dividend.rs`) |
| `scripts/` | `deploy.sh` → `etherfuse-onramp.sh` (stocks the faucet) → `seed.sh` → `demo.sh`, and `telegram-setup.sh` |
| `deployments/<net>.json` | Contract IDs; copied into the app as `src/contracts/deployments.<net>.json` |
| `app/` | Next.js app. Reads the chain through the RPC, the trade history through Mercury. Wallets: Cavos (email/OAuth, fees sponsored by Cavos) or Freighter via Stellar Wallets Kit |

## How a meme works

1. **Create.** The creator pays the bond's create fee (about $1), which seeds the meme's vault, and can buy first in the same transaction.
2. **Curve.** 800M of the 1B supply sell on the curve. Each buy and sell pays 1%: 0.5% to the creator, 0.25% to the meme's vault and 0.25% to the protocol, all in the bond.
3. **Graduation.** When the 800M are sold, anyone calls `migrate`: the last 200M and the reserve open a Soroswap pool at the curve's final price, and the LP shares stay in the launchpad forever. Reserve the pool does not need goes to the vault.
4. **Soroswap.** Once migrated, the meme trades against its pool. The app quotes and swaps through Soroswap's router on the same coin page, and its chart and trades go on from the pool's `swap` and `sync` events.
5. **Buyback.** Anyone calls `buyback`: the vault spends up to 1% of the pool's bond reserve on the meme and burns it. The cap keeps each call too small to sandwich profitably against Soroswap's 0.3% fee.
6. **Dividends.** `DIV_BPS` (5000 by default, set at deploy) of everything bound for the vault, the create fee, the 0.25% and the migration leftover, goes to the meme's holders instead, in the same transaction: the launchpad sends it to the meme's token, whose `notify` spreads it by balance, as Flap does on its curve. A buy pays the holders before the buyer gets their memes. Nothing waits to be distributed, so nobody can time a payout. Each holder, or anyone for them, calls `claim` on the token and gets the bond. A trade costs about 65% more CPU for it (1.26M → 2.07M instructions in the tests), far under the 400M limit. The launchpad, the token and the meme's Soroswap pools never earn: `migrate` excludes the pool before seeding it, and an earlier pool's earnings go back to the holders.

The token keeps the accounting because Soroban forbids re-entry: the launchpad moves memes in `buy`, `sell`, `migrate` and `buyback`, and those transfers cannot call back into it. Every transfer and burn settles both sides first (an accumulated-per-share counter, as Flap does), earnings round down per holder and the rounding the counter leaves is carried to the next deposit, so claims never add up to more than was paid in.

`START_USD` (default $300) sets each curve's opening reserve; graduation happens at about 2.93 times it, so it also caps what one meme's reserve holds.

### Migration with a pool someone else created

Anyone can create the Soroswap pair before graduation and seed it at another price. A plain deposit into such a pool mints shares by the smaller side, and the rest of the reserve would go to whoever seeded it. So when the pool already holds reserves, `migrate` first swaps it back to the curve's price (buying whatever the seeder made cheap, or selling to them what they made dear), then deposits in the pool's exact proportion. Left-over memes are burned and left-over bond goes to the vault. If the seeder skewed the pool beyond what the launchpad can move, it sells at most half of what it holds into it and pools the rest. `test.rs` seeds pools at 1%, 50%, 100%, 10× and 100× the curve price and checks that the seeder never takes out more than they put in. Without this, a seeder at 1% of the price took out 1.86 times what they put in.

### What the admin can do

The admin key allows new bonds (`add_pair`), claims the protocol's fees and can replace the launchpad's code (`upgrade`), which means it can change every rule, the reserves' included. The app says so in its footer. On mainnet the admin should be a multisig account (Stellar's classic signer thresholds) and the contracts have not been audited.

## Contracts

```bash
stellar contract build     # cargo test needs target/wasm32v1-none/release/meme_token.wasm
cargo test
```

## Testnet

The pairs are Etherfuse's sandbox stablebonds, real tokens on Stellar testnet, bought with simulated pesos through Etherfuse's sandbox onramp: 500 MXN per order. We stock a treasury account with many orders, and the app's faucet hands out about $65 of each bond.

```bash
echo 'ETHERFUSE_API_KEY=api_sand:...' >> .env.local       # sandbox key, business org with KYB approved
./scripts/deploy.sh                                        # new launchpad wired to Soroswap; CETES and TESOURO (USTRY is mainnet only)
./scripts/etherfuse-onramp.sh garfio-faucet 500 40 CETES   # stocks the treasury, per bond
./scripts/etherfuse-onramp.sh garfio-faucet 500 10 TESOURO
./scripts/seed.sh                                          # seed accounts and example memes on each bond
./scripts/demo.sh CETES AJOLOTE "Ajolote Inu"              # a meme 95% of the way to graduating
```

`demo.sh` leaves one buy for the live demo: it graduates the meme, the app migrates it to Soroswap, and the vault can buy back right after.

### Faucet

The app's **Deposit** dialog simulates Etherfuse's onramp: `/api/faucet` sends about $65 of a bond from the treasury to any account holding less than that, at most 6 times an hour per IP (counted in the server's memory, so one long-running instance). Bonds the treasury cannot hand out are hidden from the app until it is stocked again. The treasury key lives only on the server, in `FAUCET_SECRET` (`app/.env.local`, from `stellar keys secret garfio-faucet`). In the app, the button first opens the wallet's trustline if it lacks one: Cavos sponsors it, Freighter signs a plain `changeTrust`. There is no faucet on mainnet.

## App

```bash
cd app
cp .env.example .env.local   # every variable is explained there
pnpm install
pnpm dev                     # http://localhost:3000
```

- **Prices and yield** come from Etherfuse's public API (`/api/rates`): each bond at its production NAV and rate, at the live exchange rate. The coin page shows what the reserve earns per day and has earned since the meme was created, in the bond's currency. The home page totals the bonds memes have bought.
- **History** comes from Mercury (`/api/events`, needs `MERCURY_JWT`; its Dev tier is free on testnet, mainnet starts at $79/month). Without it the app reads the public RPC, which keeps about 7 days of events. Trade events carry their ledger time, so either source is enough to chart them. Swaps on graduated memes' pools come from the RPC.
- **Share cards**: every coin page has an Open Graph image (`/m/<id>/opengraph-image`) and a share button. Set `NEXT_PUBLIC_SITE_URL` to the deployed origin.

### Telegram bot

The bot never holds keys: it answers `/top`, `/nuevas` and `/meme TICKER` with the meme's numbers and buttons that open the coin page with the buy prefilled (`/m/<id>?buy=50`). Mercury pushes each `create` and `graduate` event to `/api/mercury`, and the bot posts it to `TELEGRAM_CHANNEL_ID`.

```bash
# app/.env.local: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_CHANNEL_ID,
# NEXT_PUBLIC_SITE_URL (public HTTPS), MERCURY_JWT, MERCURY_WEBHOOK_SECRET
./scripts/telegram-setup.sh
```

## Mainnet

Etherfuse's mainnet bonds have no authorization or clawback flags, so they can be paired without permission. The code is ready; deploying spends real XLM and needs a decision:

```bash
NET=mainnet ADMIN=<multisig identity> START_USD=300 ./scripts/deploy.sh
# app: NEXT_PUBLIC_NETWORK=mainnet, NEXT_PUBLIC_RPC_URL=<a mainnet RPC provider>
```

On mainnet the app shows a fixed "unaudited" banner, hides the faucet and links to Etherfuse and Aquarius to get bonds. Soroswap's mainnet pair runs different code from testnet's (`soroswap/core/public/mainnet.contracts.json`); fetch it into `testdata/` and run the migration tests against it before deploying.
