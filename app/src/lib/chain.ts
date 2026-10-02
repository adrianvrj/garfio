import { Address, nativeToScVal, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import { Client as LaunchpadClient, type Curve, type PairCfg } from "@/contracts/launchpad";
import { Client as TokenClient } from "@/contracts/rwa";
import { LAUNCHPAD_ID, NETWORK_PASSPHRASE, PAIRS, RPC_URL } from "./config";

export const server = new rpc.Server(RPC_URL);

const opts = { networkPassphrase: NETWORK_PASSPHRASE, rpcUrl: RPC_URL };
const launchpad = new LaunchpadClient({ ...opts, contractId: LAUNCHPAD_ID });
const tokens = new Map<string, TokenClient>();
const token = (id: string) => {
  if (!tokens.has(id)) tokens.set(id, new TokenClient({ ...opts, contractId: id }));
  return tokens.get(id)!;
};

export type Meme = Curve & { id: string };

// ---------- reads (simulated, no signature) ----------

export async function fetchMemes(): Promise<Meme[]> {
  const ids = (await launchpad.memes()).result;
  const curves = await Promise.all(ids.map((id) => launchpad.curve({ meme: id })));
  return curves.map((tx, i) => ({ ...tx.result, id: ids[i] }));
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

export async function balanceOf(tokenId: string, account: string): Promise<bigint> {
  return (await token(tokenId).balance({ account })).result;
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
  faucet: (pairId: string, to: string): Call => ({ contractId: pairId, method: "faucet", args: [addr(to)] }),
  create: (creator: string, name: string, symbol: string, pair: string): Call => ({
    contractId: LAUNCHPAD_ID,
    method: "create",
    args: [addr(creator), str(name), str(symbol), addr(pair)],
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
};

/** Waits for a submitted tx and returns its decoded return value. */
export async function txReturn<T>(hash: string): Promise<T> {
  for (let i = 0; i < 30; i++) {
    const res = await server.getTransaction(hash);
    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return (res.returnValue ? scValToNative(res.returnValue) : undefined) as T;
    }
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) throw new Error("La transacción falló on-chain.");
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("La transacción no se confirmó a tiempo.");
}

// ---------- events → chart ----------

export interface TradePoint {
  ledger: number;
  at: number; // ms
  isBuy: boolean;
  trader: string;
  pairAmt: bigint;
  memeAmt: bigint;
  vPair: bigint;
  vToken: bigint;
  txHash: string;
}

const tradeTopic = xdr.ScVal.scvSymbol("trade").toXDR("base64");

/**
 * Trade events for one meme, oldest first, from the last ~24 h. The RPC scans a
 * limited ledger window per request, so we follow the cursor until we reach the tip.
 */
export async function fetchTrades(meme: string): Promise<TradePoint[]> {
  const latest = await server.getLatestLedger();
  const filters: rpc.Api.EventFilter[] = [
    { type: "contract", contractIds: [LAUNCHPAD_ID], topics: [[tradeTopic, addr(meme).toXDR("base64")]] },
  ];
  let startLedger = Math.max(1, latest.sequence - 17_280);
  const events: rpc.Api.EventResponse[] = [];
  let res: rpc.Api.GetEventsResponse;
  try {
    res = await server.getEvents({ startLedger, filters, limit: 1000 });
  } catch (e) {
    // "startLedger must be within the ledger range: X - Y" → retry from X
    const m = (e as { message?: string })?.message?.match(/ledger range: (\d+)/);
    if (!m) throw new Error((e as { message?: string })?.message ?? String(e));
    startLedger = Number(m[1]);
    res = await server.getEvents({ startLedger, filters, limit: 1000 });
  }
  for (let page = 0; page < 20; page++) {
    events.push(...res.events);
    // cursor = TOID: the ledger sits in the high 32 bits
    const scanned = Number(BigInt(res.cursor.split("-")[0]) >> 32n);
    if (scanned >= res.latestLedger) break;
    res = await server.getEvents({ cursor: res.cursor, filters, limit: 1000 });
  }
  return events.map((ev) => {
    const v = scValToNative(ev.value) as Record<string, unknown>;
    return {
      ledger: ev.ledger,
      at: Date.parse(ev.ledgerClosedAt),
      isBuy: v.is_buy as boolean,
      trader: v.trader as string,
      pairAmt: v.pair_amt as bigint,
      memeAmt: v.meme_amt as bigint,
      vPair: v.v_pair as bigint,
      vToken: v.v_token as bigint,
      txHash: ev.txHash,
    };
  });
}
