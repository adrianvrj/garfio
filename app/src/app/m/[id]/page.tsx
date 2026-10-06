"use client";

import { artSeed } from "@/lib/avatar";
import { useParams } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
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
import { Progress } from "@/components/Progress";
import { FavoriteButton } from "@/components/TokenCard";
import { YieldBadge } from "@/components/YieldBadge";

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

  if (meme.error) return <div className="empty" style={{ marginTop: 24 }}>No encontré esta meme: {meme.error}</div>;
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

  const date = new Date(now).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  return (
    <>
    <div className="folio">
      <b>The Hooks Daily</b>
      <span>{date}</span>
      <span>Mercados · {pair.symbol}</span>
      <span>Pág. ${m.symbol}</span>
    </div>
    <div className="coin">
      <div className="coin-main">
        <div className="coin-head">
          <TokenArt seed={artSeed(m)} size={140} />
          <div className="stack" style={{ gap: 8, minWidth: 0 }}>
            <span className="kicker">
              {m.pool ? "Graduada · Soroswap" : `Curva al ${fmt(g, 1)}%`} · Respaldo {pair.symbol}
            </span>
            <h1>${m.symbol}</h1>
            <p className="deck">{m.name}, respaldada por {pair.label}.</p>
            <div className="byline">
              Por <Identity address={m.creator} size={16} />
              {dev.data !== null && <span>· el dev tiene {fmt((fromUnits(dev.data) / SUPPLY) * 100, 2)}% del supply</span>}
              <span>· {ago(Number(m.created_at) * 1000, now)}</span>
              <YieldBadge pair={pair} />
              <button
                className="copy"
                onClick={() => {
                  navigator.clipboard?.writeText(m.id);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}
                title="Copiar dirección del token"
              >
                {copied ? "copiado ✓" : `${m.id.slice(0, 4)}…${m.id.slice(-4)}`}
              </button>
              <a className="copy" href={contractUrl(m.id)} target="_blank" rel="noopener">explorer ↗</a>
              <button
                className="copy"
                onClick={() => {
                  const url = `${location.origin}/m/${m.id}`;
                  const text = `$${m.symbol} en Hooks: su reserva es ${pair.symbol}, ${pair.label}.`;
                  if (navigator.share) return void navigator.share({ title: `$${m.symbol}`, text, url }).catch(() => {});
                  window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener");
                }}
              >
                compartir ↗
              </button>
              <FavoriteButton id={m.id} />
            </div>
          </div>
        </div>

        <div className="coin-stats">
          <div><span className="k">Market cap</span><span className="v">{usd(priceUsd * SUPPLY, 0)}</span></div>
          <div>
            <span className="k">Precio</span>
            <span className="v">
              ${tiny(priceUsd)} {day && <span className={day.change >= 0 ? "buy" : "sell"}>{pct(day.change)}</span>}
            </span>
          </div>
          <div><span className="k">Reserva</span><span className="v">{usd(reserveUsd, 0)}</span></div>
          <div><span className="k">Vol 24 h</span><span className="v">{!trades.data ? "…" : day ? usd(day.volumeUsd, 0) : "–"}</span></div>
        </div>

        <PriceChart ticks={ticks} open={openingPrice(pair.vPair0) * v.pairUsd * SUPPLY} />
      </div>

      {/* On a phone the trade panel sits right under the chart, before the activity tables. */}
      <div className="coin-activity">
        <div className="tabs" role="tablist" ref={tablist}>
          <button role="tab" aria-selected={tab === "trades"} onClick={() => setTab("trades")}>Trades</button>
          <button role="tab" aria-selected={tab === "holders"} onClick={() => setTab("holders")}>
            Holders {holders.data && <span className="muted">({holders.data.length})</span>}
          </button>
        </div>

        {tab === "trades" ? (
          recent.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cuenta</th>
                    <th>Tipo</th>
                    <th className="r">{pair.symbol}</th>
                    <th className="r">${m.symbol}</th>
                    <th className="r hide-sm">Cuándo</th>
                    <th className="r">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <span className="row">
                          <Identity address={t.trader} />
                          {t.trader === m.creator && <span className="badge">dev</span>}
                          {t.trader === w.address && <span className="badge">tú</span>}
                          {t.trader === LAUNCHPAD_ID && <span className="badge">recompra</span>}
                          {t.pool && t.trader !== LAUNCHPAD_ID && <span className="badge">soroswap</span>}
                        </span>
                      </td>
                      <td className={t.isBuy ? "buy" : "sell"}>{t.isBuy ? "▲ compra" : "▼ venta"}</td>
                      <td className="r num">{fmt(fromUnits(t.pairAmt), pair.decimals)}</td>
                      <td className="r num">{compact(fromUnits(t.memeAmt))}</td>
                      <td className="r muted hide-sm">{ago(t.at, now)}</td>
                      <td className="r"><a className="copy" href={txUrl(t.txHash)} target="_blank" rel="noopener">↗</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted" style={{ padding: "16px 0" }}>
              {trades.error ? `No pude leer los trades: ${trades.error}` : trades.data ? "Sin trades en los últimos 7 días. Sé el primero." : "Leyendo trades…"}
            </p>
          )
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>#</th><th>Cuenta</th><th className="r">% del supply</th><th className="r">${m.symbol}</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td className="muted">–</td>
                  <td><span className="muted">{m.pool ? "Pool en Soroswap" : "Curva (sin vender)"}</span></td>
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
            <p className="small muted" style={{ paddingTop: 8 }}>Cuenta las wallets que compraron o vendieron en la curva.</p>
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

        <div className="panel stack">
          <div className="between">
            <h3>Curva de bonding</h3>
            <span className="num">{m.graduated ? "graduada" : `${fmt(g, 1)}%`}</span>
          </div>
          <Progress value={g} label="Curva vendida" />
          <p className="small ink2">
            {m.graduated
              ? "La curva vendió sus 800M y la liquidez pasó a Soroswap."
              : `Faltan ~${fmt(toGrad, pair.decimals)} ${pair.symbol} para graduar. Quedan ${compact(FOR_SALE - fromUnits(m.sold))} de 800M a la venta.`}
          </p>
        </div>

        <div className="panel stack">
          <div className="between">
            <h3>Respaldo: {pair.name}</h3>
            <span className="badge">{pair.symbol}</span>
          </div>
          <div className="between small">
            <span className="muted">{m.pool ? "En el pool" : "En reserva"}</span>
            <span className="num">{fmt(fromUnits(reserve), pair.decimals)} {pair.symbol} · {usd(reserveUsd, 0)}</span>
          </div>
          <div className="between small">
            <span className="muted">1 {pair.symbol}</span>
            <span className="num">{usd(v.pairUsd, 4)}</span>
          </div>
          <p className="small ink2">
            La reserva es {pair.label} y rinde {fmt(prices.yieldPct(pair.symbol) ?? 0, 2)}% anual en {pair.currency}: su
            valor sube aunque nadie opere.
          </p>
          <div className="split two">
            <div>
              <span className="k">Rinde hoy</span>
              <span className="v">{earning ? `${fmt(earning.daily, 2)} ${pair.currency}` : "…"}</span>
            </div>
            <div>
              <span className="k">Ha rendido</span>
              <span className="v">{earning && trades.data ? `${fmt(earning.since, 2)} ${pair.currency}` : "…"}</span>
            </div>
          </div>
          <div className="between small">
            <span className="muted">Vault de recompra</span>
            <span className="num">{fmt(fromUnits(m.vault), pair.decimals)} {pair.symbol} · {usd(fromUnits(m.vault) * v.pairUsd, 2)}</span>
          </div>
          <div className="between small">
            <span className="muted">Quemado por recompras</span>
            <span className="num">{compact(fromUnits(m.burned))} ${m.symbol}</span>
          </div>
        </div>
      </aside>
    </div>
    </>
  );
}
