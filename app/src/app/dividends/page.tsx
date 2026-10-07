"use client";

import Link from "next/link";
import { useState } from "react";
import { useMemes } from "@/hooks/useMarket";
import { useDividends, useDividendTx, type Dividend } from "@/hooks/useDividends";
import { artSeed } from "@/lib/avatar";
import { pairById } from "@/lib/config";
import { usePrices } from "@/lib/prices";
import { compact, fmt, fromUnits, usd } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { TokenArt } from "@/components/Art";
import { TxLog } from "@/components/TxLink";

/** Every meme the wallet holds, what it can claim from each now, and what is still to distribute. */
export default function Dividends() {
  const w = useWallet();
  const memes = useMemes();
  const rows = useDividends(w.address, memes.data ?? []);
  const { tx, distribute, claim } = useDividendTx();
  const { usd: bondUsd } = usePrices();
  const [batch, setBatch] = useState<string | null>(null);

  const toUsd = (amount: bigint, pair: string) => {
    const p = pairById(pair);
    return p ? fromUnits(amount) * bondUsd(p.symbol) : 0;
  };
  const list = rows.data ?? [];
  const owed = list.filter((r) => r.owed > 0n);
  const owedUsd = owed.reduce((s, r) => s + toUsd(r.owed, r.m.pair), 0);
  const pendingUsd = list.reduce((s, r) => s + toUsd(r.pending, r.m.pair), 0);
  // Biggest claim first: the rows are the to-do list.
  const sorted = [...list].sort((a, b) => toUsd(b.owed, b.m.pair) - toUsd(a.owed, a.m.pair) || toUsd(b.pending, b.m.pair) - toUsd(a.pending, a.m.pair));

  function refresh() {
    memes.refresh();
    rows.refresh();
  }

  async function act(send: Promise<string | null>) {
    if (await send) refresh();
  }

  /** One claim per meme: Soroban runs a single contract call per transaction. Stops at the first failure. */
  async function claimAll() {
    for (const [i, r] of owed.entries()) {
      setBatch(`Cobrando ${i + 1} de ${owed.length}…`);
      if (!(await claim(r.m, r.owed))) break;
    }
    setBatch(null);
    refresh();
  }

  const headline = !rows.data
    ? null
    : owed.length
      ? `${usd(owedUsd)} por cobrar en ${owed.length === 1 ? `$${owed[0].m.symbol}` : `${owed.length} memes`}`
      : pendingUsd > 0
        ? `${usd(pendingUsd)} tuyos esperan reparto`
        : list.length
          ? list.length === 1 ? "Tu meme aún no reparte" : `Tus ${list.length} memes aún no reparten`
          : null;

  return (
    <div className="dividends">
      <div className="stack" style={{ gap: 20 }}>
        <header className="stack" style={{ gap: 8 }}>
          <h1>Tus dividendos</h1>
          {headline && <p className="deck">{headline}.</p>}
        </header>

        {!w.address ? (
          <Empty>
            <p>Entra con tu wallet, arriba a la derecha, para ver lo que te toca de cada meme que tienes.</p>
          </Empty>
        ) : !rows.data ? (
          <div className="div-list" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="div-row">
                <span className="skeleton" style={{ width: 44, height: 44 }} />
                <span className="skeleton" style={{ height: 14, width: "60%" }} />
                <span className="skeleton" style={{ height: 14, width: 96 }} />
              </div>
            ))}
          </div>
        ) : list.length ? (
          <div className="div-list">
            {sorted.map((r) => (
              <Row key={r.m.id} r={r} usdOf={toUsd} busy={tx.busy || !!batch} onClaim={() => act(claim(r.m, r.owed))} onDistribute={() => act(distribute(r.m))} />
            ))}
          </div>
        ) : (
          <Empty>
            <p>
              No tienes memes todavía. Quien tiene un meme se lleva parte de sus fees, en el bono que lo respalda y según
              cuánto tenga.
            </p>
            <Link href="/" className="btn primary">Ver memes</Link>
          </Empty>
        )}
        <div className="err" role="status">{tx.error}</div>
        <TxLog log={tx.log} />
      </div>

      <aside className="stack" style={{ gap: 24 }}>
        {w.address && rows.data && list.length > 0 && (
          <section className="indicator" aria-label="Por cobrar">
            <div className="rule-head"><h2>Por cobrar</h2></div>
            <b className="indicator-total">{usd(owedUsd)}</b>
            {pendingUsd > 0 && (
              <p>
                Y {usd(pendingUsd)} más cuando alguien reparta.
              </p>
            )}
            {owed.length > 1 && (
              <button className="btn primary block lg" onClick={claimAll} disabled={tx.busy || !!batch} style={{ marginTop: 8 }}>
                {batch ?? `Cobrar los ${owed.length}`}
              </button>
            )}
          </section>
        )}
        <section className="stack" style={{ gap: 10 }}>
          <div className="rule-head"><h3>Cómo funciona</h3></div>
          <div className="fine-print">
            <span>Cada compra y venta en la curva paga 1%; un cuarto va al vault del meme.</span>
            <span>La mitad de lo que entra al vault es de quienes tienen el meme, según cuánto tengan. La otra mitad recompra y quema.</span>
            <span>Repartir pasa lo acumulado a &ldquo;Te toca&rdquo;. Cualquiera puede hacerlo.</span>
            <span>Cobrar te manda el bono a tu wallet, y sigue rindiendo ahí.</span>
          </div>
        </section>
      </aside>
    </div>
  );
}

function Row({
  r,
  usdOf,
  busy,
  onClaim,
  onDistribute,
}: {
  r: Dividend;
  usdOf: (amount: bigint, pair: string) => number;
  busy: boolean;
  onClaim: () => void;
  onDistribute: () => void;
}) {
  const { m, bal, owed, pending } = r;
  const p = pairById(m.pair);
  const bond = (v: bigint) => `${fmt(fromUnits(v), p?.decimals ?? 2)} ${p?.symbol ?? ""}`;
  return (
    <div className="div-row" data-owed={owed > 0n || undefined}>
      <Link href={`/m/${m.id}`} aria-label={`$${m.symbol}`}>
        <TokenArt seed={artSeed(m)} size={44} />
      </Link>
      <div className="div-name">
        <Link href={`/m/${m.id}`}><b>${m.symbol}</b></Link>
        <span className="muted small num">
          tienes {compact(fromUnits(bal))} · paga en {p?.symbol}
        </span>
      </div>
      <div className="div-amount">
        {owed > 0n ? (
          <>
            <b className="num">{bond(owed)}</b>
            <span className="muted small num">{usd(usdOf(owed, m.pair))}</span>
          </>
        ) : pending > 0n ? (
          <>
            <b className="num muted">{bond(pending)}</b>
            <span className="muted small">al repartir</span>
          </>
        ) : (
          <span className="muted small">Nada por ahora</span>
        )}
        {owed > 0n && pending > 0n && <span className="muted small num">+{bond(pending)} al repartir</span>}
      </div>
      <div className="div-action">
        {owed > 0n ? (
          <button className="btn primary" onClick={onClaim} disabled={busy}>Cobrar</button>
        ) : pending > 0n ? (
          <button className="btn" onClick={onDistribute} disabled={busy}>Repartir</button>
        ) : null}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="div-empty">{children}</div>;
}
