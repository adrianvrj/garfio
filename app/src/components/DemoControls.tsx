"use client";

import { useSearchParams } from "next/navigation";
import { usePrices } from "@/lib/prices";
import { fmt, usd } from "@/lib/units";

/** Visible with ?demo=1. Moves only what the screen shows: the curve never changes. */
export function DemoControls() {
  const demo = useSearchParams().get("demo") === "1";
  const p = usePrices();
  if (!demo) return null;
  return (
    <aside className="demo" aria-label="Mover el mundo real">
      <b style={{ color: "var(--warn)" }}>Demo · mover el mundo real</b>
      <div className="row">
        <button className="btn sm" onClick={() => p.advance(30)}>+30 días</button>
        <button className="btn sm" onClick={() => p.advance(365)}>+1 año</button>
      </div>
      <div className="num small ink2">
        Día {fmt(p.days(), 0)} · tCETES {usd(p.usd("tCETES"), 4)} · tUSTRY {usd(p.usd("tUSTRY"), 4)}
      </div>
      <label className="field">
        <span>
          NVDA <b className="num">{usd(p.nvda)}</b>
          {p.nvdaLive && <span className="muted"> · real {usd(p.nvdaLive)}</span>}
        </span>
        <input
          type="range"
          min={90}
          max={300}
          step={1}
          value={Math.round(p.nvda)}
          onChange={(e) => p.setNvdaOverride(Number(e.target.value))}
        />
      </label>
      <p className="muted small">Solo cambia el valor en USD del par. La curva on-chain no se mueve.</p>
    </aside>
  );
}
