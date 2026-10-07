import type { Dict } from "@/i18n/es";

/** An error our own code throws, by key, so `explain` can say it in the reader's language. */
export class Oops extends Error {
  constructor(readonly key: keyof Dict["errors"]["app"]) {
    super(key);
  }
}

/** Turns RPC / wallet errors into a short message in the reader's language. */
export function explain(err: unknown, t: Dict): string {
  const e = t.errors;
  if (err instanceof Oops) return e.app[err.key];
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/Error\(Contract, #(\d+)\)/);
  if (m) {
    const code = Number(m[1]);
    // #10 is the SEP-41 InsufficientBalance raised by the token contracts (OZ #100 too)
    if (code === 100 || code === 10) return e.contract[10];
    if (code === 5) return e.slippage;
    // Soroswap's router: the pool paid less than the minimum, or the swap's deadline passed.
    if (code === 407 || code === 507) return e.slippage;
    if (code === 403 || code === 503) return e.timeout;
    return e.contract[code] ?? e.contractOther(code);
  }
  if (/rejected|declined|denied|cancel/i.test(msg)) return e.cancelled;
  if (/policy does not allow/i.test(msg)) return e.policy;
  return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
}
