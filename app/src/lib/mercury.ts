// Mercury (xycloo's Stellar indexer): every event since the contract was deployed, where the
// public RPC keeps about 7 days. Server-only: the token lives in MERCURY_JWT.
import { LAUNCHPAD_ID, MERCURY_URL } from "./config";
import { decodeTrade, TRADE_TOPIC, type TradePoint } from "./events";

export interface MercuryEvent {
  id: number;
  topic1: string | null;
  topic2: string | null;
  data: string;
  tx: string;
}

const LIMIT = 1000;
/** A ceiling on pages per call: 50k events. */
const MAX_PAGES = 50;

/** The launchpad's events with `topic` as their first topic, oldest first, following Mercury's cursor. */
export async function mercuryEvents(jwt: string, topic: string): Promise<MercuryEvent[]> {
  const out: MercuryEvent[] = [];
  let cursor: number | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const q = new URLSearchParams({ topics: topic, limit: String(LIMIT) });
    if (cursor !== null) q.set("cursor", String(cursor));
    const res = await fetch(`${MERCURY_URL}/events/by-contract/${LAUNCHPAD_ID}?${q}`, {
      headers: { Authorization: `Bearer ${jwt}`, Accept: "application/json" },
      next: { revalidate: 5 },
    });
    if (!res.ok) throw new Error(`Mercury respondió ${res.status}`);
    const rows = (await res.json()) as MercuryEvent[];
    out.push(...rows.filter((r) => r.topic1 === topic));
    if (rows.length < LIMIT) break;
    cursor = rows[rows.length - 1].id;
  }
  return out.sort((a, b) => a.id - b.id);
}

/** Every trade, oldest first. */
export async function mercuryTrades(jwt: string): Promise<TradePoint[]> {
  return (await mercuryEvents(jwt, TRADE_TOPIC))
    .filter((r) => r.topic2)
    .map((r) => decodeTrade([r.topic1!, r.topic2!], r.data, r.tx, String(r.id)));
}
