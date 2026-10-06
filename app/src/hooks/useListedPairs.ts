"use client";

import { usePoll } from "./usePoll";
import { PAIRS, type PairInfo } from "@/lib/config";

async function fetchListed(): Promise<string[]> {
  const res = await fetch("/api/faucet");
  if (!res.ok) throw new Error("Sin lista de bonos");
  return (await res.json()).symbols;
}

/**
 * The bonds to offer: on testnet, those the faucet can hand out, so nobody picks one they cannot
 * get. Every bond until the list loads, or if it fails.
 */
export function useListedPairs(): PairInfo[] {
  const listed = usePoll(fetchListed, 300_000, "listed");
  return listed.data ? PAIRS.filter((p) => listed.data!.includes(p.symbol)) : PAIRS;
}
