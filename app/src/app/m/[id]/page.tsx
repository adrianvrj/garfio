"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { fetchMeme, fetchTrades } from "@/lib/chain";
import { contractUrl, pairById } from "@/lib/config";
import { gradProgress, pricePair, SUPPLY, FOR_SALE } from "@/lib/curve";
import { usePrices } from "@/lib/prices";
import { compact, fmt, fromUnits, pct, short, tiny, usd } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useBalances, useValuation } from "@/hooks/useMarket";
import { usePoll } from "@/hooks/usePoll";
import { Chart } from "@/components/Chart";
import { TradePanel } from "@/components/TradePanel";
import { WalletPanel } from "@/components/WalletPanel";

export default function MemePage() {
  const { id } = useParams<{ id: string }>();
  const w = useWallet();
  const { usdAt } = usePrices();
  const value = useValuation();
  const meme = usePoll(() => fetchMeme(id), 5_000, id);
  const trades = usePoll(() => fetchTrades(id), 15_000, id);
  const balances = useBalances(w.address, [id]);

  const m = meme.data;
  const v = m ? value(m) : null;
  const pair = m ? pairById(m.pair) : undefined;

  // "Since you opened the page" baseline, split into curve vs RWA, like the simulator.
  const [base, setBase] = useState<{ price: number; pairUsd: number } | null>(null);
  if (m && v && !base) setBase({ price: pricePair(m), pairUsd: v.pairUsd });

  // Live points: appended whenever the USD market cap moves (trades or the RWA).
  const [live, setLive] = useState<number[]>([]);
  const mcap = Math.round((v?.mcapUsd ?? 0) * 100) / 100;
  if (mcap && live[live.length - 1] !== mcap) setLive([...live, mcap].slice(-80));

  const points = useMemo(() => {
    if (!pair) return [];
    const hist = (trades.data ?? []).map(
      (t) => (Number(t.vPair) / Number(t.vToken)) * usdAt(pair.symbol, t.at) * SUPPLY,
    );
    return [...hist, ...live];
  }, [trades.data, live, pair, usdAt]);

  if (meme.error) return <div className="empty err">No encontré esta memecoin: {meme.error}</div>;
  if (!m || !v || !pair || !base) return <div className="empty">Leyendo la curva…</div>;

  const curveChg = (pricePair(m) / base.price - 1) * 100;
  const pairChg = (v.pairUsd / base.pairUsd - 1) * 100;
  const total = ((1 + curveChg / 100) * (1 + pairChg / 100) - 1) * 100;
  const g = gradProgress(m);
  const holdersSeen = new Set((trades.data ?? []).filter((t) => t.isBuy).map((t) => t.trader)).size;

  return (
    <div className="sim">
      <div className="detail">
        <div className="head">
          <div>
            <div className="eyebrow">Par: {pair.symbol} · {pair.label}</div>
            <div className="name">${m.symbol}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {m.name} · creada por {short(m.creator)} ·{" "}
              <a href={contractUrl(m.id)} target="_blank" rel="noopener">contrato ↗</a>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="px">{usd(v.mcapUsd, 0)}</div>
            <div className="num muted" style={{ fontSize: 12 }}>mcap · {tiny(pricePair(m))} {pair.symbol} por token</div>
          </div>
        </div>
        <Chart points={points} />
        <div className="kv">
          <div><span className="k">Precio USD</span><span className="v">${tiny(v.priceUsd)}</span></div>
          <div><span className="k">Reserva</span><span className="v">{fmt(fromUnits(m.real_pair), pair.decimals)} {pair.symbol}</span></div>
          <div><span className="k">Vendido</span><span className="v">{compact(fromUnits(m.sold))} / {compact(FOR_SALE)}</span></div>
          <div><span className="k">Compradores</span><span className="v">{trades.data ? holdersSeen : "…"}</span></div>
        </div>
        <div className="bar">
          <div className="lbl"><span>Progreso a graduación</span><span className="num">{fmt(g, 1)}%{m.graduated ? " · graduada" : ""}</span></div>
          <div className="track"><div className="fill" style={{ width: `${g}%` }} /></div>
        </div>
        <div className="split">
          <div><span className="k">Cambio en USD desde que abriste</span><span className="v">{pct(total)}</span></div>
          <div><span className="k">Por compras y ventas (curva)</span><span className="v">{pct(curveChg)}</span></div>
          <div><span className="k">Por el RWA ({pair.symbol})</span><span className="v">{pct(pairChg)}</span></div>
        </div>
        {trades.error && <div className="err">No pude leer los eventos: {trades.error}</div>}
        <Link href="/" className="eyebrow">← Mercado</Link>
      </div>

      <div>
        <TradePanel
          meme={m}
          pair={pair}
          memeBalance={balances.data?.[m.id] ?? 0n}
          onDone={() => {
            meme.refresh();
            trades.refresh();
            balances.refresh();
          }}
        />
        <div style={{ padding: "0 16px 16px" }}>
          <WalletPanel
            balances={balances.data}
            meme={m}
            memeUsd={v.priceUsd}
            onDone={() => {
              meme.refresh();
              balances.refresh();
            }}
          />
        </div>
      </div>
    </div>
  );
}
