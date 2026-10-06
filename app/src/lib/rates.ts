// Etherfuse's public pricing: USD → currency rates, and each stablebond's NAV (in its own
// currency) and annual rate. Display only: the curve trades in the pair and never reads them.
const API = "https://api.etherfuse.com/lookup";

interface TokenCost {
  token_cost_in_fiat: string;
  current_basis_points: number;
}

export interface Rates {
  fx: Record<string, number>;
  bonds: Record<string, { nav: number; rateBps: number }>;
}

export async function getRates(): Promise<Rates> {
  const [fxRes, costRes] = await Promise.all([
    fetch(`${API}/exchange_rate`, { next: { revalidate: 300 } }),
    fetch(`${API}/tokens/cost`, { next: { revalidate: 300 } }),
  ]);
  const { exchange_rates }: { exchange_rates: Record<string, string> } = await fxRes.json();
  const costs: Record<string, TokenCost> = await costRes.json();
  const fx = Object.fromEntries(
    Object.entries(exchange_rates).map(([k, v]) => [k.replace("usd_to_", "").toUpperCase(), Number(v)]),
  );
  const bonds = Object.fromEntries(
    Object.entries(costs).map(([k, c]) => [k, { nav: Number(c.token_cost_in_fiat), rateBps: c.current_basis_points }]),
  );
  return { fx, bonds };
}

/** USD per unit of a bond quoted in `currency`, or `fallback` if the rates lack it. */
export function bondUsd(rates: Rates | null, symbol: string, currency: string, fallback: number) {
  const nav = rates?.bonds[symbol]?.nav;
  const fx = rates?.fx[currency];
  return nav !== undefined && fx ? nav / fx : fallback;
}
