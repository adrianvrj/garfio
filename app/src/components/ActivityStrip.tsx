"use client";

import { artSeed } from "@/lib/avatar";
import Link from "next/link";
import { useMarket } from "@/hooks/useMarket";
import { useT } from "@/i18n/client";
import { LAUNCHPAD_ID } from "@/lib/config";
import { compact, fmt, fromUnits } from "@/lib/units";
import { TokenArt } from "./Art";
import { Identity } from "./Identity";

/** Live trades across every coin, newest first. Pauses on hover. */
export function ActivityStrip() {
  const { rows, activity } = useMarket();
  const tr = useT().activity;
  const bySymbol = new Map(rows.map((r) => [r.m.id, r]));
  const trades = [...(activity.data ?? [])].reverse().slice(0, 24);
  if (!trades.length) return <div className="activity"><span className="activity-label">{tr.label}</span></div>;

  const items = trades.map((t) => {
    const r = bySymbol.get(t.meme);
    const pair = r?.v.pair;
    return (
      <Link
        key={t.id}
        href={`/m/${t.meme}`}
        className="act"
      >
        <Identity address={t.trader} size={20} />
        <span className={t.isBuy ? undefined : "sell"}>{t.trader === LAUNCHPAD_ID ? tr.boughtBack : t.isBuy ? tr.bought : tr.sold}</span>
        <span className="num">
          {t.isBuy
            ? `${fmt(fromUnits(t.pairAmt), pair?.decimals ?? 2)} ${pair?.symbol ?? ""}`
            : `${compact(fromUnits(t.memeAmt))}`}
        </span>
        <span>{tr.of}</span>
        {r && <TokenArt seed={artSeed(r.m)} size={18} />}
        <b>${r?.m.symbol ?? "…"}</b>
      </Link>
    );
  });

  return (
    <div className="activity" aria-label={tr.aria}>
      <span className="activity-label">{tr.label}</span>
      <div className="activity-viewport">
        <div className="activity-track">
          {items}
          <span aria-hidden="true" style={{ display: "contents" }}>{items}</span>
        </div>
      </div>
    </div>
  );
}
