"use client";

import { artSeed } from "@/lib/avatar";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { fetchMeme, fetchTrades, holdersFromTrades } from "@/lib/chain";
import { contractUrl, pairById, txUrl } from "@/lib/config";
import { gradProgress, gradTarget, pricePair, SUPPLY, FOR_SALE } from "@/lib/curve";
import { usePrices } from "@/lib/prices";
import { ago, compact, fmt, fromUnits, pct, tiny, usd } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useBalances, useValuation } from "@/hooks/useMarket";
import { usePoll } from "@/hooks/usePoll";
import { TokenArt } from "@/components/Art";
import { Chart } from "@/components/Chart";
import { Identity } from "@/components/Identity";
import { TradePanel } from "@/components/TradePanel";

export default function CoinPage() {
  const { id } = useParams<{ id: string }>();
  const w = useWallet();
  const { usdAt } = usePrices();
  const value = useValuation();
  const meme = usePoll(() => fetchMeme(id), 5_000, id);
  const trades = usePoll(() => fetchTrades(id), 10_000, id);
  const balances = useBalances(w.address, [id]);
  const [tab, setTab] = useState<"trades" | "holders">("trades");
  const [copied, setCopied] = useState(false);
  const [now] = useState(() => Date.now());

  const m = meme.data;
  const v = m ? value(m) : null;
  const pair = m ? pairById(m.pair) : undefined;

  // "Since you opened the page" baseline, split into curve vs RWA.
  const [base, setBase] = useState<{ price: number; pairUsd: number } | null>(null);
  if (m && v && !base) setBase({ price: pricePair(m), pairUsd: v.pairUsd });

  // Live points: appended whenever the USD market cap moves (trades or the RWA).
  const [live, setLive] = useState<number[]>([]);
  const mcap = Math.round((v?.mcapUsd ?? 0) * 100) / 100;
  if (mcap && live[live.length - 1] !== mcap) setLive([...live, mcap].slice(-80));

  const points = useMemo(() => {
    if (!pair) return [];
    const hist = (trades.data ?? []).map((t) => (Number(t.vPair) / Number(t.vToken)) * usdAt(pair.symbol, t.at) * SUPPLY);
    return [...hist, ...live];
  }, [trades.data, live, pair, usdAt]);

  const holders = useMemo(() => holdersFromTrades(trades.data ?? []), [trades.data]);

  if (meme.error) return <div className="empty" style={{ marginTop: 24 }}>No encontré esta meme: {meme.error}</div>;
  if (!m || !v || !pair || !base) {
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

  const curveChg = (pricePair(m) / base.price - 1) * 100;
  const pairChg = (v.pairUsd / base.pairUsd - 1) * 100;
  const total = ((1 + curveChg / 100) * (1 + pairChg / 100) - 1) * 100;
  const g = gradProgress(m);
  const toGrad = Math.max(0, gradTarget(pair.vPair0) - fromUnits(m.real_pair));
  const recent = [...(trades.data ?? [])].reverse();

  return (
    <div className="coin">
      <div className="coin-main">
        <div className="coin-head">
          <TokenArt seed={artSeed(m)} size={72} />
          <div className="stack" style={{ gap: 4, minWidth: 0 }}>
            <h1>
              ${m.symbol} <span className="ink2" style={{ fontWeight: 400 }}>{m.name}</span>
            </h1>
            <div className="row small muted" style={{ flexWrap: "wrap" }}>
              <Identity address={m.creator} size={16} />
              <span>· {ago(Number(m.created_at) * 1000, now)}</span>
              <span className="badge">{pair.symbol}</span>
              {pair.yieldPct !== null && <span className="badge yield">+{fmt(pair.yieldPct, 1)}% anual</span>}
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
            </div>
          </div>
        </div>

        <div className="coin-stats">
          <div><span className="k">Market cap</span><span className="v">{usd(v.mcapUsd, 0)}</span></div>
          <div><span className="k">Precio</span><span className="v">${tiny(v.priceUsd)}</span></div>
          <div><span className="k">Reserva</span><span className="v">{usd(v.reserveUsd, 0)}</span></div>
          <div><span className="k">Trades 24 h</span><span className="v">{trades.data ? trades.data.length : "…"}</span></div>
        </div>

        <Chart points={points} />

        <div className="tabs" role="tablist" style={{ marginTop: 20 }}>
          <button role="tab" aria-selected={tab === "trades"} onClick={() => setTab("trades")}>Trades</button>
          <button role="tab" aria-selected={tab === "holders"} onClick={() => setTab("holders")}>
            Holders {trades.data && <span className="muted">({holders.length})</span>}
          </button>
        </div>

        {tab === "trades" ? (
          recent.length ? (
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
                    <td><Identity address={t.trader} /></td>
                    <td className={t.isBuy ? "buy" : "sell"}>{t.isBuy ? "▲ compra" : "▼ venta"}</td>
                    <td className="r num">{fmt(fromUnits(t.pairAmt), pair.decimals)}</td>
                    <td className="r num">{compact(fromUnits(t.memeAmt))}</td>
                    <td className="r muted hide-sm">{ago(t.at, now)}</td>
                    <td className="r"><a className="copy" href={txUrl(t.txHash)} target="_blank" rel="noopener">↗</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted" style={{ padding: "16px 0" }}>
              {trades.error ? `No pude leer los trades: ${trades.error}` : trades.data ? "Sin trades en las últimas 24 h. Sé el primero." : "Leyendo trades…"}
            </p>
          )
        ) : (
          <table className="table">
            <thead>
              <tr><th>#</th><th>Cuenta</th><th className="r">% del supply</th><th className="r">${m.symbol}</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className="muted">–</td>
                <td><span className="muted">Curva (sin vender)</span></td>
                <td className="r num">{fmt(((FOR_SALE - fromUnits(m.sold)) / SUPPLY) * 100, 1)}%</td>
                <td className="r num">{compact(FOR_SALE - fromUnits(m.sold))}</td>
              </tr>
              {holders.map((h, i) => (
                <tr key={h.address}>
                  <td className="muted">{i + 1}</td>
                  <td><Identity address={h.address} /></td>
                  <td className="r num">{fmt((fromUnits(h.amount) / SUPPLY) * 100, 2)}%</td>
                  <td className="r num">{compact(fromUnits(h.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <aside className="coin-side">
        <TradePanel
          meme={m}
          pair={pair}
          memeBalance={balances.data?.[m.id] ?? 0n}
          pairBalance={balances.data ? (balances.data[pair.id] ?? 0n) : null}
          onDone={() => {
            meme.refresh();
            trades.refresh();
            balances.refresh();
          }}
        />

        <div className="panel stack">
          <div className="between">
            <h3>Curva de bonding</h3>
            <span className="num">{m.graduated ? "graduada" : `${fmt(g, 1)}%`}</span>
          </div>
          <div className="progress"><i style={{ width: `${g}%` }} /></div>
          <p className="small ink2">
            {m.graduated
              ? "La curva vendió sus 800M. Esta meme ya se graduó."
              : `Faltan ~${fmt(toGrad, pair.decimals)} ${pair.symbol} para graduar. Quedan ${compact(FOR_SALE - fromUnits(m.sold))} de 800M a la venta.`}
          </p>
        </div>

        <div className="panel stack">
          <div className="between">
            <h3>Respaldo: {pair.name}</h3>
            <span className="badge">{pair.symbol}</span>
          </div>
          <div className="between small">
            <span className="muted">En reserva</span>
            <span className="num">{fmt(fromUnits(m.real_pair), pair.decimals)} {pair.symbol} · {usd(v.reserveUsd, 0)}</span>
          </div>
          <div className="between small">
            <span className="muted">1 {pair.symbol}</span>
            <span className="num">{usd(v.pairUsd, pair.symbol === "tNVDA" ? 2 : 4)}</span>
          </div>
          <p className="small ink2">
            {pair.yieldPct !== null
              ? `La reserva rinde ~${fmt(pair.yieldPct, 1)}% anual: el precio en dólares sube aunque nadie opere.`
              : "La reserva sigue a la acción: si NVDA sube, la meme sube con ella."}
          </p>
          <div className="split">
            <div><span className="k">Desde que abriste</span><span className={`v ${total >= 0 ? "buy" : "sell"}`}>{pct(total)}</span></div>
            <div><span className="k">Por la curva</span><span className="v">{pct(curveChg)}</span></div>
            <div><span className="k">Por el RWA</span><span className="v">{pct(pairChg)}</span></div>
          </div>
        </div>
      </aside>
    </div>
  );
}
