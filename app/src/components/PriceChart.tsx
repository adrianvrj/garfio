"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { autoInterval, INTERVALS, toCandles, type Tick } from "@/lib/candles";
import { compact } from "@/lib/units";

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
/** `#rrggbb` at `alpha` opacity. The chart parses plain colors only, not color-mix(). */
const fade = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};
const usd = (v: number) => "$" + compact(v);
const date = (t: Time) => new Date((t as number) * 1000);
const hhmm = (t: Time) => date(t).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

/** Chart colors and fonts from the page's theme tokens, so it follows light and dark. */
function themed() {
  const ink = css("--ink");
  const line = css("--line");
  return {
    chart: {
      layout: {
        background: { type: ColorType.Solid, color: css("--bg") },
        textColor: css("--muted"),
        fontFamily: `${css("--font-jetbrains")}, ui-monospace, monospace`,
      },
      grid: { vertLines: { color: line }, horzLines: { color: line } },
      rightPriceScale: { borderColor: line },
      timeScale: { borderColor: line },
      crosshair: { vertLine: { labelBackgroundColor: ink }, horzLine: { labelBackgroundColor: ink } },
    },
    candles: {
      upColor: css("--up"),
      downColor: css("--down"),
      wickUpColor: css("--up"),
      wickDownColor: css("--down"),
      borderVisible: false,
    },
    volume: { color: fade(css("--muted"), 0.35) },
  };
}

/** Market cap candles in USD with volume, drawn with TradingView's Lightweight Charts. */
export function PriceChart({ ticks, open }: { ticks: Tick[]; open: number }) {
  const box = useRef<HTMLDivElement>(null);
  const api = useRef<{ chart: IChartApi; candles: ISeriesApi<"Candlestick">; volume: ISeriesApi<"Histogram"> }>(null);
  const fitted = useRef(0);
  const [picked, setPicked] = useState<number | null>(null);
  const interval = picked ?? autoInterval(ticks);

  useEffect(() => {
    const chart = createChart(box.current!, {
      autoSize: true,
      localization: {
        locale: "es-MX",
        priceFormatter: usd,
        timeFormatter: (t: Time) => date(t).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      },
      timeScale: {
        timeVisible: true,
        tickMarkFormatter: (t: Time, type: TickMarkType) =>
          type >= TickMarkType.Time ? hhmm(t) : date(t).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
      },
    });
    const candles = chart.addSeries(CandlestickSeries, { priceFormat: { type: "custom", formatter: usd, minMove: 0.01 } });
    candles.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.25 } });
    // Volume shares the pane on its own hidden scale, in the bottom fifth.
    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "custom", formatter: usd },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    const paint = () => {
      const t = themed();
      chart.applyOptions(t.chart);
      candles.applyOptions(t.candles);
      volume.applyOptions(t.volume);
    };
    paint();
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", paint);
    const attr = new MutationObserver(paint);
    attr.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    api.current = { chart, candles, volume };
    return () => {
      scheme.removeEventListener("change", paint);
      attr.disconnect();
      chart.remove();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    const a = api.current;
    if (!a) return;
    const data = toCandles(ticks, interval, open);
    a.candles.setData(data.map(({ time, open, high, low, close }) => ({ time: time as UTCTimestamp, open, high, low, close })));
    a.volume.setData(data.map(({ time, volume }) => ({ time: time as UTCTimestamp, value: volume })));
    // Frame the data once per interval; later polls keep the user's zoom and scroll.
    if (data.length && fitted.current !== interval) {
      a.chart.timeScale().fitContent();
      fitted.current = interval;
    }
  }, [ticks, interval, open]);

  return (
    <div className="price-chart">
      <div className="chips" role="group" aria-label="Intervalo de las velas">
        {INTERVALS.map((i) => (
          <button key={i.seconds} className="chip" aria-pressed={interval === i.seconds} onClick={() => setPicked(i.seconds)}>
            {i.label}
          </button>
        ))}
      </div>
      <div ref={box} className="chart" role="img" aria-label="Velas del market cap en USD" />
      {!ticks.length && <p className="muted small">Sin trades todavía: la primera vela aparece con la primera compra.</p>}
    </div>
  );
}
