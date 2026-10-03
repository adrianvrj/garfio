"use client";

import { fetchMemes, fetchTrades, balanceOf, type Meme, type TradePoint } from "@/lib/chain";
import { PAIRS, pairById } from "@/lib/config";
import { gradProgress, pricePair, SUPPLY } from "@/lib/curve";
import { fromUnits } from "@/lib/units";
import { usePrices } from "@/lib/prices";
import { usePoll } from "./usePoll";

export function useMemes() {
  return usePoll(fetchMemes, 5_000);
}

/** Every meme's trades from the last ~24 h, oldest first. */
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

export interface MarketRow {
  m: Meme;
  v: ReturnType<ReturnType<typeof useValuation>>;
  progress: number;
  trades: TradePoint[];
  lastAt: number;
}

/** Memes joined with their valuation and recent activity. */
export function useMarket() {
  const memes = useMemes();
  const activity = useActivity();
  const value = useValuation();
  const byMeme = new Map<string, TradePoint[]>();
  for (const t of activity.data ?? []) {
    if (!byMeme.has(t.meme)) byMeme.set(t.meme, []);
    byMeme.get(t.meme)!.push(t);
  }
  const rows: MarketRow[] = (memes.data ?? []).map((m) => {
    const trades = byMeme.get(m.id) ?? [];
    return {
      m,
      v: value(m),
      progress: gradProgress(m),
      trades,
      lastAt: trades.length ? trades[trades.length - 1].at : Number(m.created_at) * 1000,
    };
  });
  return { rows, memes, activity };
}

/** Balances of the three pairs plus the given memes for `address`. */
export function useBalances(address: string | null, memeIds: string[] = []) {
  const key = memeIds.join(",");
  return usePoll(
    address
      ? async () => {
          const ids = [...PAIRS.map((p) => p.id), ...memeIds];
          const vals = await Promise.all(ids.map((id) => balanceOf(id, address)));
          return Object.fromEntries(ids.map((id, i) => [id, vals[i]])) as Record<string, bigint>;
        }
      : null,
    8_000,
    `${address}|${key}`,
  );
}
