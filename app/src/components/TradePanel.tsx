"use client";

import { useEffect, useState } from "react";
import { calls, quoteBuy, quoteSell, type Meme } from "@/lib/chain";
import type { PairInfo } from "@/lib/config";
import { pricePair } from "@/lib/curve";
import { compact, fmt, fromUnits, toUnits } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useTx } from "@/hooks/useTx";
import { TxLog } from "./TxLink";

const SLIPPAGE_BPS = 100n; // 1%

interface Quote {
  fee: number;
  out: number;
  minOut: bigint;
  impact: number;
  charged?: number;
}

export function TradePanel({
  meme,
  pair,
  memeBalance,
  onDone,
}: {
  meme: Meme;
  pair: PairInfo;
  memeBalance: bigint;
  onDone: () => void;
}) {
  const w = useWallet();
  const tx = useTx();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState(pair.quick[1]);
  const [quoted, setQuoted] = useState<{ key: string; quote: Quote } | null>(null);
  const buy = side === "buy";
  // A quote is only shown for the exact input (and curve state) it was computed for.
  const key = `${side}|${amount}|${meme.v_pair}|${meme.v_token}`;
  const quote = quoted?.key === key ? quoted.quote : null;

  // Debounced on-chain quote (quote_buy / quote_sell are simulated, no signature).
  useEffect(() => {
    let units: bigint;
    try {
      units = toUnits(amount);
    } catch {
      return;
    }
    if (units <= 0n) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const before = pricePair(meme);
        let q: Quote;
        if (buy) {
          const r = await quoteBuy(meme.id, units);
          const after = (Number(meme.v_pair) + Number(r.charged - r.fee)) / (Number(meme.v_token) - Number(r.out));
          q = {
            fee: fromUnits(r.fee),
            out: fromUnits(r.out),
            charged: fromUnits(r.charged),
            minOut: (r.out * (10_000n - SLIPPAGE_BPS)) / 10_000n,
            impact: (after / before - 1) * 100,
          };
        } else {
          const r = await quoteSell(meme.id, units);
          const after = (Number(meme.v_pair) - Number(r.out + r.fee)) / (Number(meme.v_token) + Number(units));
          q = {
            fee: fromUnits(r.fee),
            out: fromUnits(r.out),
            minOut: (r.out * (10_000n - SLIPPAGE_BPS)) / 10_000n,
            impact: (after / before - 1) * 100,
          };
        }
        if (live) setQuoted({ key, quote: q });
      } catch {}
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [key, amount, buy, meme]);

  async function go() {
    if (!w.address) return tx.setError("Conecta una wallet primero.");
    let units: bigint;
    try {
      units = toUnits(amount);
    } catch (e) {
      return tx.setError((e as Error).message);
    }
    if (units <= 0n || !quote) return tx.setError("Escribe una cantidad mayor a cero.");
    if (!buy && units > memeBalance) return tx.setError(`Solo tienes ${compact(fromUnits(memeBalance))} $${meme.symbol}.`);
    const hash = buy
      ? await tx.send(
          calls.buy(w.address, meme.id, units, quote.minOut),
          `buy $${meme.symbol} −${fmt(quote.charged ?? fromUnits(units), pair.decimals)} ${pair.symbol} +${compact(quote.out)}`,
        )
      : await tx.send(
          calls.sell(w.address, meme.id, units, quote.minOut),
          `sell $${meme.symbol} −${compact(fromUnits(units))} +${fmt(quote.out, pair.decimals)} ${pair.symbol}`,
        );
    if (hash) onDone();
  }

  const quick = buy
    ? pair.quick.map((q) => ({ label: q, value: q }))
    : ["25%", "50%", "100%"].map((p) => ({
        label: p,
        value: String((fromUnits(memeBalance) * parseInt(p)) / 100),
      }));

  return (
    <div className="trade">
      <div className="seg" role="group" aria-label="Acción">
        <button aria-pressed={buy} onClick={() => { setSide("buy"); setAmount(pair.quick[1]); }}>Comprar</button>
        <button aria-pressed={!buy} onClick={() => { setSide("sell"); setAmount(String(Math.floor(fromUnits(memeBalance)))); }}>Vender</button>
      </div>
      <label className="f">
        {buy ? `Pagas en ${pair.symbol}` : `Vendes $${meme.symbol}`}
        <input className="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <div className="quick">
        {quick.map((q) => (
          <button key={q.label} type="button" onClick={() => setAmount(q.value)}>{q.label}</button>
        ))}
      </div>
      <div className="rows">
        <div><span>Fee 1%</span><span className="num">{quote ? `${fmt(quote.fee, pair.decimals)} ${pair.symbol}` : "–"}</span></div>
        <div><span>Al creador (0.5%)</span><span className="num">{quote ? `${fmt(quote.fee / 2, pair.decimals)} ${pair.symbol}` : "–"}</span></div>
        <div>
          <span>Recibes</span>
          <span className="num">
            {quote ? (buy ? `${compact(quote.out)} $${meme.symbol}` : `${fmt(quote.out, pair.decimals)} ${pair.symbol}`) : "–"}
          </span>
        </div>
        <div><span>Impacto en precio</span><span className="num">{quote ? (quote.impact >= 0 ? "+" : "") + fmt(quote.impact, 2) + "%" : "–"}</span></div>
        {buy && quote?.charged !== undefined && quote.charged < Number(amount) && (
          <div><span>Se cobra (llena la curva)</span><span className="num">{fmt(quote.charged, pair.decimals)} {pair.symbol}</span></div>
        )}
      </div>
      <button className="go" onClick={go} disabled={tx.busy || meme.graduated}>
        {meme.graduated ? "Graduada" : tx.busy ? "Firmando…" : `${buy ? "Comprar" : "Vender"} $${meme.symbol}`}
      </button>
      <div className="err" role="status">{tx.error}</div>
      <TxLog log={tx.log} />
    </div>
  );
}
