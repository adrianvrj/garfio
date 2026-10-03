/** Deterministic visuals: no storage, everyone sees the same image. */

/** Token art seed: ticker + name, so the create form can preview the exact final image. */
export const artSeed = (m: { symbol: string; name: string }) => `${m.symbol.toUpperCase()}:${m.name.trim()}`;
