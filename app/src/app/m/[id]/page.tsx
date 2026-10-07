"use client";

import { artSeed } from "@/lib/avatar";
import { useParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { balanceOf, fetchHolders, fetchMeme, fetchMemeTrades, fetchPool } from "@/lib/chain";
import { contractUrl, LAUNCHPAD_ID, pairById, txUrl } from "@/lib/config";
import { gradProgress, gradTarget, openingPrice, SUPPLY, FOR_SALE } from "@/lib/curve";
import { usePrices } from "@/lib/prices";
import { accrued, dailyYield } from "@/lib/yield";
import { ago, compact, fmt, fromUnits, pct, tiny, usd } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { last24h, useBalances, useValuation } from "@/hooks/useMarket";
import { usePoll } from "@/hooks/usePoll";
import { TokenArt } from "@/components/Art";
import { PriceChart } from "@/components/PriceChart";
import { Identity } from "@/components/Identity";
import { TradePanel } from "@/components/TradePanel";
import { DividendPanel } from "@/components/DividendPanel";
import { Progress } from "@/components/Progress";
import { FavoriteButton } from "@/components/TokenCard";
import { YieldBadge } from "@/components/YieldBadge";
import { useLocaleTag, useT } from "@/i18n/client";

/**
 * Phones stack the trade coupon under the chart: this bar keeps the trade one tap away while the
 * coupon is off screen, and steps aside once it scrolls into view.
 */
function TradeDock({ symbol, price, change }: { symbol: string; price: string; change?: number }) {
  const dock = useRef<HTMLDivElement>(null);
  const t = useT();
  useEffect(() => {
    const coupon = document.getElementById("trade");
    if (!coupon || !dock.current) return;
    const el = dock.current;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-hidden", e.isIntersecting));
    io.observe(coupon);
    return () => io.disconnect();
  }, []);
  return (
    <div className="trade-dock" ref={dock} data-hidden>
      <span className="trade-dock-quote">
        <b>${symbol}</b>
        <span className="num">
          ${price} {change !== undefined && <span className={change >= 0 ? "buy" : "sell"}>{pct(change)}</span>}
        </span>
      </span>
      <button
        className="btn primary"
        onClick={() => {
          const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
          document.getElementById("trade")?.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
        }}
      >
        {t.coin.dockTrade}
      </button>
    </div>
  );
}

export default function CoinPage() {
  const { id } = useParams<{ id: string }>();
  const w = useWallet();
  const prices = usePrices();
  const value = useValuation();
  const meme = usePoll(() => fetchMeme(id), 5_000, id);
  const poolId = meme.data?.pool ?? null;
  const trades = usePoll(() => fetchMemeTrades(id, poolId), 10_000, `${id}|${poolId}`);
  const balances = useBalances(w.address, [id]);
  const pool = usePoll(meme.data?.pool ? () => fetchPool(meme.data!) : null, 10_000, meme.data?.pool ?? "");
  const creator = meme.data?.creator;
  const dev = usePoll(creator ? () => balanceOf(id, creator) : null, 15_000, `${id}|${creator}`);
  const [tab, setTab] = useState<"trades" | "holders">("trades");
  const [copied, setCopied] = useState(false);
  const [now] = useState(() => Date.now());
  const t = useT();
  const tag = useLocaleTag();

  const m = meme.data;
  const v = m ? value(m) : null;
  const pair = m ? pairById(m.pair) : undefined;

  // Past trades are valued at today's pair price, so the candles show the curve alone.
  const pairUsd = v?.pairUsd ?? 0;
  const ticks = (trades.data ?? []).map((t) => ({
    at: t.at,
    mcap: (Number(t.vPair) / Number(t.vToken)) * pairUsd * SUPPLY,
    volume: fromUnits(t.pairAmt) * pairUsd,
  }));

  const traders = [...new Set((trades.data ?? []).map((t) => t.trader))];
  const holders = usePoll(() => fetchHolders(id, traders), 15_000, `${id}|${traders.join(",")}`);

  // Opening a coin starts at its headline. The page first renders a short skeleton, so the browser
  // clamps the scroll carried over from the list and Next sees no reason to move; then the page grows
  // and leaves the reader mid-article.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Park the underline under the selected tab; CSS slides it there.
  const tablist = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = tablist.current;
    const sel = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !sel) return;
    list.style.setProperty("--ink-x", `${sel.offsetLeft}px`);
    list.style.setProperty("--ink-w", String(sel.offsetWidth));
    list.dataset.ink = "";
  });

  if (meme.error) return <div className="empty" style={{ marginTop: 24 }}>{t.coin.notFound(meme.error)}</div>;
  if (!m || !v || !pair) {
    return (
      <div className="coin">
        <div className="stack">
          <div className="skeleton" style={{ height: 72 }} />
          <div className="skeleton" style={{ height: 300 }} />
        </div>
        <div className="skeleton" style={{ height: 420 }} />
      </div>
    );
  }

  const g = gradProgress(m);
  const toGrad = Math.max(0, gradTarget(pair.vPair0) - fromUnits(m.real_pair));
  // Once migrated, the price and the reserve live in the Soroswap pool.
  const reserve = pool.data ? pool.data.pairAmt : m.real_pair;
  const priceUsd = pool.data ? (Number(pool.data.pairAmt) / Number(pool.data.memeAmt)) * v.pairUsd : v.priceUsd;
  const reserveUsd = fromUnits(reserve) * v.pairUsd;
  const recent = [...(trades.data ?? [])].reverse();
  const unsold = m.pool ? SUPPLY - FOR_SALE : FOR_SALE - fromUnits(m.sold);
  const day = last24h(m, trades.data ?? [], v.pairUsd, now);
  const bond = prices.bond(pair.symbol);
  const earning = bond && {
    daily: dailyYield(reserve, bond.nav, bond.rateBps),
    since: accrued(trades.data ?? [], reserve, now, bond.nav, bond.rateBps),
  };

  const label = t.pairLabel[pair.symbol] ?? t.pairLabel.other;
  const date = new Date(now).toLocaleDateString(tag, { weekday: "long", day: "numeric", month: "long" });
  return (
    <>
    <div className="folio">
      <b>The Hooks Daily</b>
      <span>{date}</span>
      <span>{t.coin.markets(pair.symbol)}</span>
      <span>{t.home.page(m.symbol)}</span>
    </div>
    <div className="coin">
      <div className="coin-main">
        <div className="coin-head">
          <TokenArt seed={artSeed(m)} size={140} />
          <div className="stack" style={{ gap: 8, minWidth: 0 }}>
            <span className="kicker">
              {t.coin.kicker({ pool: Boolean(m.pool), progress: fmt(g, 1), sym: pair.symbol })}
            </span>
            <h1>${m.symbol}</h1>
            <p className="deck">{t.coin.deck(m.name, label)}</p>
            <div className="byline">
              {t.common.by} <Identity address={m.creator} size={16} />
              {dev.data !== null && <span>{t.coin.devHolds(fmt((fromUnits(dev.data) / SUPPLY) * 100, 2))}</span>}
              <span>· {ago(t, Number(m.created_at) * 1000, now)}</span>
              <YieldBadge pair={pair} />
              <button
                className="copy"
                onClick={() => {
                  navigator.clipboard?.writeText(m.id);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}
                title={t.coin.copyTitle}
              >
                {copied ? t.coin.copied : `${m.id.slice(0, 4)}…${m.id.slice(-4)}`}
              </button>
              <a className="copy" href={contractUrl(m.id)} target="_blank" rel="noopener">{t.coin.explorer}</a>
              <button
                className="copy"
                onClick={() => {
                  const url = `${location.origin}/m/${m.id}`;
                  const text = t.coin.shareText(m.symbol, pair.symbol, label);
                  if (navigator.share) return void navigator.share({ title: `$${m.symbol}`, text, url }).catch(() => {});
                  window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener");
                }}
              >
                {t.coin.share}
              </button>
              <FavoriteButton id={m.id} />
            </div>
          </div>
        </div>

        <div className="coin-stats">
          <div><span className="k">{t.common.marketCap}</span><span className="v">{usd(priceUsd * SUPPLY, 0)}</span></div>
          <div>
            <span className="k">{t.coin.price}</span>
            <span className="v">
              ${tiny(priceUsd)} {day && <span className={day.change >= 0 ? "buy" : "sell"}>{pct(day.change)}</span>}
            </span>
          </div>
          <div><span className="k">{t.coin.reserve}</span><span className="v">{usd(reserveUsd, 0)}</span></div>
          <div><span className="k">{t.coin.volume}</span><span className="v">{!trades.data ? "…" : day ? usd(day.volumeUsd, 0) : "–"}</span></div>
        </div>

        <PriceChart ticks={ticks} open={openingPrice(pair.vPair0) * v.pairUsd * SUPPLY} />
      </div>

      {/* On a phone the trade panel sits right under the chart, before the activity tables. */}
      <div className="coin-activity">
        <div className="tabs" role="tablist" ref={tablist}>
          <button role="tab" aria-selected={tab === "trades"} onClick={() => setTab("trades")}>{t.coin.trades}</button>
          <button role="tab" aria-selected={tab === "holders"} onClick={() => setTab("holders")}>
            {t.coin.holders} {holders.data && <span className="muted">({holders.data.length})</span>}
          </button>
        </div>

        {tab === "trades" ? (
          recent.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t.coin.colAccount}</th>
                    <th>{t.coin.colType}</th>
                    <th className="r">{pair.symbol}</th>
                    <th className="r">${m.symbol}</th>
                    <th className="r hide-sm">{t.coin.colWhen}</th>
                    <th className="r">{t.coin.colTx}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((trade) => (
                    <tr key={trade.id}>
                      <td>
                        <span className="row">
                          <Identity address={trade.trader} />
                          {trade.trader === m.creator && <span className="badge">dev</span>}
                          {trade.trader === w.address && <span className="badge">{t.common.you}</span>}
                          {trade.trader === LAUNCHPAD_ID && <span className="badge">{t.coin.badgeBuyback}</span>}
                          {trade.pool && trade.trader !== LAUNCHPAD_ID && <span className="badge">soroswap</span>}
                        </span>
                      </td>
                      <td className={trade.isBuy ? "buy" : "sell"}>{trade.isBuy ? t.coin.buy : t.coin.sell}</td>
                      <td className="r num">{fmt(fromUnits(trade.pairAmt), pair.decimals)}</td>
                      <td className="r num">{compact(fromUnits(trade.memeAmt))}</td>
                      <td className="r muted hide-sm">{ago(t, trade.at, now)}</td>
                      <td className="r"><a className="copy" href={txUrl(trade.txHash)} target="_blank" rel="noopener">↗</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted" style={{ padding: "16px 0" }}>
              {trades.error ? t.coin.tradesFailed(trades.error) : trades.data ? t.coin.noTrades : t.coin.loadingTrades}
            </p>
          )
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>#</th><th>{t.coin.colAccount}</th><th className="r">{t.coin.colShare}</th><th className="r">${m.symbol}</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td className="muted">–</td>
                  <td><span className="muted">{m.pool ? t.coin.pool : t.coin.curveUnsold}</span></td>
                  <td className="r num">{fmt((unsold / SUPPLY) * 100, 1)}%</td>
                  <td className="r num">{compact(unsold)}</td>
                </tr>
                {(holders.data ?? []).map((h, i) => (
                  <tr key={h.address}>
                    <td className="muted">{i + 1}</td>
                    <td><Identity address={h.address} /></td>
                    <td className="r num">{fmt((fromUnits(h.amount) / SUPPLY) * 100, 2)}%</td>
                    <td className="r num">{compact(fromUnits(h.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted" style={{ paddingTop: 8 }}>{t.coin.holdersNote}</p>
          </div>
        )}
      </div>

      <aside className="coin-side">
        <TradePanel
          meme={m}
          pair={pair}
          memeBalance={balances.data?.[m.id] ?? 0n}
          pairBalance={balances.data ? (balances.data[pair.id] ?? 0n) : null}
          pool={pool.data ?? null}
          onDone={() => {
            meme.refresh();
            trades.refresh();
            pool.refresh();
            balances.refresh();
          }}
        />

        <DividendPanel
          meme={m}
          pair={pair}
          onDone={() => {
            meme.refresh();
            balances.refresh();
          }}
        />

        <div className="panel stack">
          <div className="between">
            <h3>{t.coin.bonding}</h3>
            <span className="num">{m.graduated ? t.coin.graduated : `${fmt(g, 1)}%`}</span>
          </div>
          <Progress value={g} label={t.coin.curveSold} />
          <p className="small ink2">
            {m.graduated
              ? t.coin.soldOut
              : t.coin.toGraduate(fmt(toGrad, pair.decimals), pair.symbol, compact(FOR_SALE - fromUnits(m.sold)))}
          </p>
        </div>

        <div className="panel stack">
          <div className="between">
            <h3>{t.coin.backing(pair.name)}</h3>
            <span className="badge">{pair.symbol}</span>
          </div>
          <div className="between small">
            <span className="muted">{m.pool ? t.coin.inPool : t.coin.inReserve}</span>
            <span className="num">{fmt(fromUnits(reserve), pair.decimals)} {pair.symbol} · {usd(reserveUsd, 0)}</span>
          </div>
          <div className="between small">
            <span className="muted">1 {pair.symbol}</span>
            <span className="num">{usd(v.pairUsd, 4)}</span>
          </div>
          <p className="small ink2">
            {t.coin.reserveNote(label, fmt(prices.yieldPct(pair.symbol) ?? 0, 2), pair.currency)}
          </p>
          <div className="split two">
            <div>
              <span className="k">{t.coin.yieldsToday}</span>
              <span className="v">{earning ? `${fmt(earning.daily, 2)} ${pair.currency}` : "…"}</span>
            </div>
            <div>
              <span className="k">{t.coin.yielded}</span>
              <span className="v">{earning && trades.data ? `${fmt(earning.since, 2)} ${pair.currency}` : "…"}</span>
            </div>
          </div>
          <div className="between small">
            <span className="muted">{t.coin.vault}</span>
            <span className="num">{fmt(fromUnits(m.vault), pair.decimals)} {pair.symbol} · {usd(fromUnits(m.vault) * v.pairUsd, 2)}</span>
          </div>
          <div className="between small">
            <span className="muted">{t.coin.paidHolders}</span>
            <span className="num">{fmt(fromUnits(m.dividends), pair.decimals)} {pair.symbol} · {usd(fromUnits(m.dividends) * v.pairUsd, 2)}</span>
          </div>
          <div className="between small">
            <span className="muted">{t.coin.burned}</span>
            <span className="num">{compact(fromUnits(m.burned))} ${m.symbol}</span>
          </div>
        </div>
      </aside>
    </div>
    {!m.graduated || m.pool ? <TradeDock symbol={m.symbol} price={tiny(priceUsd)} change={day?.change} /> : null}
    </>
  );
}
