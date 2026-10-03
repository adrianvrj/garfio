export const DECIMALS = 7;
const SCALE = 10_000_000n;

/** "1.5" → 15000000n. Throws on malformed input. */
export function toUnits(value: string): bigint {
  const v = value.trim().replace(/,/g, "");
  if (!/^\d*\.?\d*$/.test(v) || v === "" || v === ".") throw new Error("Cantidad inválida");
  const [int, frac = ""] = v.split(".");
  return BigInt(int || "0") * SCALE + BigInt((frac + "0".repeat(DECIMALS)).slice(0, DECIMALS));
}

export const fromUnits = (v: bigint): number => Number(v) / Number(SCALE);

export const fmt = (n: number, d = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const usd = (n: number, d = 2) => (n < 0 ? "-$" : "$") + fmt(Math.abs(n), d);

export const compact = (n: number) =>
  n >= 1e9 ? fmt(n / 1e9, 2) + "B" : n >= 1e6 ? fmt(n / 1e6, 2) + "M" : n >= 1e3 ? fmt(n / 1e3, 1) + "K" : fmt(n, 0);

export const tiny = (p: number) => (p > 0 && p < 0.001 ? p.toExponential(3) : fmt(p, 6));

export const pct = (v: number) => (v >= 0 ? "+" : "") + fmt(v, 1) + "%";

export const short = (a: string) => a.slice(0, 4) + "…" + a.slice(-4);

/** "hace 3 min" style relative time. */
export function ago(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `hace ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}
