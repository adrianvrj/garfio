export const SLIPPAGE_ERROR = "El precio se movió más que tu slippage. Súbelo e intenta de nuevo.";

const CONTRACT_ERRORS: Record<number, string> = {
  1: "Ese par no está permitido.",
  3: "Esa memecoin no existe.",
  4: "Cantidad inválida.",
  5: SLIPPAGE_ERROR,
  6: "Esta memecoin ya se graduó: ahora se opera en Soroswap.",
  7: "Solo el creador puede cobrar estas fees.",
  8: "Nombre (1–32) o ticker (1–12) inválido.",
  9: "No hay fees por cobrar.",
  10: "No te alcanza el saldo.",
  11: "La curva todavía no se vende completa.",
  12: "El pool en Soroswap ya está abierto.",
  15: "Esta memecoin todavía no tiene pool en Soroswap.",
  16: "El vault de recompra está vacío.",
  // From Stellar asset contracts (CETES), not the launchpad.
  13: "Tu cuenta todavía no acepta este token: falta la trustline.",
  14: "A tu cuenta le falta XLM para la reserva de la trustline.",
};

/** Turns RPC / wallet errors into a short Spanish message. */
export function explain(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/Error\(Contract, #(\d+)\)/);
  if (m) {
    const code = Number(m[1]);
    // #10 is the SEP-41 InsufficientBalance raised by the token contracts (OZ #100 too)
    if (code === 100 || code === 10) return CONTRACT_ERRORS[10];
    // Soroswap's router: the pool paid less than the minimum, or the swap's deadline passed.
    if (code === 407 || code === 507) return SLIPPAGE_ERROR;
    if (code === 403 || code === 503) return "La operación tardó demasiado en firmarse. Intenta de nuevo.";
    return CONTRACT_ERRORS[code] ?? `Error del contrato #${code}.`;
  }
  if (/rejected|declined|denied|cancel/i.test(msg)) return "Cancelaste la transacción.";
  if (/policy does not allow/i.test(msg)) return "La política de la app en Cavos no permite esta transacción.";
  return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
}
