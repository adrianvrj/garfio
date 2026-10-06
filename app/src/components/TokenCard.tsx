"use client";

import { artSeed } from "@/lib/avatar";
import Link from "next/link";
import { last24h, type MarketRow } from "@/hooks/useMarket";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { ago, compact, fmt, fromUnits, pct, usd } from "@/lib/units";
import { YieldBadge } from "./YieldBadge";
import { TokenArt } from "./Art";
import { Identity } from "./Identity";
import { Progress } from "./Progress";

export function PairBadge({ row }: { row: MarketRow }) {
  const p = row.v.pair;
  if (!p) return null;
  return (
    <>
      <span className="badge">{p.symbol}</span>
      <YieldBadge pair={p} />
    </>
  );
}

export function FavoriteButton({ id }: { id: string }) {
  const on = useFavorites().includes(id);
  return (
    <button className="star" aria-pressed={on} aria-label="Favorita" title="Favorita" onClick={() => toggleFavorite(id)}>
      {on ? "★" : "☆"}
    </button>
  );
}

export function TokenCard({ row, now }: { row: MarketRow; now: number }) {
  const { m, v, progress, trades, lastAt } = row;
  const day = last24h(m, trades, v.pairUsd, now);
  return (
    <div className="card-cell">
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
            {day && <span className={`num ${day.change >= 0 ? "buy" : "sell"}`}>{pct(day.change)} </span>}
            <span className="muted num">· {compact(fromUnits(row.backing))} {v.pair?.symbol} {m.pool ? "en el pool" : "en reserva"}</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Progress value={progress} label="Graduación" style={{ flex: 1 }} />
            <span className="num small ink2">{m.graduated ? "graduada" : `${fmt(progress, 0)}%`}</span>
          </div>
          <div className="meta">
            <PairBadge row={row} />
            {day && <span>· vol 24 h {usd(day.volumeUsd, 0)}</span>}
            <span>· {trades.length} trades</span>
            <span>· {ago(lastAt, now)}</span>
          </div>
        </div>
      </Link>
      <FavoriteButton id={m.id} />
    </div>
  );
}
