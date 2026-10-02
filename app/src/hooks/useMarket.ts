"use client";

import { fetchMemes, balanceOf, type Meme } from "@/lib/chain";
import { PAIRS, pairById } from "@/lib/config";
import { pricePair, SUPPLY } from "@/lib/curve";
import { usePrices } from "@/lib/prices";
import { usePoll } from "./usePoll";

export function useMemes() {
  return usePoll(fetchMemes, 5_000);
}

/** USD price per meme and market cap, using the pair's current USD value. */
export function useValuation() {
  const { usd } = usePrices();
  return (m: Meme) => {
    const pair = pairById(m.pair);
    const pairUsd = pair ? usd(pair.symbol) : 0;
    const priceUsd = pricePair(m) * pairUsd;
    return { pair, pairUsd, priceUsd, mcapUsd: priceUsd * SUPPLY };
  };
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
