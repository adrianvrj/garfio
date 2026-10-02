const CONTRACT_ERRORS: Record<number, string> = {
  1: "Ese par no está permitido.",
  3: "Esa memecoin no existe.",
  4: "Cantidad inválida.",
  5: "El precio se movió (slippage). Intenta de nuevo.",
  6: "Esta memecoin ya se graduó: la curva vendió sus 800M.",
  7: "Solo el creador puede cobrar estas fees.",
  8: "Nombre (1–32) o ticker (1–12) inválido.",
  9: "No hay fees por cobrar.",
  10: "No te alcanza el saldo. Usa el faucet.",
};

/** Turns RPC / wallet errors into a short Spanish message. */
export function explain(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/Error\(Contract, #(\d+)\)/);
  if (m) {
    const code = Number(m[1]);
    // #10 is the SEP-41 InsufficientBalance raised by the token contracts (OZ #100 too)
    if (code === 100 || code === 10) return CONTRACT_ERRORS[10];
    return CONTRACT_ERRORS[code] ?? `Error del contrato #${code}.`;
  }
  if (/rejected|declined|denied|cancel/i.test(msg)) return "Cancelaste la transacción.";
  if (/policy does not allow/i.test(msg)) return "La política de la app en Cavos no permite esta transacción.";
  return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
}
