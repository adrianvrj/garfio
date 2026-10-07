"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { calls, txReturn } from "@/lib/chain";
import { PAIRS } from "@/lib/config";
import { artSeed } from "@/lib/avatar";
import { explain } from "@/lib/errors";
import { fmt, fromUnits, toUnits } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useListedPairs } from "@/hooks/useListedPairs";
import { useTx } from "@/hooks/useTx";
import { TokenArt } from "@/components/Art";
import { Identity } from "@/components/Identity";
import { TxLog } from "@/components/TxLink";
import { Progress } from "@/components/Progress";
import { YieldBadge } from "@/components/YieldBadge";

export default function Create() {
  const router = useRouter();
  const w = useWallet();
  const tx = useTx();
  const listed = useListedPairs();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [pair, setPair] = useState(PAIRS[0].id);
  const [devBuy, setDevBuy] = useState("");
  const [step, setStep] = useState("");

  const sym = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const p = PAIRS.find((x) => x.id === pair)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!w.address) return tx.setError("Entra con tu wallet primero (arriba a la derecha).");
    if (!name.trim() || !sym) return tx.setError("Ponle nombre y ticker.");
    let dev = 0n;
    try {
      if (devBuy.trim()) dev = toUnits(devBuy);
    } catch (err) {
      return tx.setError((err as Error).message);
    }
    setStep("Desplegando tu token…");
    const hash = await tx.send(calls.create(w.address, name.trim(), sym, pair, dev), `creaste $${sym}`);
    if (!hash) return setStep("");
    try {
      const meme = await txReturn<string>(hash);
      router.push(`/m/${meme}`);
    } catch (err) {
      tx.setError(explain(err));
      setStep("");
    }
  }

  return (
    <div className="create">
      <form className="stack coupon" data-label="Aviso clasificado · llene a mano" style={{ gap: 18, padding: "28px 24px 24px" }} onSubmit={submit}>
        <div className="stack" style={{ gap: 6 }}>
          <span className="kicker">Clasificados · Nuevas emisiones</span>
          <h1>Publica tu meme</h1>
          <p className="deck ink2" style={{ fontStyle: "italic", fontSize: "1.125rem" }}>Sale en la edición de hoy, con su reserva en un bono soberano.</p>
        </div>
        <div className="row" style={{ gap: 12, alignItems: "stretch" }}>
          <label className="field" style={{ flex: 2 }}>
            <span>Nombre</span>
            <input className="input" value={name} maxLength={32} placeholder="Taco Coin" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>Ticker</span>
            <input className="input" value={symbol} maxLength={12} placeholder="TACO" onChange={(e) => setSymbol(e.target.value)} />
          </label>
        </div>

        <div className="field">
          <span>Respaldo de la reserva</span>
          <div className="pair-pick" role="radiogroup">
            {listed.map((x) => (
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
                  <span className="small ink2" style={{ display: "block" }}>{x.label}</span>
                </span>
                <YieldBadge pair={x} suffix="" />
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Compra inicial en {p.symbol} (opcional)</span>
          <input
            className="input"
            inputMode="decimal"
            value={devBuy}
            placeholder="0"
            onChange={(e) => setDevBuy(e.target.value)}
          />
          <span className="small muted">Se compra en la misma transacción, antes que nadie.</span>
        </label>

        <p className="small muted">
          Crear cuesta {fmt(fromUnits(p.createFee), p.decimals)} {p.symbol}, que entran al vault de tu moneda: la mitad se reparte a sus holders.
        </p>

        <button className="btn primary block lg" type="submit" disabled={tx.busy || !!step}>
          {step || "Publicar mi meme"}
        </button>
        <div className="err" role="status">{tx.error}</div>
        <TxLog log={tx.log} />
      </form>

      <div className="stack" style={{ gap: 24 }}>
        <div className="rule-head"><h2>Así saldrá impresa</h2></div>
        <div className="card" style={{ marginTop: -12 }}>
          <TokenArt seed={artSeed({ symbol: sym || "TACO", name: name || "Taco Coin" })} wide />
          <span className="kicker">{p.symbol} · {name || "Taco Coin"}</span>
          <h3>${sym || "TACO"} sale a la venta</h3>
          {w.address && <span className="byline">Por <Identity address={w.address} size={14} /> · ahora</span>}
          <div className="grad"><Progress value={0} /><span>0%</span></div>
        </div>
        <div className="rule-head"><h2>Letra pequeña</h2></div>
        <div className="fine-print" style={{ marginTop: -12 }}>
          <span>Supply fijo de 1B: 800M se venden en la curva.</span>
          <span>La reserva se guarda en {p.symbol}, que rinde aunque nadie opere.</span>
          <span>Al venderse los 800M, la liquidez pasa a Soroswap y queda bloqueada.</span>
          <span>Cobras 0.5% de cada compra y venta en la curva, en {p.symbol}.</span>
          <span>Otro 0.25% va al vault de tu moneda: la mitad se reparte a sus holders en {p.symbol} y el resto, tras graduar, recompra y quema.</span>
          <span>La foto se busca por el nombre en Wikipedia; mientras no se puedan subir imágenes, elige un nombre que se pueda fotografiar.</span>
        </div>
      </div>
    </div>
  );
}
