"use client";

import { fetchClaimable, type Meme } from "@/lib/chain";
import type { PairInfo } from "@/lib/config";
import { usePrices } from "@/lib/prices";
import { fmt, fromUnits, usd } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useDividendTx } from "@/hooks/useDividends";
import { usePoll } from "@/hooks/usePoll";
import { TxLog } from "./TxLink";

/**
 * The meme's dividends: every trade on its curve pays part of its fee to whoever held the meme
 * before it, by balance, in the meme's bond. Each holder claims their part whenever they like.
 */
export function DividendPanel({ meme, pair, onDone }: { meme: Meme; pair: PairInfo; onDone: () => void }) {
  const w = useWallet();
  const { tx, claim } = useDividendTx();
  const pairUsd = usePrices().usd(pair.symbol);
  const mine = usePoll(w.address ? () => fetchClaimable(meme.id, w.address!) : null, 10_000, `${meme.id}|${w.address}|${meme.dividends}`);
  const owed = mine.data ?? 0n;

  async function onClaim() {
    if (await claim(meme, owed)) {
      mine.refresh();
      onDone();
    }
  }

  return (
    <div className="panel stack">
      <div className="between">
        <h3>Dividendos</h3>
        <span className="num">{fmt(fromUnits(meme.dividends), pair.decimals)} {pair.symbol} repartidos</span>
      </div>
      <p className="small ink2">
        Cada compra y venta en la curva paga parte de su fee a quienes ya tenían ${meme.symbol}, según cuánto tenían, en{" "}
        {pair.symbol}.
      </p>
      {w.address && (
        <div className="between">
          <span>Te toca</span>
          <span className="num">
            {fmt(fromUnits(owed), pair.decimals)} {pair.symbol}
            {owed > 0n && <span className="muted"> · {usd(fromUnits(owed) * pairUsd)}</span>}
          </span>
        </div>
      )}
      {w.address && owed > 0n && (
        <button className="btn block" onClick={onClaim} disabled={tx.busy}>
          {tx.busy ? "Firmando…" : `Cobrar ${pair.symbol}`}
        </button>
      )}
      <div className="err" role="status">{tx.error}</div>
      <TxLog log={tx.log} />
    </div>
  );
}
