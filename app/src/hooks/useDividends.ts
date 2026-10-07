"use client";

import { balanceOf, calls, fetchClaimable, hasTrustline, type Meme } from "@/lib/chain";
import { pairById } from "@/lib/config";
import { fmt, fromUnits } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { usePoll } from "./usePoll";
import { useTx } from "./useTx";

export interface Dividend {
  m: Meme;
  /** Memes the holder has now: their share of every trade's dividend from here on. */
  bal: bigint;
  /** Bond the holder can claim now. */
  owed: bigint;
}

/** `address`'s dividends in each meme they hold or have something to claim from. */
export function useDividends(address: string | null, memes: Meme[]) {
  return usePoll(
    address
      ? async () => {
          const rows = await Promise.all(
            memes.map(async (m): Promise<Dividend | null> => {
              const [bal, owed] = await Promise.all([balanceOf(m.id, address), fetchClaimable(m.id, address)]);
              return bal > 0n || owed > 0n ? { m, bal, owed } : null;
            }),
          );
          return rows.filter((r) => r !== null);
        }
      : null,
    15_000,
    // every trade pays out, so a meme's running total is enough to know when to reload
    `${address}|${memes.map((m) => `${m.id}:${m.dividends}`).join(",")}`,
  );
}

/** Claims a meme's dividends, opening the bond's trustline first if the wallet lacks it. */
export function useDividendTx() {
  const w = useWallet();
  const tx = useTx();

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

  return { tx, claim };
}
