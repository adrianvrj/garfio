"use client";

import type { PairInfo } from "@/lib/config";
import { usePrices } from "@/lib/prices";
import { fmt } from "@/lib/units";

/** The pair's on-chain annual rate, once it has loaded. */
export function YieldBadge({ pair, suffix = " anual" }: { pair: PairInfo; suffix?: string }) {
  const pct = usePrices().yieldPct(pair.symbol);
  if (pct === null) return null;
  return <span className="badge yield">+{fmt(pct, 2)}%{suffix}</span>;
}
