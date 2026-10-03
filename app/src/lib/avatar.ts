/** Deterministic visuals from an address or ticker: no storage, everyone sees the same art. */

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small PRNG so one seed yields a stable sequence of values. */
export function rng(seed: string) {
  let x = hash(seed) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 10_000) / 10_000;
  };
}

export const FACES = ["🐸", "🐶", "🐱", "🦊", "🐵", "🐼", "🐯", "🦁", "🐷", "🐙", "🦄", "🐳", "🦖", "🌮", "🌶️", "🥑", "🚀", "💎", "🔥", "👽", "🤖", "🦅", "🐝", "🍄"];

/** Token art seed: ticker + name, so the create form can preview the exact final image. */
export const artSeed = (m: { symbol: string; name: string }) => `${m.symbol.toUpperCase()}:${m.name.trim()}`;
