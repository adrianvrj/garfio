"use client";

import { balanceOf, calls, fetchClaimable, fetchTotalShares, hasTrustline, type Meme } from "@/lib/chain";
import { pairById } from "@/lib/config";
import { fmt, fromUnits } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { usePoll } from "./usePoll";
import { useTx } from "./useTx";

export interface Dividend {
  m: Meme;
  /** Memes the holder has now: their share. */
  bal: bigint;
  /** Bond the holder can claim now. */
  owed: bigint;
  /** Their part of what the launchpad holds for the meme's holders and has not distributed yet. */
  pending: bigint;
}

/** `address`'s dividends in each meme they hold or have something to claim from. */
export function useDividends(address: string | null, memes: Meme[]) {
  return usePoll(
    address
      ? async () => {
          const rows = await Promise.all(
            memes.map(async (m): Promise<Dividend | null> => {
              const [bal, owed, shares] = await Promise.all([
                balanceOf(m.id, address),
                fetchClaimable(m.id, address),
                m.div_pending > 0n ? fetchTotalShares(m.id) : 0n,
              ]);
              const pending = shares > 0n ? (m.div_pending * bal) / shares : 0n;
              return bal > 0n || owed > 0n ? { m, bal, owed, pending } : null;
            }),
          );
          return rows.filter((r) => r !== null);
        }
      : null,
    15_000,
    `${address}|${memes.map((m) => `${m.id}:${m.div_pending}`).join(",")}`,
  );
}

/** Distributes a meme's dividends and claims them, opening the bond's trustline first if needed. */
export function useDividendTx() {
  const w = useWallet();
  const tx = useTx();

  const distribute = (m: Meme) => tx.send(calls.distribute(m.id), `repartiste dividendos de $${m.symbol}`);

  async function claim(m: Meme, owed: bigint) {
    const pair = pairById(m.pair);
    if (!w.address || !pair) return null;
    const holder = w.address;
    try {
      if (!(await hasTrustline(holder, pair.asset))) {
        if (!(await tx.run(`tu wallet acepta ${pair.symbol}`, () => w.addTrustline(pair.asset)))) return null;
      }
    } catch {
      tx.setError("No pude revisar tu cuenta. Intenta de nuevo.");
      return null;
    }
    const amount = fmt(fromUnits(owed), pair.decimals);
    return tx.send(calls.claim(m.id, holder), `cobraste ${amount} ${pair.symbol} de $${m.symbol}`);
  }

  return { tx, distribute, claim };
}
