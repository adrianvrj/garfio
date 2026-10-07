"use client";

import { artSeed } from "@/lib/avatar";
import Link from "next/link";
import { last24h, type MarketRow } from "@/hooks/useMarket";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { ago, compact, fmt, fromUnits, pct, usd } from "@/lib/units";
import { usePrices } from "@/lib/prices";
import { useT } from "@/i18n/client";
import { TokenArt } from "./Art";
import { Identity } from "./Identity";
import { Progress } from "./Progress";

export function FavoriteButton({ id }: { id: string }) {
  const on = useFavorites().includes(id);
  const t = useT();
  return (
    <button className="star" aria-pressed={on} aria-label={t.common.favorite} title={t.common.favorite} onClick={() => toggleFavorite(id)}>
      {on ? "★" : "☆"}
    </button>
  );
}

/** A meme as a news story: photo, kicker, headline written from its numbers, byline, lede. */
export function TokenCard({ row, now }: { row: MarketRow; now: number }) {
  const { m, v, progress, trades, lastAt } = row;
  const day = last24h(m, trades, v.pairUsd, now);
  const rate = usePrices().yieldPct(v.pair?.symbol ?? "CETES");
  const t = useT();
  return (
    <article className="card-cell">
      <Link href={`/m/${m.id}`} className="card">
        <TokenArt seed={artSeed(m)} wide />
        <span className="kicker">
          {v.pair?.symbol}{rate !== null && t.card.yields(fmt(rate, 2))} · {m.name}
        </span>
        <h3>{t.news.story(m.symbol, { graduated: m.graduated, progress, change: day?.change })}</h3>
        <span className="byline">
          {t.common.by} <Identity address={m.creator} size={14} /> · {ago(t, Number(m.created_at) * 1000, now)}
        </span>
        <p className="lede end">
          {t.card.lede({
            mcap: usd(v.mcapUsd, 0),
            change: day && <span className={day.change >= 0 ? "buy" : "sell"}>{pct(day.change)}</span>,
            reserve: `${compact(fromUnits(row.backing))} ${v.pair?.symbol ?? ""}`,
            inPool: Boolean(m.pool),
            trades: trades.length,
            volume: day ? usd(day.volumeUsd, 0) : null,
            last: ago(t, lastAt, now),
          })}
        </p>
        <div className="grad">
          <Progress value={progress} label={t.common.graduation} />
          <span>{m.graduated ? t.common.graduated : `${fmt(progress, 0)}%`}</span>
        </div>
      </Link>
      <FavoriteButton id={m.id} />
    </article>
  );
}
