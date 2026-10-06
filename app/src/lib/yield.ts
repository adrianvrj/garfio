// What a reserve held in a bond earns. The bond's price (NAV) rises with its rate every day; the
// curve trades in bond units and never sees it, so this is the reserve's yield in the bond's
// currency, at today's NAV and rate.
import type { TradePoint } from "./events";
import { fromUnits } from "./units";

const DAY_MS = 86_400_000;

/** Currency the bond pays in, per day, for `units` base units of it. */
export const dailyYield = (units: bigint, nav: number, rateBps: number) =>
  (fromUnits(units) * nav * rateBps) / 10_000 / 365;

/**
 * Currency earned since the meme was created: the reserve after each trade, held until the next
 * one, and the current reserve from the last trade until `now`. A graduated meme's reserve sits in
 * its pool, so `current` is the pool's.
 */
export function accrued(trades: TradePoint[], current: bigint, now: number, nav: number, rateBps: number) {
  let unitDays = 0;
  for (let i = 0; i < trades.length; i++) {
    const until = i + 1 < trades.length ? trades[i + 1].at : now;
    const held = i + 1 < trades.length ? trades[i].realPair : current;
    unitDays += (fromUnits(held) * Math.max(0, until - trades[i].at)) / DAY_MS;
  }
  return (unitDays * nav * rateBps) / 10_000 / 365;
}
