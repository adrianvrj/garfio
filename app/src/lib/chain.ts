import { Account, Address, BASE_FEE, Contract, nativeToScVal, rpc, scValToNative, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import { decodeTrade, TRADE_TOPIC, tradeFromJson, type TradeJson, type TradePoint } from "./events";
import { Client as LaunchpadClient, type Curve, type PairCfg, type Position } from "@/contracts/launchpad";
import { Client as RouterClient } from "@/contracts/router";
import { Client as TokenClient } from "@/contracts/token";
import { AMM_ROUTER, HORIZON_URL, LAUNCHPAD_ID, NETWORK_PASSPHRASE, PAIRS, RPC_URL } from "./config";
import { Oops } from "./errors";

export const server = new rpc.Server(RPC_URL);

const opts = { networkPassphrase: NETWORK_PASSPHRASE, rpcUrl: RPC_URL };
const launchpad = new LaunchpadClient({ ...opts, contractId: LAUNCHPAD_ID });
const router = new RouterClient({ ...opts, contractId: AMM_ROUTER });
const tokens = new Map<string, TokenClient>();
const token = (id: string) => {
  if (!tokens.has(id)) tokens.set(id, new TokenClient({ ...opts, contractId: id }));
  return tokens.get(id)!;
};

export type Meme = Curve & { id: string };

// ---------- reads (simulated, no signature) ----------

/** The contract serves at most this many curves per call. */
const PAGE = 50;

/** Every meme's curve, in creation order, a page per simulated call. */
export async function fetchMemes(): Promise<Meme[]> {
  const count = (await launchpad.meme_count()).result;
  const pages = await Promise.all(
    Array.from({ length: Math.ceil(count / PAGE) }, (_, i) => launchpad.curves({ start: i * PAGE, limit: PAGE })),
  );
  return pages.flatMap((p) => p.result).map((c) => ({ ...c, id: c.token }));
}

export async function fetchMeme(id: string): Promise<Meme> {
  return { ...(await launchpad.curve({ meme: id })).result, id };
}

export async function fetchPairCfgs(): Promise<Record<string, PairCfg>> {
  const cfgs = await Promise.all(PAIRS.map((p) => launchpad.pair({ pair: p.id })));
  return Object.fromEntries(PAIRS.map((p, i) => [p.id, cfgs[i].result]));
}

export async function quoteBuy(meme: string, pairIn: bigint) {
  const [out, charged, fee] = (await launchpad.quote_buy({ meme, pair_in: pairIn })).result;
  return { out, charged, fee };
}

export async function quoteSell(meme: string, amount: bigint) {
  const [out, fee] = (await launchpad.quote_sell({ meme, amount })).result;
  return { out, fee };
}

/**
 * What a graduated meme's Soroswap pool pays out for `amountIn` of `from` (the meme or its pair),
 * after Soroswap's 0.3% fee.
 */
export async function quoteSwap(from: string, to: string, amountIn: bigint): Promise<bigint> {
  const amounts = (await router.router_get_amounts_out({ amount_in: amountIn, path: [from, to] })).result.unwrap();
  return amounts[amounts.length - 1];
}

/** `trader`'s curve position in `meme`: tokens bought and still held, their cost, realized P&L. */
export async function fetchPosition(trader: string, meme: string): Promise<Position> {
  return (await launchpad.position({ trader, meme })).result;
}

export async function balanceOf(tokenId: string, account: string): Promise<bigint> {
  return (await token(tokenId).balance({ account })).result;
}

/** The meme's bond that `holder` can claim as dividends now. */
export async function fetchClaimable(meme: string, holder: string): Promise<bigint> {
  return (await token(meme).claimable({ holder })).result;
}

/**
 * Whether `account` can hold the classic `asset` (`CODE:ISSUER`). Contract accounts always
 * can; a G account needs a trustline, and one not created yet has none.
 */
export async function hasTrustline(account: string, asset: string): Promise<boolean> {
  if (!account.startsWith("G")) return true;
  const res = await fetch(`${HORIZON_URL}/accounts/${account}`);
  if (!res.ok) return false;
  const { balances }: { balances: { asset_code?: string; asset_issuer?: string }[] } = await res.json();
  const [code, issuer] = asset.split(":");
  return balances.some((b) => b.asset_code === code && b.asset_issuer === issuer);
}

/** What a graduated meme's Soroswap pool holds: the reserve that backs it now. */
export async function fetchPool(m: Meme): Promise<{ pairAmt: bigint; memeAmt: bigint } | null> {
  if (!m.pool) return null;
  const [pairAmt, memeAmt] = await Promise.all([balanceOf(m.pair, m.pool), balanceOf(m.id, m.pool)]);
  return { pairAmt, memeAmt };
}

/** Current meme balance of everyone who traded it on the curve, largest first. */
export async function fetchHolders(meme: string, traders: string[]): Promise<{ address: string; amount: bigint }[]> {
  const unique = [...new Set(traders)];
  const amounts = await Promise.all(unique.map((a) => balanceOf(meme, a)));
  return unique
    .map((address, i) => ({ address, amount: amounts[i] }))
    .filter((h) => h.amount > 0n)
    .sort((a, b) => (b.amount > a.amount ? 1 : -1));
}

// ---------- write args ----------

export const addr = (a: string) => new Address(a).toScVal();
export const i128 = (v: bigint) => nativeToScVal(v, { type: "i128" });
export const str = (s: string) => nativeToScVal(s, { type: "string" });

export interface Call {
  contractId: string;
  method: string;
  args: xdr.ScVal[];
}

export const calls = {
  create: (creator: string, name: string, symbol: string, pair: string, devBuy: bigint): Call => ({
    contractId: LAUNCHPAD_ID,
    method: "create",
    args: [addr(creator), str(name), str(symbol), addr(pair), i128(devBuy)],
  }),
  buy: (buyer: string, meme: string, pairIn: bigint, minOut: bigint): Call => ({
    contractId: LAUNCHPAD_ID,
    method: "buy",
    args: [addr(buyer), addr(meme), i128(pairIn), i128(minOut)],
  }),
  sell: (seller: string, meme: string, amount: bigint, minPair: bigint): Call => ({
    contractId: LAUNCHPAD_ID,
    method: "sell",
    args: [addr(seller), addr(meme), i128(amount), i128(minPair)],
  }),
  claimFees: (creator: string, meme: string): Call => ({
    contractId: LAUNCHPAD_ID,
    method: "claim_fees",
    args: [addr(creator), addr(meme)],
  }),
  migrate: (meme: string): Call => ({ contractId: LAUNCHPAD_ID, method: "migrate", args: [addr(meme)] }),
  buyback: (meme: string): Call => ({ contractId: LAUNCHPAD_ID, method: "buyback", args: [addr(meme)] }),
  /** Pays `holder` its dividends in the meme's bond. Anyone can send it; the bond goes to `holder`. */
  claim: (meme: string, holder: string): Call => ({ contractId: meme, method: "claim", args: [addr(holder)] }),
  /** Swaps exactly `amountIn` of `from` for at least `minOut` of `to` in their Soroswap pool. */
  swap: (trader: string, from: string, to: string, amountIn: bigint, minOut: bigint): Call => ({
    contractId: AMM_ROUTER,
    method: "swap_exact_tokens_for_tokens",
    args: [
      i128(amountIn),
      i128(minOut),
      nativeToScVal([new Address(from), new Address(to)]),
      addr(trader),
      // the swap is void if it lands more than five minutes from now
      nativeToScVal(BigInt(Math.floor(Date.now() / 1000) + 300), { type: "u64" }),
    ],
  }),
};

/** Waits for a submitted tx and returns its decoded return value. */
export async function txReturn<T>(hash: string): Promise<T> {
  for (let i = 0; i < 30; i++) {
    const res = await server.getTransaction(hash);
    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return (res.returnValue ? scValToNative(res.returnValue) : undefined) as T;
    }
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) throw new Oops("txFailed");
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Oops("txTimeout");
}

