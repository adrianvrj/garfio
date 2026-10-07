"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { calls, txReturn } from "@/lib/chain";
import { PAIRS } from "@/lib/config";
import { artSeed } from "@/lib/avatar";
import { explain } from "@/lib/errors";
import { fmt, fromUnits, toUnits } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useTx } from "@/hooks/useTx";
import { TokenArt } from "@/components/Art";
import { Identity } from "@/components/Identity";
import { TxLog } from "@/components/TxLink";
import { Progress } from "@/components/Progress";
import { YieldBadge } from "@/components/YieldBadge";
import { useT } from "@/i18n/client";

export default function Create() {
  const router = useRouter();
  const w = useWallet();
  const t = useT();
  const tc = t.create;
  const tx = useTx();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [pair, setPair] = useState(PAIRS[0].id);
  const [devBuy, setDevBuy] = useState("");
  const [step, setStep] = useState("");

  const sym = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const p = PAIRS.find((x) => x.id === pair)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!w.address) return tx.setError(tc.loginFirst);
    if (!name.trim() || !sym) return tx.setError(tc.nameAndTicker);
    let dev = 0n;
    try {
      if (devBuy.trim()) dev = toUnits(devBuy);
    } catch (err) {
      return tx.setError(explain(err, t));
    }
    setStep(tc.deploying);
    const hash = await tx.send(calls.create(w.address, name.trim(), sym, pair, dev), tc.logCreated(sym));
    if (!hash) return setStep("");
    try {
      const meme = await txReturn<string>(hash);
      router.push(`/m/${meme}`);
    } catch (err) {
      tx.setError(explain(err, t));
      setStep("");
    }
  }

  return (
    <div className="create">
      <form className="stack coupon" data-label={tc.couponLabel} style={{ gap: 18 }} onSubmit={submit}>
        <div className="stack" style={{ gap: 6 }}>
          <span className="kicker">{tc.kicker}</span>
          <h1>{tc.title}</h1>
          <p className="deck ink2" style={{ fontStyle: "italic", fontSize: "1.125rem" }}>{tc.deck}</p>
        </div>
        <div className="row" style={{ gap: 12, alignItems: "stretch" }}>
          <label className="field" style={{ flex: 2 }}>
            <span>{tc.name}</span>
            <input className="input" value={name} maxLength={32} placeholder="Taco Coin" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>{tc.ticker}</span>
            <input className="input" value={symbol} maxLength={12} placeholder="TACO" onChange={(e) => setSymbol(e.target.value)} />
          </label>
        </div>

        <div className="field">
          <span>{tc.backing}</span>
          <div className="pair-pick" role="radiogroup">
            {/* Every bond the launchpad takes, even one the faucet has run out of: the creator may already hold it. */}
            {PAIRS.map((x) => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={pair === x.id}
                className="pair-opt"
                onClick={() => setPair(x.id)}
              >
                <span className="dot" />
                <span>
                  <b>{x.symbol}</b> <span className="muted">· {x.name}</span>
                  <span className="small ink2" style={{ display: "block" }}>{t.pairLabel[x.symbol] ?? t.pairLabel.other}</span>
                </span>
                <YieldBadge pair={x} suffix="" />
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>{tc.devBuy(p.symbol)}</span>
          <input
            className="input"
            inputMode="decimal"
            value={devBuy}
            placeholder="0"
            onChange={(e) => setDevBuy(e.target.value)}
          />
          <span className="small muted">{tc.devBuyNote}</span>
        </label>

        <p className="small muted">
          {tc.cost(fmt(fromUnits(p.createFee), p.decimals), p.symbol)}
        </p>

        <button className="btn primary block lg" type="submit" disabled={tx.busy || !!step}>
          {step || tc.submit}
        </button>
        <div className="err" role="status">{tx.error}</div>
        <TxLog log={tx.log} />
      </form>

      <div className="stack" style={{ gap: 24 }}>
        <div className="rule-head"><h2>{tc.preview}</h2></div>
        <div className="card" style={{ marginTop: -12 }}>
          <TokenArt seed={artSeed({ symbol: sym || "TACO", name: name || "Taco Coin" })} wide />
          <span className="kicker">{p.symbol} · {name || "Taco Coin"}</span>
          <h3>{t.news.story(sym || "TACO", { graduated: false, progress: 0 })}</h3>
          {w.address && <span className="byline">{t.common.by} <Identity address={w.address} size={14} /> · {tc.now}</span>}
          <div className="grad"><Progress value={0} /><span>0%</span></div>
        </div>
        <div className="rule-head"><h2>{tc.finePrint}</h2></div>
        <div className="fine-print" style={{ marginTop: -12 }}>
          {tc.fine(p.symbol).map((line) => <span key={line}>{line}</span>)}
        </div>
      </div>
    </div>
  );
}
