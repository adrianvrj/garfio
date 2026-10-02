"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DEPLOYED_AT, type PairSymbol } from "./config";

const DAY_MS = 86_400_000;
const YIELD: Partial<Record<PairSymbol, number>> = { tCETES: 0.07, tUSTRY: 0.042 };

interface Prices {
  /** Demo offset added to real elapsed days. Display only. */
  dayOffset: number;
  advance: (days: number) => void;
  nvda: number;
  nvdaLive: number | null;
  setNvdaOverride: (v: number | null) => void;
  /** Days since launch, demo offset included. */
  days: () => number;
  /** USD value of one unit of the pair. */
  usd: (pair: PairSymbol) => number;
  /** USD value of the pair at a past time, without the demo offset (NVDA has no history: today's price). */
  usdAt: (pair: PairSymbol, at: number) => number;
}

const Ctx = createContext<Prices | null>(null);

export function PriceProvider({ children }: { children: ReactNode }) {
  const [dayOffset, setDayOffset] = useState(0);
  const [nvdaLive, setNvdaLive] = useState<number | null>(null);
  const [nvdaOverride, setNvdaOverride] = useState<number | null>(null);
  // Clock for yield accrual. Ticks slowly so values are stable between renders.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = () =>
      fetch("/api/nvda")
        .then((r) => r.json())
        .then((j) => setNvdaLive(j.price))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const nvda = nvdaOverride ?? nvdaLive ?? 182;
  const days = useCallback(() => Math.max(0, (now - DEPLOYED_AT) / DAY_MS) + dayOffset, [now, dayOffset]);
  const usd = useCallback(
    (pair: PairSymbol) => {
      if (pair === "tNVDA") return nvda;
      return Math.pow(1 + (YIELD[pair] ?? 0), days() / 365);
    },
    [nvda, days],
  );

  const usdAt = useCallback(
    (pair: PairSymbol, at: number) => {
      if (pair === "tNVDA") return nvda;
      return Math.pow(1 + (YIELD[pair] ?? 0), Math.max(0, (at - DEPLOYED_AT) / DAY_MS) / 365);
    },
    [nvda],
  );

  return (
    <Ctx.Provider
      value={{ dayOffset, advance: (d) => setDayOffset((o) => o + d), nvda, nvdaLive, setNvdaOverride, days, usd, usdAt }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePrices() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePrices outside PriceProvider");
  return v;
}
