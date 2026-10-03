"use client";

import { artSeed } from "@/lib/avatar";
import Link from "next/link";
import type { MarketRow } from "@/hooks/useMarket";
import { ago, compact, fmt, fromUnits, usd } from "@/lib/units";
import { TokenArt } from "./Art";
import { Identity } from "./Identity";

export function PairBadge({ row }: { row: MarketRow }) {
  const p = row.v.pair;
  if (!p) return null;
  return (
    <>
      <span className="badge">{p.symbol}</span>
      {p.yieldPct !== null && <span className="badge yield">+{fmt(p.yieldPct, 1)}% anual</span>}
    </>
  );
}

export function TokenCard({ row, now }: { row: MarketRow; now: number }) {
  const { m, v, progress, trades, lastAt } = row;
  return (
    <Link href={`/m/${m.id}`} className="card">
      <TokenArt seed={artSeed(m)} size={96} />
      <div className="stack" style={{ gap: 6, minWidth: 0 }}>
        <div className="title">
          <b>${m.symbol}</b>
          <span>{m.name}</span>
        </div>
        <div className="meta">
          <Identity address={m.creator} size={16} />
          <span>· {ago(Number(m.created_at) * 1000, now)}</span>
        </div>
        <div className="mcap">
          mcap <b className="num">{usd(v.mcapUsd, 0)}</b>{" "}
          <span className="muted num">· {compact(fromUnits(m.real_pair))} {v.pair?.symbol} en reserva</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="progress" style={{ flex: 1 }} aria-label={`Graduación ${fmt(progress, 0)}%`}>
            <i style={{ width: `${progress}%` }} />
          </div>
          <span className="num small ink2">{m.graduated ? "graduada" : `${fmt(progress, 0)}%`}</span>
        </div>
        <div className="meta">
          <PairBadge row={row} />
          <span>· {trades.length} trades</span>
          <span>· {ago(lastAt, now)}</span>
        </div>
      </div>
    </Link>
  );
}
