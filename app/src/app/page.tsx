"use client";

import { artSeed } from "@/lib/avatar";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useListedPairs } from "@/hooks/useListedPairs";
import { last24h, useMarket, type MarketRow } from "@/hooks/useMarket";
import { Logo } from "@/components/Logo";
import { IS_MAINNET, PAIRS } from "@/lib/config";
import { usePrices } from "@/lib/prices";
import { useLocaleTag, useT } from "@/i18n/client";
import type { Dict } from "@/i18n/locales";
import { useFavorites } from "@/lib/favorites";
import { compact, fmt, fromUnits, usd } from "@/lib/units";
import { TokenArt } from "@/components/Art";
import { Identity } from "@/components/Identity";
import { TokenCard } from "@/components/TokenCard";
import { Progress } from "@/components/Progress";

const SORTS = {
  activity: (a: MarketRow, b: MarketRow) => b.lastAt - a.lastAt,
  new: (a: MarketRow, b: MarketRow) => Number(b.m.created_at - a.m.created_at),
  mcap: (a: MarketRow, b: MarketRow) => b.v.mcapUsd - a.v.mcapUsd,
  grad: (a: MarketRow, b: MarketRow) => b.progress - a.progress,
} satisfies Record<keyof Dict["home"]["sorts"], unknown>;
type SortKey = keyof typeof SORTS;

/** The closest meme to graduating, laid out as the paper's lead story: banner, photo, copy. */
function King({ row }: { row: MarketRow }) {
  const { m, v, progress } = row;
  const rate = usePrices().yieldPct(v.pair?.symbol ?? "CETES");
  const t = useT();
  const label = t.pairLabel[v.pair?.symbol ?? ""] ?? t.pairLabel.other;
  return (
    <Link href={`/m/${m.id}`} className="king">
      <p className="banner" aria-hidden="true">{t.news.banner(progress)}</p>
      <div className="king-photo">
        <div className="frame">
          <TokenArt seed={artSeed(m)} wide />
          <h2 className="lead-head">{t.news.lead(m.symbol, progress)}</h2>
          {progress >= 90 && <span className="special" aria-hidden="true">{t.home.special}</span>}
        </div>
        <span className="credit">{t.home.photo} <Identity address={m.creator} size={12} /></span>
      </div>
      <div className="king-copy">
        <span className="kicker">{t.home.kingKicker(m.name)}</span>
        <p className="deck">{t.home.kingDeck(fmt(progress, 1), label)}</p>
        <p className="lede dropcap end">
          {t.home.kingLede({
            reserve: compact(fromUnits(row.backing)),
            sym: v.pair?.symbol ?? "",
            rate: rate !== null ? fmt(rate, 2) : null,
            mcap: usd(v.mcapUsd, 0),
          })}
        </p>
        <div className="king-stats">
          <div><span className="muted">{t.common.marketCap}</span><b className="num">{usd(v.mcapUsd, 0)}</b></div>
          <div><span className="muted">{t.home.reserveIn(v.pair?.symbol ?? "")}</span><span className="num">{compact(fromUnits(row.backing))} · {usd(row.backingUsd, 0)}</span></div>
        </div>
        <Progress value={progress} label={t.common.graduation} />
        <span className="jump">{t.home.jump(m.symbol)}</span>
      </div>
    </Link>
  );
}

