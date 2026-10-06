"use client";

import { fetchMemes, fetchPool, fetchPoolTrades, fetchPosition, fetchTrades, balanceOf, quoteSell, type Meme, type TradePoint } from "@/lib/chain";
import { PAIRS, pairById } from "@/lib/config";
import { gradProgress, pricePair, SUPPLY } from "@/lib/curve";
import { fromUnits } from "@/lib/units";
import { usePrices } from "@/lib/prices";
import { usePoll } from "./usePoll";

export function useMemes() {
  return usePoll(fetchMemes, 5_000);
}

/** Every meme's trades from the last ~7 days, oldest first. */
export function useActivity() {
  return usePoll(() => fetchTrades(), 10_000, "all");
}

/** USD price per meme and market cap, using the pair's current USD value. */
export function useValuation() {
  const { usd } = usePrices();
  return (m: Meme) => {
    const pair = pairById(m.pair);
    const pairUsd = pair ? usd(pair.symbol) : 0;
    const priceUsd = pricePair(m) * pairUsd;
    return { pair, pairUsd, priceUsd, mcapUsd: priceUsd * SUPPLY, reserveUsd: fromUnits(m.real_pair) * pairUsd };
  };
}

const DAY_MS = 86_400_000;

/**
 * Price change (%) and USD volume of the last 24 h of curve trades. The curve price only moves
 * on a trade, and it keeps v_pair·v_token constant, so the price before the window's first trade
 * follows from that trade's event. Once migrated the trades are the pool's swaps, whose reserves
 * keep the same product but for Soroswap's fee, so the same reading holds to within it.
 */
export function last24h(m: Meme, trades: TradePoint[], pairUsd: number, now: number) {
  const recent = trades.filter((t) => t.at >= now - DAY_MS);
  if (!recent.length) return { change: 0, volumeUsd: 0 };
  const first = recent[0];
  const vToken = Number(first.vToken) + (first.isBuy ? 1 : -1) * Number(first.memeAmt);
  const before = (Number(first.vPair) * Number(first.vToken)) / vToken ** 2;
  return {
    change: (current(m, trades) / before - 1) * 100,
    volumeUsd: recent.reduce((s, t) => s + fromUnits(t.pairAmt), 0) * pairUsd,
  };
}

/** The meme's price in pair units now: the curve's, or the pool's after its last swap. */
function current(m: Meme, trades: TradePoint[]) {
  const last = trades[trades.length - 1];
  return m.pool && last?.pool ? Number(last.vPair) / Number(last.vToken) : pricePair(m);
}

/** Swaps on each migrated meme's Soroswap pool, oldest first. */
function usePoolTrades(memes: Meme[]) {
  const migrated = memes.filter((m) => m.pool);
  return usePoll(
    migrated.length
      ? async () => (await Promise.all(migrated.map((m) => fetchPoolTrades(m.id, m.pool!)))).flat()
      : null,
    15_000,
    migrated.map((m) => m.id).join(","),
  );
}

export interface MarketRow {
  m: Meme;
  v: ReturnType<ReturnType<typeof useValuation>>;
  /** Bond units backing the meme: the curve's reserve, or its pool's once migrated. */
  backing: bigint;
  backingUsd: number;
  progress: number;
  trades: TradePoint[];
  lastAt: number;
}

/** Bond units in each migrated meme's Soroswap pool. */
function usePoolReserves(memes: Meme[]) {
  const migrated = memes.filter((m) => m.pool);
  return usePoll(
    migrated.length
      ? async () => {
          const pools = await Promise.all(migrated.map(fetchPool));
          return Object.fromEntries(migrated.map((m, i) => [m.id, pools[i]?.pairAmt ?? 0n])) as Record<string, bigint>;
        }
      : null,
    30_000,
    migrated.map((m) => m.id).join(","),
  );
}

