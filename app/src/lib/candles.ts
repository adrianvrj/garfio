/** One trade, valued in USD: the market cap it left the curve at and the dollars it moved. */
export interface Tick {
  /** Unix ms. */
  at: number;
  mcap: number;
  volume: number;
}

export interface Candle {
  /** Bucket start, Unix seconds. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Candle sizes offered, in seconds. */
export const INTERVALS = [
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "15m", seconds: 900 },
  { label: "1h", seconds: 3_600 },
  { label: "4h", seconds: 14_400 },
] as const;

/** The smallest interval that fits the span in about `max` candles. */
export function autoInterval(ticks: Tick[], max = 120): number {
  const span = ticks.length ? (ticks[ticks.length - 1].at - ticks[0].at) / 1000 : 0;
  return (INTERVALS.find((i) => span / i.seconds <= max) ?? INTERVALS[INTERVALS.length - 1]).seconds;
}

/**
 * Groups ticks (oldest first) into OHLC candles of `interval` seconds. Each candle opens
 * where the previous one closed, the first at `open`, so the series has no jumps.
 */
export function toCandles(ticks: Tick[], interval: number, open: number): Candle[] {
  const candles: Candle[] = [];
  let close = open;
  for (const t of ticks) {
    const time = Math.floor(t.at / 1000 / interval) * interval;
    let c = candles[candles.length - 1];
    if (!c || c.time !== time) {
      c = { time, open: close, high: close, low: close, close, volume: 0 };
      candles.push(c);
    }
    c.high = Math.max(c.high, t.mcap);
    c.low = Math.min(c.low, t.mcap);
    c.close = close = t.mcap;
    c.volume += t.volume;
  }
  return candles;
}