// ---------- events → chart ----------

export type { TradePoint };

/**
 * Every trade of one meme, or of all of them, oldest first. They come from Mercury, which keeps
 * the whole history, through our server; if that fails, from the RPC, which keeps about 7 days.
 */
export async function fetchTrades(meme?: string): Promise<TradePoint[]> {
  try {
    const res = await fetch(`/api/events${meme ? `?meme=${meme}` : ""}`);
    if (res.ok) return ((await res.json()) as TradeJson[]).map(tradeFromJson);
  } catch {}
  return fetchTradesRpc(meme);
}

/** Events matching `filters` that the RPC still keeps (about 7 days), oldest first. */
async function rpcEvents(filters: rpc.Api.EventFilter[]): Promise<rpc.Api.EventResponse[]> {
  const { oldestLedger } = await server.getHealth();
  // The window slides every ledger, so start a few ledgers inside it.
  let res = await server.getEvents({ startLedger: oldestLedger + 12, filters, limit: 1000 });
  const events: rpc.Api.EventResponse[] = [];
  for (let page = 0; page < 20; page++) {
    events.push(...res.events);
    // cursor = TOID: the ledger sits in the high 32 bits
    const scanned = Number(BigInt(res.cursor.split("-")[0]) >> 32n);
    if (scanned >= res.latestLedger) break;
    res = await server.getEvents({ cursor: res.cursor, filters, limit: 1000 });
  }
  return events;
}

