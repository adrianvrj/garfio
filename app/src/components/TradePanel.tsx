"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { calls, quoteBuy, quoteSell, quoteSwap, type Meme } from "@/lib/chain";
import { contractUrl, IS_MAINNET, type PairInfo } from "@/lib/config";
import { pricePair } from "@/lib/curve";
import { SLIPPAGE_ERROR } from "@/lib/errors";
import { localStore } from "@/lib/local";
import { usePrices } from "@/lib/prices";
import { compact, fmt, fromUnits, toUnits } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useTx } from "@/hooks/useTx";
import { FaucetButton } from "./FaucetButton";
import { TxLog } from "./TxLink";

/** Slippage presets in basis points; the choice is kept per browser. */
const SLIPPAGES = [50, 100, 300, 500];
const slippage = localStore("garfio-slippage-bps", 100);
const QUICK_USD = [10, 100, 500];

/** Soroswap's swap fee. */
const POOL_FEE = 0.003;

interface Quote {
  fee: number;
  out: number;
  /** `out` in base units, before slippage. */
  outUnits: bigint;
  impact: number;
  charged?: number;
  /** The buy takes the last tokens for sale, so it graduates the curve. */
  fills?: boolean;
}

/**
 * Buys and sells a meme: on its curve until it graduates, then against its Soroswap pool through
 * the router. Once migrated, a second panel runs the vault's buybacks.
 */