/** Memes joined with their valuation, backing and recent activity. */
export function useMarket() {
  const memes = useMemes();
  const activity = useActivity();
  const value = useValuation();
  const pools = usePoolReserves(memes.data ?? []);
  const swaps = usePoolTrades(memes.data ?? []);
  const all = activity.data ? [...activity.data, ...(swaps.data ?? [])].sort((a, b) => a.at - b.at) : null;
  const byMeme = new Map<string, TradePoint[]>();
  for (const t of all ?? []) {
    if (!byMeme.has(t.meme)) byMeme.set(t.meme, []);
    byMeme.get(t.meme)!.push(t);
  }
  const rows: MarketRow[] = (memes.data ?? []).map((m) => {
    const trades = byMeme.get(m.id) ?? [];
    const v = value(m);
    const backing = m.pool ? (pools.data?.[m.id] ?? 0n) : m.real_pair;
    return {
      m,
      v,
      backing,
      backingUsd: fromUnits(backing) * v.pairUsd,
      progress: gradProgress(m),
      trades,
      lastAt: trades.length ? trades[trades.length - 1].at : Number(m.created_at) * 1000,
    };
  });
  return { rows, memes, activity: { ...activity, data: all } };
}

/** Balances of the three pairs plus the given memes for `address`. */
export function useBalances(address: string | null, memeIds: string[] = []) {
  const key = memeIds.join(",");
  return usePoll(
    address
      ? async () => {
          const ids = [...PAIRS.map((p) => p.id), ...memeIds];
          // A bond's asset contract fails the read for an account without its trustline: that is a 0.
          const vals = await Promise.all(ids.map((id) => balanceOf(id, address).catch(() => 0n)));
          return Object.fromEntries(ids.map((id, i) => [id, vals[i]])) as Record<string, bigint>;
        }
      : null,
    8_000,
    `${address}|${key}`,
  );
}

/** A meme `address` holds or traded, valued in its pair. P&L only covers tokens bought on the curve. */
export interface Holding {
  m: Meme;
  bal: bigint;
  /** Balance × spot price: the curve's, or the pool's once migrated. */
  value: number;
  /** Mark-to-market P&L of the held tokens with a known cost; null if there are none. */
  unrealized: number | null;
  /** Cost of those tokens. */
  cost: number;
  realized: number;
  /** What selling the whole balance returns now, and the P&L of selling the part with a known cost. Null once graduated. */
  sellAll: { out: number; pnl: number | null } | null;
}

/** `address`'s balance and curve position in each meme, for the ones they hold or traded. */
export function usePositions(address: string | null, memes: Meme[]) {
  return usePoll(
    address
      ? async () => {
          const rows = await Promise.all(
            memes.map(async (m): Promise<Holding | null> => {
              const [bal, pos, pool] = await Promise.all([balanceOf(m.id, address), fetchPosition(address, m.id), fetchPool(m)]);
              if (bal === 0n && pos.held === 0n && pos.realized === 0n) return null;
              // Tokens beyond `held` came by transfer; tokens sent away take their share of the cost.
              const covered = bal < pos.held ? bal : pos.held;
              const cost = covered > 0n ? (pos.cost * covered) / pos.held : 0n;
              const price = pool ? Number(pool.pairAmt) / Number(pool.memeAmt) : pricePair(m);
              const [all, part] =
                m.graduated || bal === 0n
                  ? [null, null]
                  : await Promise.all([quoteSell(m.id, bal), covered > 0n && covered < bal ? quoteSell(m.id, covered) : null]);
              const coveredOut = part ?? (covered > 0n ? all : null);
              return {
                m,
                bal,
                value: fromUnits(bal) * price,
                unrealized: covered > 0n ? fromUnits(covered) * price - fromUnits(cost) : null,
                cost: fromUnits(cost),
                realized: fromUnits(pos.realized),
                sellAll: all && {
                  out: fromUnits(all.out),
                  pnl: coveredOut && fromUnits(coveredOut.out) - fromUnits(cost),
                },
              };
            }),
          );
          return rows.filter((h) => h !== null);
        }
      : null,
    15_000,
    `${address}|${memes.map((m) => m.id).join(",")}`,
  );
}