/** The flag with its ears, motto and edition line. The ears tease the day's biggest mover and newest meme. */
function Masthead({ now, rows }: { now: number; rows: MarketRow[] }) {
  const prices = usePrices();
  const listed = useListedPairs();
  const t = useT();
  const date = new Date(now).toLocaleDateString(useLocaleTag(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const moves = rows.map((r) => ({ r, day: last24h(r.m, r.trades, r.v.pairUsd, now) }));
  const mover = moves.filter((x) => x.day).sort((a, b) => Math.abs(b.day!.change) - Math.abs(a.day!.change))[0];
  const newest = [...rows].sort((a, b) => Number(b.m.created_at - a.m.created_at))[0];
  const ears = [
    mover && { r: mover.r, text: t.news.ear(mover.r.m.symbol, { change: mover.day!.change }) },
    newest && newest !== mover?.r && { r: newest, text: t.news.ear(newest.m.symbol, { fresh: true }) },
  ].filter(Boolean) as { r: MarketRow; text: string }[];
  return (
    <header className="masthead">
      {ears.length > 0 && (
        <div className="ears">
          {ears.map(({ r, text }) => (
            <Link key={r.m.id} href={`/m/${r.m.id}`} className="ear">
              <b>{text}</b>
              <span>{t.home.page(r.m.symbol)}</span>
            </Link>
          ))}
        </div>
      )}
      <span className="motto">{t.home.motto}</span>
      <div className="flag">
        <h1 className="flag-word">The Hooks</h1>
        <span className="flag-mark"><Logo /></span>
        <span className="flag-word" aria-hidden="true">Daily</span>
      </div>
      <div className="edition">
        <span>{t.home.edition(IS_MAINNET)}</span>
        <span>{date.charAt(0).toUpperCase() + date.slice(1)}</span>
        {listed.map((p) => {
          const rate = prices.yieldPct(p.symbol);
          return rate === null ? null : <span key={p.id}>{t.home.weather(p.symbol, fmt(rate, 2))}</span>;
        })}
        <span>{t.home.issue(rows.length)}</span>
        <span>{t.home.free}</span>
      </div>
    </header>
  );
}

function Market() {
  const q = (useSearchParams().get("q") ?? "").toLowerCase();
  const { rows, memes } = useMarket();
  const [sort, setSort] = useState<SortKey>("activity");
  const [pair, setPair] = useState<string | null>(null);
  const favorites = useFavorites();
  const listed = useListedPairs();
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [now] = useState(() => Date.now());
  const t = useT();

  const king = [...rows].filter((r) => !r.m.graduated).sort(SORTS.grad)[0];
  const shown = rows
    .filter((r) => !pair || r.m.pair === pair)
    .filter((r) => !onlyFavs || favorites.includes(r.m.id))
    .filter((r) => !q || r.m.symbol.toLowerCase().includes(q) || r.m.name.toLowerCase().includes(q))
    .sort(SORTS[sort]);
  const backedUsd = rows.reduce((s, r) => s + r.backingUsd, 0);
  const backedBy = PAIRS.map((p) => ({
    p,
    units: rows.filter((r) => r.m.pair === p.id).reduce((s, r) => s + fromUnits(r.backing), 0),
  })).filter((b) => b.units > 0);

  return (
    <>
      {!q && <Masthead now={now} rows={rows} />}
      {king && !q && <King row={king} />}

      <nav className="toolbar" aria-label={t.home.sections}>
        <div className="chips" role="group" aria-label={t.home.sortBy}>
          {(Object.keys(SORTS) as SortKey[]).map((k) => (
            <button key={k} className="chip" aria-pressed={sort === k} onClick={() => setSort(k)}>
              {t.home.sorts[k]}
            </button>
          ))}
        </div>
        <div className="row">
          <button className="chip" aria-pressed={onlyFavs} onClick={() => setOnlyFavs(!onlyFavs)}>{t.home.favorites}</button>
          <span className="sep" />
          <div className="chips" role="group" aria-label={t.home.filterBy}>
            <button className="chip" aria-pressed={pair === null} onClick={() => setPair(null)}>{t.home.all}</button>
            {listed.map((p) => (
              <button key={p.id} className="chip" aria-pressed={pair === p.id} onClick={() => setPair(p.id)}>
                {p.symbol}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="front">
        <div className="front-main">
          {q && <p className="muted" style={{ marginBottom: 12 }}>{t.home.results(q)}</p>}

          {memes.loading ? (
            <div className="grid">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="card-cell"><div className="skeleton" style={{ height: 300 }} /></div>)}
            </div>
          ) : memes.error ? (
            <div className="empty">{t.home.readFailed(memes.error)}</div>
          ) : shown.length ? (
            <div className="grid">
              {shown.map((r) => <TokenCard key={r.m.id} row={r} now={now} />)}
            </div>
          ) : (
            <div className="empty">
              {q ? t.home.noMatch(q) : onlyFavs ? t.home.noFavorites : t.home.noneBacked}
              <Link href="/create" className="btn primary">{t.home.publishFirst}</Link>
            </div>
          )}
        </div>

        <aside className="rail">
          {rows.length > 0 && (
            <section className="indicator" aria-label={t.home.indicatorAria}>
              <div className="rule-head"><h2>{t.home.indicator}</h2></div>
              <span className="kicker">{t.home.indicatorKicker}</span>
              <b className="indicator-total">{usd(backedUsd, 0)}</b>
              <div className="indicator-split">
                {backedBy.map(({ p, units }) => (
                  <span key={p.id} className="num">
                    {compact(units)} <span className="muted">{p.symbol}</span>
                  </span>
                ))}
              </div>
              <p>{t.home.indicatorNote}</p>
            </section>
          )}
          {rows.length > 0 && <Markets rows={rows} now={now} />}
        </aside>
      </div>
    </>
  );
}

/** The markets page in agate: every meme by market cap, like a newspaper's stock table. */
function Markets({ rows, now }: { rows: MarketRow[]; now: number }) {
  const sorted = [...rows].sort(SORTS.mcap);
  const t = useT().home;
  return (
    <section aria-label={t.markets}>
      <div className="rule-head"><h2>{t.markets}</h2></div>
      <table className="agate">
        <thead>
          <tr><th>{t.colMeme}</th><th className="r">{t.colMcap}</th><th className="r">{t.col24h}</th><th className="r">{t.colCurve}</th></tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const day = last24h(r.m, r.trades, r.v.pairUsd, now);
            return (
              <tr key={r.m.id}>
                <td><Link href={`/m/${r.m.id}`}>${r.m.symbol}</Link></td>
                <td className="r">{usd(r.v.mcapUsd, 0)}</td>
                <td className={`r ${day ? (day.change >= 0 ? "buy" : "sell") : "muted"}`}>
                  {day ? `${day.change >= 0 ? "▲" : "▼"} ${fmt(Math.abs(day.change), 1)}%` : "–"}
                </td>
                <td className="r">{r.m.graduated ? t.grad : `${fmt(r.progress, 0)}%`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Market />
    </Suspense>
  );
}
