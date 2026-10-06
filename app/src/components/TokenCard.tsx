"use client";

import { artSeed } from "@/lib/avatar";
import Link from "next/link";
import { last24h, type MarketRow } from "@/hooks/useMarket";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { ago, compact, fmt, fromUnits, pct, usd } from "@/lib/units";
import { storyHeadline } from "@/lib/news";
import { usePrices } from "@/lib/prices";
import { TokenArt } from "./Art";
import { Identity } from "./Identity";
import { Progress } from "./Progress";

export function FavoriteButton({ id }: { id: string }) {
  const on = useFavorites().includes(id);
  return (
    <button className="star" aria-pressed={on} aria-label="Favorita" title="Favorita" onClick={() => toggleFavorite(id)}>
      {on ? "★" : "☆"}
    </button>
  );
}

/** A meme as a news story: photo, kicker, headline written from its numbers, byline, lede. */
export function TokenCard({ row, now }: { row: MarketRow; now: number }) {
  const { m, v, progress, trades, lastAt } = row;
  const day = last24h(m, trades, v.pairUsd, now);
  const rate = usePrices().yieldPct(v.pair?.symbol ?? "CETES");
  return (
    <article className="card-cell">
      <Link href={`/m/${m.id}`} className="card">
        <TokenArt seed={artSeed(m)} wide />
        <span className="kicker">
          {v.pair?.symbol}{rate !== null && ` · rinde ${fmt(rate, 2)}%`} · {m.name}
        </span>
        <h3>{storyHeadline(m.symbol, { graduated: m.graduated, progress, change: day?.change })}</h3>
        <span className="byline">
          Por <Identity address={m.creator} size={14} /> · {ago(Number(m.created_at) * 1000, now)}
        </span>
        <p className="lede end">
          Vale {usd(v.mcapUsd, 0)}
          {day && <> (<span className={day.change >= 0 ? "buy" : "sell"}>{pct(day.change)}</span>)</>} y guarda{" "}
          {compact(fromUnits(row.backing))} {v.pair?.symbol} {m.pool ? "en su pool de Soroswap" : "en reserva"}.
          {" "}{trades.length} operaciones{day ? `, ${usd(day.volumeUsd, 0)} en 24 h` : ""}; la última, {ago(lastAt, now)}.
        </p>
        <div className="grad">
          <Progress value={progress} label="Graduación" />
          <span>{m.graduated ? "Graduada" : `${fmt(progress, 0)}%`}</span>
        </div>
      </Link>
      <FavoriteButton id={m.id} />
    </article>
  );
}
