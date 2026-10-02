"use client";

import { useMemes, useValuation } from "@/hooks/useMarket";
import { usePrices } from "@/lib/prices";
import { usd } from "@/lib/units";

export function Tape() {
  const { data: memes } = useMemes();
  const value = useValuation();
  const { usd: pairUsd } = usePrices();
  const items = (
    <>
      {(memes ?? []).map((m) => {
        const v = value(m);
        return (
          <span key={m.id}>
            <b>${m.symbol}</b>/{v.pair?.symbol} mcap {usd(v.mcapUsd, 0)}
          </span>
        );
      })}
      <span><b>tCETES</b> {usd(pairUsd("tCETES"), 4)}</span>
      <span><b>tUSTRY</b> {usd(pairUsd("tUSTRY"), 4)}</span>
      <span><b>tNVDA</b> {usd(pairUsd("tNVDA"))}</span>
    </>
  );
  return (
    <div className="tape" aria-hidden="true">
      <div className="tape-inner">
        {items}
        {items}
      </div>
    </div>
  );
}
