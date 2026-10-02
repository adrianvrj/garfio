"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { calls, txReturn } from "@/lib/chain";
import { PAIRS } from "@/lib/config";
import { explain } from "@/lib/errors";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useBalances } from "@/hooks/useMarket";
import { useTx } from "@/hooks/useTx";
import { WalletPanel } from "@/components/WalletPanel";
import { TxLog } from "@/components/TxLink";

export default function Create() {
  const router = useRouter();
  const w = useWallet();
  const tx = useTx();
  const balances = useBalances(w.address);
  const [name, setName] = useState("Aguacate");
  const [symbol, setSymbol] = useState("AGUA");
  const [pair, setPair] = useState(PAIRS[0].id);
  const [step, setStep] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!w.address) return tx.setError("Conecta una wallet primero.");
    const sym = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!name.trim() || !sym) return tx.setError("Falta nombre o ticker.");
    setStep("Desplegando el token SEP-41…");
    const hash = await tx.send(calls.create(w.address, name.trim(), sym, pair), `launchpad.create("${name.trim()}", "${sym}")`);
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
    <div className="grid2" style={{ marginTop: 28 }}>
      <form className="panel" onSubmit={submit}>
        <h2 className="display" style={{ fontSize: 40 }}>Crear memecoin</h2>
        <p className="muted" style={{ margin: 0 }}>
          Se despliega un token SEP-41 con 1B de supply fijo: 800M se venden en la curva. Tú eliges el RWA que respalda la
          reserva y cobras 0.5% de cada compra y venta.
        </p>
        <label className="f">Nombre<input className="txt" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} /></label>
        <label className="f">Ticker<input className="txt" value={symbol} maxLength={12} onChange={(e) => setSymbol(e.target.value)} /></label>
        <label className="f">
          Par
          <select className="txt" value={pair} onChange={(e) => setPair(e.target.value)}>
            {PAIRS.map((p) => (
              <option key={p.id} value={p.id}>{p.symbol} · {p.label}</option>
            ))}
          </select>
        </label>
        <button className="go" type="submit" disabled={tx.busy || !!step}>
          {step || "Crear (launchpad.create)"}
        </button>
        <div className="err" role="status">{tx.error}</div>
        <TxLog log={tx.log} />
      </form>
      <div className="panel">
        <div className="eyebrow">Fondos de prueba</div>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Crear es gratis. Para comprar necesitas el RWA del par: pide tCETES, tUSTRY o tNVDA al faucet.
        </p>
        <WalletPanel balances={balances.data} onDone={balances.refresh} />
      </div>
    </div>
  );
}
