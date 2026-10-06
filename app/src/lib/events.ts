// The launchpad's `trade` event, decoded the same way whether it comes from the RPC or from
// Mercury, and its JSON form for the wire (bigints as strings).
import { scValToNative, xdr } from "@stellar/stellar-sdk";

export interface TradePoint {
  meme: string;
  at: number; // ms
  isBuy: boolean;
  trader: string;
  pairAmt: bigint;
  memeAmt: bigint;
  vPair: bigint;
  vToken: bigint;
  /** The curve's real reserve right after the trade. */
  realPair: bigint;
  txHash: string;
  id: string;
  /** Traded on the meme's Soroswap pool, after graduation; vPair/vToken are then the pool's reserves. */
  pool?: boolean;
}

export const TRADE_TOPIC = xdr.ScVal.scvSymbol("trade").toXDR("base64");

const scv = (v: string | xdr.ScVal) => (typeof v === "string" ? xdr.ScVal.fromXDR(v, "base64") : v);

/** Decodes a trade event from its topics (`trade`, meme) and data. */
export function decodeTrade(topics: (string | xdr.ScVal)[], data: string | xdr.ScVal, txHash: string, id: string): TradePoint {
  const v = scValToNative(scv(data)) as Record<string, unknown>;
  return {
    meme: scValToNative(scv(topics[1])) as string,
    at: Number(v.at as bigint) * 1000,
    isBuy: v.is_buy as boolean,
    trader: v.trader as string,
    pairAmt: v.pair_amt as bigint,
    memeAmt: v.meme_amt as bigint,
    vPair: v.v_pair as bigint,
    vToken: v.v_token as bigint,
    realPair: v.real_pair as bigint,
    txHash,
    id,
  };
}

export type TradeJson = Omit<TradePoint, "pairAmt" | "memeAmt" | "vPair" | "vToken" | "realPair"> & {
  pairAmt: string;
  memeAmt: string;
  vPair: string;
  vToken: string;
  realPair: string;
};

export const tradeToJson = (t: TradePoint): TradeJson => ({
  ...t,
  pairAmt: t.pairAmt.toString(),
  memeAmt: t.memeAmt.toString(),
  vPair: t.vPair.toString(),
  vToken: t.vToken.toString(),
  realPair: t.realPair.toString(),
});

export const tradeFromJson = (t: TradeJson): TradePoint => ({
  ...t,
  pairAmt: BigInt(t.pairAmt),
  memeAmt: BigInt(t.memeAmt),
  vPair: BigInt(t.vPair),
  vToken: BigInt(t.vToken),
  realPair: BigInt(t.realPair),
});
