"use client";

import { artSeed } from "@/lib/avatar";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useMarket, type MarketRow } from "@/hooks/useMarket";
import { PAIRS } from "@/lib/config";
import { compact, fmt, fromUnits, usd } from "@/lib/units";
import { TokenArt } from "@/components/Art";
import { Identity } from "@/components/Identity";
import { PairBadge, TokenCard } from "@/components/TokenCard";

const SORTS = {
  activity: { label: "Actividad", fn: (a: MarketRow, b: MarketRow) => b.lastAt - a.lastAt },
  new: { label: "Nuevas", fn: (a: MarketRow, b: MarketRow) => Number(b.m.created_at - a.m.created_at) },
  mcap: { label: "Market cap", fn: (a: MarketRow, b: MarketRow) => b.v.mcapUsd - a.v.mcapUsd },
  grad: { label: "Por graduar", fn: (a: MarketRow, b: MarketRow) => b.progress - a.progress },
} as const;
type SortKey = keyof typeof SORTS;

function King({ row }: { row: MarketRow }) {
  const { m, v, progress } = row;
  return (
    <Link href={`/m/${m.id}`} className="king">
      <TokenArt seed={artSeed(m)} size={120} />
      <div className="stack" style={{ gap: 6, minWidth: 0 }}>
        <span className="section-title">Rey de la colina · la más cerca de graduar</span>
        <h2>
          ${m.symbol} <span className="ink2" style={{ fontWeight: 400 }}>{m.name}</span>
        </h2>
        <div className="row small muted">
          creada por <Identity address={m.creator} size={16} />
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <PairBadge row={row} />
        </div>
      </div>
      <div className="stats">
        <div className="between">
          <span className="muted">Market cap</span>
          <b className="num">{usd(v.mcapUsd, 0)}</b>
        </div>
        <div className="between">
          <span className="muted">Reserva en {v.pair?.symbol}</span>
          <span className="num">{compact(fromUnits(m.real_pair))} · {usd(v.reserveUsd, 0)}</span>
        </div>
        <div className="progress"><i style={{ width: `${progress}%` }} /></div>
        <span className="small muted">{fmt(progress, 1)}% de la curva vendida</span>
      </div>
    </Link>
  );
}

function Market() {
  const q = (useSearchParams().get("q") ?? "").toLowerCase();
  const { rows, memes } = useMarket();
  const [sort, setSort] = useState<SortKey>("activity");
  const [pair, setPair] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const king = [...rows].filter((r) => !r.m.graduated).sort(SORTS.grad.fn)[0];
  const shown = rows
    .filter((r) => !pair || r.m.pair === pair)
    .filter((r) => !q || r.m.symbol.toLowerCase().includes(q) || r.m.name.toLowerCase().includes(q))
    .sort(SORTS[sort].fn);
  const locked = rows.reduce((s, r) => s + r.v.reserveUsd, 0);

  return (
    <>
      {king && !q && <King row={king} />}

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Ordenar">
          {(Object.keys(SORTS) as SortKey[]).map((k) => (
            <button key={k} className="chip" aria-pressed={sort === k} onClick={() => setSort(k)}>
              {SORTS[k].label}
            </button>
          ))}
        </div>
        <div className="row">
          <div className="chips" role="group" aria-label="Filtrar por respaldo">
            <button className="chip" aria-pressed={pair === null} onClick={() => setPair(null)}>Todos</button>
            {PAIRS.map((p) => (
              <button key={p.id} className="chip" aria-pressed={pair === p.id} onClick={() => setPair(p.id)}>
                {p.symbol}
              </button>
            ))}
          </div>
          <span className="muted small hide-sm">{usd(locked, 0)} en RWAs</span>
        </div>
      </div>

      {q && <p className="muted" style={{ marginBottom: 12 }}>Resultados para “{q}”</p>}

      {memes.loading ? (
        <div className="grid">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
      ) : memes.error ? (
        <div className="empty">No pude leer el contrato: {memes.error}</div>
      ) : shown.length ? (
        <div className="grid">
          {shown.map((r) => <TokenCard key={r.m.id} row={r} now={now} />)}
        </div>
      ) : (
        <div className="empty">
          {q ? `Ninguna meme coincide con “${q}”.` : "Todavía no hay memes con este respaldo."}
          <Link href="/create" className="btn primary">Crea la primera</Link>
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Market />
    </Suspense>
  );
}
