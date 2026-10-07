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
 * The meme's dividends: part of what reaches its vault is paid to whoever holds the meme, by
 * balance, in the meme's bond. `distribute` hands what the launchpad holds to the token, and
 * each holder claims their part. Anyone can send either.
 */
export function DividendPanel({ meme, pair, onDone }: { meme: Meme; pair: PairInfo; onDone: () => void }) {
  const w = useWallet();
  const { tx, distribute, claim } = useDividendTx();
  const pairUsd = usePrices().usd(pair.symbol);
  const mine = usePoll(w.address ? () => fetchClaimable(meme.id, w.address!) : null, 10_000, `${meme.id}|${w.address}`);
  const owed = mine.data ?? 0n;

  async function act(send: Promise<string | null>) {
    if (await send) {
      mine.refresh();
      onDone();
    }
  }

  return (
    <div className="panel stack">
      <div className="between">
        <h3>Dividendos</h3>
        <span className="num">{fmt(fromUnits(meme.div_pending), pair.decimals)} {pair.symbol} por repartir</span>
      </div>
      <p className="small ink2">
        Parte de lo que entra al vault se reparte entre quienes tienen ${meme.symbol}, según cuánto tengan, y se paga
        en {pair.symbol}. Cualquiera puede repartir; cada quien cobra lo suyo.
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
      {w.address && meme.div_pending > 0n && (
        <button className="btn block" onClick={() => act(distribute(meme))} disabled={tx.busy}>
          {tx.busy ? "Firmando…" : "Repartir"}
        </button>
      )}
      {w.address && owed > 0n && (
        <button className="btn block" onClick={() => act(claim(meme, owed))} disabled={tx.busy}>
          {tx.busy ? "Firmando…" : `Cobrar ${pair.symbol}`}
        </button>
      )}
      <div className="err" role="status">{tx.error}</div>
      <TxLog log={tx.log} />
    </div>
  );
}
