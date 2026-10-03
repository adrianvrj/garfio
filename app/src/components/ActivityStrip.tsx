"use client";

import { artSeed } from "@/lib/avatar";
import Link from "next/link";
import { useMarket } from "@/hooks/useMarket";
import { compact, fmt, fromUnits } from "@/lib/units";
import { TokenArt } from "./Art";
import { Identity } from "./Identity";

/** Live trades across every coin, newest first. Pauses on hover. */
export function ActivityStrip() {
  const { rows, activity } = useMarket();
  const bySymbol = new Map(rows.map((r) => [r.m.id, r]));
  const trades = [...(activity.data ?? [])].reverse().slice(0, 24);
  if (!trades.length) return <div className="activity" style={{ height: 45 }} />;

  const items = trades.map((t, i) => {
    const r = bySymbol.get(t.meme);
    const pair = r?.v.pair;
    return (
      <Link
        key={t.id}
        href={`/m/${t.meme}`}
        className={`act ${t.isBuy ? "is-buy" : "is-sell"} ${i === 0 ? "fresh" : ""}`}
      >
        <Identity address={t.trader} size={20} />
        <span className={t.isBuy ? "buy" : "sell"}>{t.isBuy ? "compró" : "vendió"}</span>
        <span className="num">
          {t.isBuy
            ? `${fmt(fromUnits(t.pairAmt), pair?.decimals ?? 2)} ${pair?.symbol ?? ""}`
            : `${compact(fromUnits(t.memeAmt))}`}
        </span>
        <span>de</span>
        {r && <TokenArt seed={artSeed(r.m)} size={18} rounded={4} />}
        <b>${r?.m.symbol ?? "…"}</b>
      </Link>
    );
  });

  return (
    <div className="activity" aria-label="Actividad en vivo">
      <div className="activity-track">
        {items}
        <span aria-hidden="true" style={{ display: "contents" }}>{items}</span>
      </div>
    </div>
  );
}
