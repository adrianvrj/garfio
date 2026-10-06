"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { hasTrustline } from "@/lib/chain";
import { faucetAmount, IS_MAINNET, PAIRS, txUrl, type PairSymbol } from "@/lib/config";
import { usePrices } from "@/lib/prices";
import { fmt } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useListedPairs } from "@/hooks/useListedPairs";
import { usePresence } from "@/hooks/usePresence";
import { useTx } from "@/hooks/useTx";
import { YieldBadge } from "./YieldBadge";

const EVENT = "garfio:deposit";

/** Opens the deposit dialog from anywhere, optionally on one bond. */
export function openDeposit(symbol?: PairSymbol) {
  window.dispatchEvent(new CustomEvent<PairSymbol | undefined>(EVENT, { detail: symbol }));
}

async function askFaucet(address: string, pair: string): Promise<string> {
  const res = await fetch("/api/faucet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, pair }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.hash;
}

/**
 * Simulates what Etherfuse's onramp does in production: pesos (or reais) in by bank transfer, the
 * bond out to the wallet. On testnet our faucet sends the bond. A wallet that does not accept the
 * bond yet first opens its trustline (sponsored on Cavos).
 */
export function DepositModal() {
  const w = useWallet();
  const tx = useTx();
  const prices = usePrices();
  const listed = useListedPairs();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<PairSymbol>(PAIRS[0].symbol);
  /** What the deposit is doing, for the spinner and its label; null when idle. */
  const [step, setStep] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const view = usePresence(open, 220);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const symbol = (e as CustomEvent<PairSymbol | undefined>).detail;
      if (symbol) setChosen(symbol);
      setDone(false);
      setOpen(true);
    };
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open || step) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  if (IS_MAINNET || !view.mounted) return null;

  const pair = listed.find((p) => p.symbol === chosen) ?? listed[0];
  const units = pair ? faucetAmount(pair) : 0;
  const nav = pair ? prices.bond(pair.symbol)?.nav : undefined;
  // What the same bond would cost through the onramp, in its own currency.
  const fiat = nav !== undefined ? units * nav : null;

  async function deposit() {
    if (!w.address || !pair) return;
    const account = w.address;
    setStep("Revisando tu wallet…");
    try {
      const accepts = await hasTrustline(account, pair.asset);
      if (!accepts) {
        setStep(`Preparando tu wallet para recibir ${pair.symbol}…`);
        if (!(await tx.run(`tu wallet acepta ${pair.symbol}`, () => w.addTrustline(pair.asset)))) return setStep(null);
      }
    } catch {
      setStep(null);
      return tx.setError("No pude revisar tu cuenta. Intenta de nuevo.");
    }
    setStep(`Enviando ${fmt(units, 0)} ${pair.symbol} desde el faucet…`);
    const hash = await tx.run(`recibiste ${fmt(units, 0)} ${pair.symbol}`, () => askFaucet(account, pair.symbol));
    setStep(null);
    if (hash) setDone(true);
  }

  const working = Boolean(step) || done;
  const last = tx.log[0];

  return createPortal(
    <div className="modal-bg" data-open={view.shown || undefined} onClick={() => !step && setOpen(false)}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="deposit-title" onClick={(e) => e.stopPropagation()}>
        <div className="between">
          <h3 id="deposit-title">{done ? "Listo" : step ? "Depositando" : "Depositar"}</h3>
          {!step && <button className="btn ghost sm" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>}
        </div>

        {!pair ? (
          <p className="small ink2">El faucet se quedó sin bonos por ahora. Intenta más tarde.</p>
        ) : working ? (
          // The whole dialog becomes the progress: a spinner while it runs, closing into a check.
          <div className="deposit-progress" data-done={done || undefined} role="status" aria-live="polite">
            <svg className="deposit-mark" viewBox="0 0 52 52" aria-hidden="true">
              <circle className="deposit-ring" cx="26" cy="26" r="23" />
              <path className="deposit-check" d="M15 27l7 7 15-16" />
            </svg>
            <b className="num">{fmt(units, 0)} {pair.symbol}</b>
            <span className="ink2">{done ? "ya están en tu wallet" : step}</span>
            <span className="small muted">Depósito simulado con nuestro faucet de testnet.</span>
            {done && (
              <>
                {last?.hash && (
                  <a className="copy" href={txUrl(last.hash)} target="_blank" rel="noopener">ver transacción ↗</a>
                )}
                <button className="btn primary block lg" onClick={() => setOpen(false)}>A operar</button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="sim-note small">
              <b>Depósito simulado</b>
              <span>
                Garfio corre en testnet: no recibimos dinero. Nuestro faucet te envía bonos de sandbox de Etherfuse para
                que pruebes. En producción, Etherfuse recibe tus pesos por transferencia y te manda el bono real.
              </span>
            </div>

            <div className="pair-pick" role="radiogroup" aria-label="Bono">
              {listed.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  role="radio"
                  aria-checked={pair.symbol === x.symbol}
                  className="pair-opt"
                  onClick={() => setChosen(x.symbol)}
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

            <div className="quote">
              <div>
                <span>Depositarías</span>
                <span className="num">{fiat !== null ? `${fmt(fiat, 2)} ${pair.currency}` : "…"}</span>
              </div>
              <div>
                <span>Recibes</span>
                <b className="num">{fmt(units, 0)} {pair.symbol}</b>
              </div>
            </div>

            {w.address ? (
              <button className="btn primary block lg" onClick={deposit}>
                {`Simular depósito${fiat !== null ? ` de ${fmt(fiat, 0)} ${pair.currency}` : ""}`}
              </button>
            ) : (
              <p className="muted small">Entra con tu wallet (arriba a la derecha) para depositar.</p>
            )}
            <div className="err" role="status">{tx.error}</div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
