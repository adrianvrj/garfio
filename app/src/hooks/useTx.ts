"use client";

import { useState } from "react";
import type { Call } from "@/lib/chain";
import { explain } from "@/lib/errors";
import { useWallet } from "@/lib/wallet/WalletProvider";

export interface TxLog {
  msg: string;
  hash?: string;
}

/** Sends a call through the active wallet and keeps a short log for the UI. */
export function useTx() {
  const w = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState<TxLog[]>([]);

  async function send(call: Call, describe: string): Promise<string | null> {
    setError("");
    setBusy(true);
    try {
      const hash = await w.invoke(call);
      setLog((l) => [{ msg: describe, hash }, ...l].slice(0, 8));
      return hash;
    } catch (e) {
      setError(explain(e));
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { send, busy, error, setError, log };
}
