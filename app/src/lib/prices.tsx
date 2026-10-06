"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { usePoll } from "@/hooks/usePoll";
import { PAIRS, type PairSymbol } from "./config";
import { bondUsd, type Rates } from "./rates";

interface Prices {
  /** USD value of one unit of the pair: Etherfuse's NAV at today's exchange rate. */
  usd: (pair: PairSymbol) => number;
  /** The bond's current annual rate, in percent. Null until loaded. */
  yieldPct: (pair: PairSymbol) => number | null;
  /** The bond's NAV and rate, in its own currency. Null until loaded. */
  bond: (pair: PairSymbol) => { nav: number; rateBps: number } | null;
}


const Ctx = createContext<Prices | null>(null);

async function fetchRates(): Promise<Rates> {
  const res = await fetch("/api/rates");
  if (!res.ok) throw new Error("Sin precios de Etherfuse");
  return res.json();
}

export function PriceProvider({ children }: { children: ReactNode }) {
  const rates = usePoll(fetchRates, 300_000);

  const usd = useCallback(
    (symbol: PairSymbol) => {
      const p = PAIRS.find((x) => x.symbol === symbol)!;
      return bondUsd(rates.data, symbol, p.currency, p.usd0);
    },
    [rates.data],
  );

  const yieldPct = useCallback(
    (symbol: PairSymbol) => {
      const b = rates.data?.bonds[symbol];
      return b ? b.rateBps / 100 : null;
    },
    [rates.data],
  );

  const bond = useCallback((symbol: PairSymbol) => rates.data?.bonds[symbol] ?? null, [rates.data]);

  return <Ctx.Provider value={{ usd, yieldPct, bond }}>{children}</Ctx.Provider>;
}

export function usePrices() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePrices outside PriceProvider");
  return v;
}
