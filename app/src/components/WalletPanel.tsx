"use client";

import { calls, type Meme } from "@/lib/chain";
import { PAIRS } from "@/lib/config";
import { compact, fmt, fromUnits, short, usd } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useTx } from "@/hooks/useTx";
import { TxLog } from "./TxLink";

export function WalletPanel({
  balances,
  meme,
  memeUsd,
  onDone,
}: {
  balances: Record<string, bigint> | null;
  meme?: Meme;
  memeUsd?: number;
  onDone: () => void;
}) {
  const w = useWallet();
  const tx = useTx();
  if (!w.address) return <div className="wallet muted">Conecta una wallet para operar.</div>;

  const isCreator = meme && meme.creator === w.address;
  const memeBal = meme ? (balances?.[meme.id] ?? 0n) : 0n;

  return (
    <div className="wallet">
      <div className="row">
        <span className="eyebrow">Tu wallet · {w.kind === "cavos" ? "Cavos" : "Freighter"}</span>
        <span>{short(w.address)}</span>
      </div>
      {PAIRS.map((p) => (
        <div className="row" key={p.id}>
          <span>{p.symbol}</span>
          <span className="num">
            {balances ? fmt(fromUnits(balances[p.id] ?? 0n), p.decimals) : "…"}{" "}
            <button
              className="btn"
              style={{ padding: "1px 6px", fontSize: 10 }}
              disabled={tx.busy}
              onClick={async () => {
                if (await tx.send(calls.faucet(p.id, w.address!), `faucet · +${p.faucet} ${p.symbol}`)) onDone();
              }}
            >
              faucet
            </button>
          </span>
        </div>
      ))}
      {meme && memeBal > 0n && (
        <div className="row">
          <span>${meme.symbol}</span>
          <span className="num">{compact(fromUnits(memeBal))} · {usd(fromUnits(memeBal) * (memeUsd ?? 0))}</span>
        </div>
      )}
      {isCreator && (
        <div className="row">
          <span>Tus fees de creador</span>
          <span className="num">
            {fmt(fromUnits(meme.fees_creator), 4)}{" "}
            <button
              className="btn"
              style={{ padding: "1px 6px", fontSize: 10 }}
              disabled={tx.busy || meme.fees_creator === 0n}
              onClick={async () => {
                if (await tx.send(calls.claimFees(w.address!, meme.id), `claim_fees $${meme.symbol}`)) onDone();
              }}
            >
              cobrar
            </button>
          </span>
        </div>
      )}
      <div className="err">{tx.error}</div>
      <TxLog log={tx.log} />
    </div>
  );
}
