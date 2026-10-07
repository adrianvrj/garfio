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
import { useT } from "@/i18n/client";

/** Every meme the wallet holds and what it can claim from each now. */
export default function Dividends() {
  const w = useWallet();
  const t = useT();
  const td = t.dividends;
  const memes = useMemes();
  const rows = useDividends(w.address, memes.data ?? []);
  const { tx, claim } = useDividendTx();
  const { usd: bondUsd } = usePrices();
  const [batch, setBatch] = useState<string | null>(null);

  const toUsd = (amount: bigint, pair: string) => {
    const p = pairById(pair);
    return p ? fromUnits(amount) * bondUsd(p.symbol) : 0;
  };
  const list = rows.data ?? [];
  const owed = list.filter((r) => r.owed > 0n);
  const owedUsd = owed.reduce((s, r) => s + toUsd(r.owed, r.m.pair), 0);
  // Biggest claim first: the rows are the to-do list.
  const sorted = [...list].sort((a, b) => toUsd(b.owed, b.m.pair) - toUsd(a.owed, a.m.pair));

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
      setBatch(td.claiming(i + 1, owed.length));
      if (!(await claim(r.m, r.owed))) break;
    }
    setBatch(null);
    refresh();
  }

  const headline = !rows.data
    ? null
    : owed.length
      ? td.owed(usd(owedUsd), owed.length === 1 ? `$${owed[0].m.symbol}` : td.memes(owed.length))
      : list.length
        ? td.everyTrade(list.length === 1 ? `$${list[0].m.symbol}` : td.yourMemes(list.length))
        : null;

  return (
    <div className="dividends">
      <div className="stack" style={{ gap: 20 }}>
        <header className="stack" style={{ gap: 8 }}>
          <h1>{td.title}</h1>
          {headline && <p className="deck">{headline}.</p>}
        </header>

        {!w.address ? (
          <Empty>
            <p>{td.loginFirst}</p>
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
              <Row key={r.m.id} r={r} usdOf={toUsd} busy={tx.busy || !!batch} onClaim={() => act(claim(r.m, r.owed))} />
            ))}
          </div>
        ) : (
          <Empty>
            <p>{td.none}</p>
            <Link href="/" className="btn primary">{td.seeMemes}</Link>
          </Empty>
        )}
        <div className="err" role="status">{tx.error}</div>
        <TxLog log={tx.log} />
      </div>

      <aside className="stack" style={{ gap: 24 }}>
        {w.address && rows.data && list.length > 0 && (
          <section className="indicator" aria-label={td.toClaim}>
            <div className="rule-head"><h2>{td.toClaim}</h2></div>
            <b className="indicator-total">{usd(owedUsd)}</b>
            {owed.length > 1 && (
              <button className="btn primary block lg" onClick={claimAll} disabled={tx.busy || !!batch} style={{ marginTop: 8 }}>
                {batch ?? td.claimAll(owed.length)}
              </button>
            )}
          </section>
        )}
        <section className="stack" style={{ gap: 10 }}>
          <div className="rule-head"><h3>{td.how}</h3></div>
          <div className="fine-print">
            {td.fine.map((line) => <span key={line}>{line}</span>)}
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
}: {
  r: Dividend;
  usdOf: (amount: bigint, pair: string) => number;
  busy: boolean;
  onClaim: () => void;
}) {
  const { m, bal, owed } = r;
  const td = useT().dividends;
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
          {td.holds(compact(fromUnits(bal)), p?.symbol ?? "")}
        </span>
      </div>
      <div className="div-amount">
        {owed > 0n ? (
          <>
            <b className="num">{bond(owed)}</b>
            <span className="muted small num">{usd(usdOf(owed, m.pair))}</span>
          </>
        ) : (
          <span className="muted small">{td.nothing}</span>
        )}
      </div>
      <div className="div-action">
        {owed > 0n && <button className="btn primary" onClick={onClaim} disabled={busy}>{td.claim}</button>}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="div-empty">{children}</div>;
}