/** Trade events the RPC still keeps (about 7 days), oldest first. */
export async function fetchTradesRpc(meme?: string): Promise<TradePoint[]> {
  const topics = [meme ? [TRADE_TOPIC, addr(meme).toXDR("base64")] : [TRADE_TOPIC, "*"]];
  const events = await rpcEvents([{ type: "contract", contractIds: [LAUNCHPAD_ID], topics }]);
  return events.map((ev) => decodeTrade(ev.topic, ev.value, ev.txHash, ev.id));
}

/** Simulates a read-only call; the source account only has to be well formed. */
async function read<T>(contractId: string, method: string, ...args: xdr.ScVal[]): Promise<T> {
  const source = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
  const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim) || !sim.result) throw new Error(`${method}: simulation failed`);
  return scValToNative(sim.result.retval) as T;
}

const SWAP_TOPIC = xdr.ScVal.scvSymbol("swap").toXDR("base64");
const SYNC_TOPIC = xdr.ScVal.scvSymbol("sync").toXDR("base64");
/** Each pool's first token, which never changes. */
const token0 = new Map<string, Promise<string>>();

/**
 * A migrated meme's trades on its Soroswap pool (about 7 days, from the RPC), oldest first, shaped
 * like curve trades: the pool's reserves after each swap stand in for the curve's. The pool
 * reports the reserves (`sync`) and the swap (`swap`) as two events of the same transaction.
 * Buybacks show up here too, with the launchpad as the trader.
 */
export async function fetchPoolTrades(meme: string, pool: string): Promise<TradePoint[]> {
  if (!token0.has(pool)) token0.set(pool, read<string>(pool, "token_0"));
  const [first, events] = await Promise.all([
    token0.get(pool)!,
    rpcEvents([{ type: "contract", contractIds: [pool], topics: [["*", SWAP_TOPIC], ["*", SYNC_TOPIC]] }]),
  ]);
  const memeIs0 = first === meme;
  const synced = new Map<string, { r0: bigint; r1: bigint }>();
  for (const ev of events) {
    if (ev.topic[1]?.toXDR("base64") !== SYNC_TOPIC) continue;
    const v = scValToNative(ev.value) as { new_reserve_0: bigint; new_reserve_1: bigint };
    synced.set(ev.txHash, { r0: v.new_reserve_0, r1: v.new_reserve_1 });
  }
  const out: TradePoint[] = [];
  for (const ev of events) {
    if (ev.topic[1]?.toXDR("base64") !== SWAP_TOPIC) continue;
    const reserves = synced.get(ev.txHash);
    if (!reserves) continue;
    const v = scValToNative(ev.value) as {
      to: string;
      amount_0_in: bigint;
      amount_1_in: bigint;
      amount_0_out: bigint;
      amount_1_out: bigint;
    };
    const [memeIn, memeOut, pairIn, pairOut] = memeIs0
      ? [v.amount_0_in, v.amount_0_out, v.amount_1_in, v.amount_1_out]
      : [v.amount_1_in, v.amount_1_out, v.amount_0_in, v.amount_0_out];
    const [rMeme, rPair] = memeIs0 ? [reserves.r0, reserves.r1] : [reserves.r1, reserves.r0];
    const isBuy = memeOut > 0n;
    out.push({
      meme,
      at: Date.parse(ev.ledgerClosedAt),
      isBuy,
      trader: v.to,
      pairAmt: isBuy ? pairIn : pairOut,
      memeAmt: isBuy ? memeOut : memeIn,
      vPair: rPair,
      vToken: rMeme,
      realPair: rPair,
      txHash: ev.txHash,
      id: ev.id,
      pool: true,
    });
  }
  return out;
}

/** A meme's trades on its curve and, once migrated, on its pool, oldest first. */
export async function fetchMemeTrades(meme: string, pool?: string | null): Promise<TradePoint[]> {
  const [curve, swaps] = await Promise.all([fetchTrades(meme), pool ? fetchPoolTrades(meme, pool) : []]);
  return [...curve, ...swaps].sort((a, b) => a.at - b.at);
}