export function TradePanel({
  meme,
  pair,
  memeBalance,
  pairBalance,
  pool,
  onDone,
}: {
  meme: Meme;
  pair: PairInfo;
  memeBalance: bigint;
  pairBalance: bigint | null;
  /** The pool's reserves once the meme has migrated. */
  pool: { pairAmt: bigint; memeAmt: bigint } | null;
  onDone: () => void;
}) {
  const w = useWallet();
  const tx = useTx();
  const pairUsd = usePrices().usd(pair.symbol);
  const inPair = (dollars: number) => (dollars / pairUsd).toFixed(pair.decimals);
  // `?buy=<dollars>` prefills the buy, for links from the Telegram bot.
  const linked = Number(useSearchParams().get("buy"));
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState(() => inPair(linked > 0 ? linked : QUICK_USD[1]));
  const [quoted, setQuoted] = useState<{ key: string; quote: Quote } | null>(null);
  const bps = slippage.useValue();
  const nextBps = SLIPPAGES.find((s) => s > bps);
  const buy = side === "buy";
  const inPool = Boolean(meme.pool && pool);
  // A quote is only shown for the exact input (and curve or pool state) it was computed for.
  const key = inPool
    ? `${side}|${amount}|${pool?.pairAmt}|${pool?.memeAmt}`
    : `${side}|${amount}|${meme.v_pair}|${meme.v_token}`;
  const quote = quoted?.key === key ? quoted.quote : null;
  const valid = (() => {
    try {
      return toUnits(amount) > 0n;
    } catch {
      return false;
    }
  })();
  // While a new quote is in flight, keep the last one for this side on screen, dimmed, instead of blanking it.
  const shown = quote ?? (valid && quoted?.key.startsWith(`${side}|`) ? quoted.quote : null);

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
        let q: Quote;
        if (pool) {
          // Soroswap takes its fee from the input; the impact is the pool's price move.
          const [rp, rm] = [Number(pool.pairAmt), Number(pool.memeAmt)];
          const out = buy ? await quoteSwap(pair.id, meme.id, units) : await quoteSwap(meme.id, pair.id, units);
          const after = buy ? (rp + Number(units)) / (rm - Number(out)) : (rp - Number(out)) / (rm + Number(units));
          q = {
            fee: buy ? fromUnits(units) * POOL_FEE : (fromUnits(out) * POOL_FEE) / (1 - POOL_FEE),
            out: fromUnits(out),
            outUnits: out,
            impact: (after / (rp / rm) - 1) * 100,
          };
          if (live) setQuoted({ key, quote: q });
          return;
        }
        const before = pricePair(meme);
        if (buy) {
          const r = await quoteBuy(meme.id, units);
          const after = (Number(meme.v_pair) + Number(r.charged - r.fee)) / (Number(meme.v_token) - Number(r.out));
          q = {
            fee: fromUnits(r.fee),
            out: fromUnits(r.out),
            charged: fromUnits(r.charged),
            fills: r.charged < units,
            outUnits: r.out,
            impact: (after / before - 1) * 100,
          };
        } else {
          const r = await quoteSell(meme.id, units);
          const after = (Number(meme.v_pair) - Number(r.out + r.fee)) / (Number(meme.v_token) + Number(units));
          q = {
            fee: fromUnits(r.fee),
            out: fromUnits(r.out),
            outUnits: r.out,
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
  }, [key, amount, buy, meme, pool, pair.id]);

  async function go(slip = bps) {
    if (!w.address) return tx.setError("Conecta una wallet primero.");
    let units: bigint;
    try {
      units = toUnits(amount);
    } catch (e) {
      return tx.setError((e as Error).message);
    }
    if (units <= 0n) return tx.setError("Escribe una cantidad mayor a cero.");
    if (!quote) return tx.setError("Todavía estoy cotizando, intenta en un momento.");
    if (!buy && units > memeBalance) return tx.setError(`Solo tienes ${compact(fromUnits(memeBalance))} $${meme.symbol}.`);
    const minOut = (quote.outUnits * BigInt(10_000 - slip)) / 10_000n;
    if (inPool) {
      const [from, to] = buy ? [pair.id, meme.id] : [meme.id, pair.id];
      const label = buy
        ? `buy $${meme.symbol} en Soroswap −${fmt(fromUnits(units), pair.decimals)} ${pair.symbol} +${compact(quote.out)}`
        : `sell $${meme.symbol} en Soroswap −${compact(fromUnits(units))} +${fmt(quote.out, pair.decimals)} ${pair.symbol}`;
      if (await tx.send(calls.swap(w.address, from, to, units, minOut), label)) onDone();
      return;
    }
    const hash = buy
      ? await tx.send(
          calls.buy(w.address, meme.id, units, minOut),
          `buy $${meme.symbol} −${fmt(quote.charged ?? fromUnits(units), pair.decimals)} ${pair.symbol} +${compact(quote.out)}`,
        )
      : await tx.send(
          calls.sell(w.address, meme.id, units, minOut),
          `sell $${meme.symbol} −${compact(fromUnits(units))} +${fmt(quote.out, pair.decimals)} ${pair.symbol}`,
        );
    if (!hash) return;
    if (quote.fills) await migrate();
    onDone();
  }

  async function migrate() {
    if (await tx.send(calls.migrate(meme.id), `$${meme.symbol} pasó a Soroswap`)) onDone();
  }

  async function buyback() {
    if (await tx.send(calls.buyback(meme.id), `recompraste y quemaste $${meme.symbol}`)) onDone();
  }

  // Sold out but not migrated yet: the only thing to do is open the pool.
  if (meme.graduated && !meme.pool) {
    return (
      <div className="panel stack coupon" data-label="Recorte y abra el pool">
        <h3>Graduada</h3>
        <p className="small ink2">La curva se vendió completa. Falta abrir su pool en Soroswap; cualquiera puede hacerlo.</p>
        {w.address && (
          <button className="btn block lg" onClick={migrate} disabled={tx.busy}>
            {tx.busy ? "Firmando…" : "Abrir pool en Soroswap"}
          </button>
        )}
        <div className="err" role="status">{tx.error}</div>
        <TxLog log={tx.log} />
      </div>
    );
  }

  const quick = buy
    ? QUICK_USD.map((d) => ({ label: `$${d}`, value: inPair(d) }))
    : ["25%", "50%", "100%"].map((p) => ({
        label: p,
        value: String((fromUnits(memeBalance) * parseInt(p)) / 100),
      }));

  return (
    <>
      <div className="panel stack coupon" data-label={`Recorte y opere $${meme.symbol}`}>
        {meme.pool && (
          <p className="small ink2">
            Graduada: se opera en su pool de Soroswap, con la liquidez bloqueada para siempre.{" "}
            <a className="copy" href={contractUrl(meme.pool)} target="_blank" rel="noopener">ver pool ↗</a>
          </p>
        )}
        <div className="seg" role="group" aria-label="Acción">
          <button className="is-buy" aria-pressed={buy} onClick={() => { setSide("buy"); setAmount(inPair(QUICK_USD[1])); }}>Comprar</button>
          <button className="is-sell" aria-pressed={!buy} onClick={() => { setSide("sell"); setAmount(String(Math.floor(fromUnits(memeBalance)))); }}>Vender</button>
        </div>
        <label className="field">
          <span className="between">
            <span>{buy ? `Pagas en ${pair.symbol}` : `Vendes $${meme.symbol}`}</span>
            {w.address && (
              <span className="num muted">
                saldo {buy ? (pairBalance === null ? "…" : fmt(fromUnits(pairBalance), pair.decimals)) : compact(fromUnits(memeBalance))}
              </span>
            )}
          </span>
          <input className="input big" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <div className="chips">
          {quick.map((q) => (
            <button key={q.label} type="button" className="chip" onClick={() => setAmount(q.value)}>{q.label}</button>
          ))}
        </div>
        <div className="quote" data-stale={(shown && !quote) || undefined}>
          <div>
            <span>Recibes</span>
            <b className="num">
              {shown ? (buy ? `${compact(shown.out)} $${meme.symbol}` : `${fmt(shown.out, pair.decimals)} ${pair.symbol}`) : "–"}
            </b>
          </div>
          <div><span>Impacto en precio</span><span className="num">{shown ? (shown.impact >= 0 ? "+" : "") + fmt(shown.impact, 2) + "%" : "–"}</span></div>
          <div><span>{inPool ? "Fee 0.3% de Soroswap" : "Fee 1% (½ creador · ¼ vault · ¼ protocolo)"}</span><span className="num">{shown ? `${fmt(shown.fee, pair.decimals)} ${pair.symbol}` : "–"}</span></div>
          <div>
            <span>Slippage máx.</span>
            <span className="chips" role="group" aria-label="Slippage máximo">
              {SLIPPAGES.map((s) => (
                <button key={s} type="button" className="chip" aria-pressed={bps === s} onClick={() => slippage.set(s)}>
                  {s / 100}%
                </button>
              ))}
            </span>
          </div>
          {buy && shown?.fills && shown.charged !== undefined && (
            <div><span>Se cobra (llena la curva)</span><span className="num">{fmt(shown.charged, pair.decimals)} {pair.symbol}</span></div>
          )}
        </div>
        {w.address ? (
          <button className={`btn block lg ${buy ? "buy-btn" : "sell-btn"}`} onClick={() => go()} disabled={tx.busy}>
            {tx.busy ? "Firmando…" : `${buy ? "Comprar" : "Vender"} $${meme.symbol}`}
          </button>
        ) : (
          <p className="muted small">Entra con tu wallet (arriba a la derecha) para operar.</p>
        )}
        {buy && w.address && pairBalance === 0n && (
          <div className="between small ink2">
            <span>No tienes {pair.symbol}.</span>
            {IS_MAINNET ? (
              <span>
                Consíguelos en <a className="copy" href="https://app.etherfuse.com" target="_blank" rel="noopener">Etherfuse ↗</a> o{" "}
                <a className="copy" href="https://aqua.network" target="_blank" rel="noopener">Aquarius ↗</a>
              </span>
            ) : (
              <FaucetButton pair={pair} />
            )}
          </div>
        )}
        <div className="err" role="status">{tx.error}</div>
        {tx.error === SLIPPAGE_ERROR && nextBps && (
          <button
            className="btn block"
            disabled={tx.busy}
            onClick={() => {
              slippage.set(nextBps);
              go(nextBps);
            }}
          >
            Reintentar con {nextBps / 100}%
          </button>
        )}
        <TxLog log={tx.log} />
      </div>
      {meme.pool && (
        <div className="panel stack">
          <div className="between">
            <h3>Recompra y quema</h3>
            <span className="num">{fmt(fromUnits(meme.vault), pair.decimals)} {pair.symbol}</span>
          </div>
          <p className="small ink2">
            El vault gasta hasta 1% de la reserva del pool en ${meme.symbol} y lo quema. Cualquiera puede llamarlo.
          </p>
          {w.address && meme.vault > 0n && (
            <button className="btn block" onClick={buyback} disabled={tx.busy}>
              {tx.busy ? "Firmando…" : `Recomprar y quemar $${meme.symbol}`}
            </button>
          )}
        </div>
      )}
    </>
  );
}
