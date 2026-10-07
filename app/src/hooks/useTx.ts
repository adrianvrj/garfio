"use client";

import { useState } from "react";
import type { Call } from "@/lib/chain";
import { useT } from "@/i18n/client";
import { explain } from "@/lib/errors";
import { useWallet } from "@/lib/wallet/WalletProvider";

export interface TxLog {
  msg: string;
  hash?: string;
}

/** A tap of haptics on the same frame as the confirmation, where the device supports it. */
const buzz = (pattern: number | number[]) => navigator.vibrate?.(pattern);

/** Sends transactions and keeps a short log and the last error for the UI. */
export function useTx() {
  const w = useWallet();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState<TxLog[]>([]);

  /** Runs anything that ends in a transaction and resolves with its hash, or null on error. */
  async function run(describe: string, submit: () => Promise<string>): Promise<string | null> {
    setError("");
    setBusy(true);
    try {
      const hash = await submit();
      setLog((l) => [{ msg: describe, hash }, ...l].slice(0, 8));
      buzz(10);
      return hash;
    } catch (e) {
      setError(explain(e, t));
      buzz([20, 60, 20]);
      return null;
    } finally {
      setBusy(false);
    }
  }

  /** Signs and submits a contract call through the active wallet. */
  const send = (call: Call, describe: string) => run(describe, () => w.invoke(call));

  return { run, send, busy, error, setError, log };
}

export type Tx = ReturnType<typeof useTx>;
