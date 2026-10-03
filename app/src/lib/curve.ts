import type { Curve } from "@/contracts/launchpad";
import { fromUnits } from "./units";

export const SUPPLY = 1_000_000_000;
export const FOR_SALE = 800_000_000;
export const FEE = 0.01;

/** Meme price in pair units. */
export const pricePair = (c: Pick<Curve, "v_pair" | "v_token">) => Number(c.v_pair) / Number(c.v_token);

export const gradProgress = (c: Curve) => Math.min(100, (fromUnits(c.sold) / FOR_SALE) * 100);

const V_TOKEN0 = 1_073_000_000;

/** Real pair reserve once all FOR_SALE tokens are sold (mirrors the contract's grad_target). */
export const gradTarget = (vPair0: bigint) => {
  const v0 = fromUnits(vPair0);
  return (v0 * V_TOKEN0) / (V_TOKEN0 - FOR_SALE) - v0;
};
