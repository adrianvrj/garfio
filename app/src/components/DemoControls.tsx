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
      <div className="eyebrow">Mover el mundo real · demo</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className="btn" onClick={() => p.advance(30)}>+30 días</button>
        <button className="btn" onClick={() => p.advance(365)}>+1 año</button>
      </div>
      <div className="num" style={{ fontSize: 12 }}>
        Día {fmt(p.days(), 0)} · tCETES {usd(p.usd("tCETES"), 4)} · tUSTRY {usd(p.usd("tUSTRY"), 4)}
      </div>
      <label className="f">
        <span>
          NVDA <span style={{ color: "var(--fg)" }}>{usd(p.nvda)}</span>
          {p.nvdaLive && <> · real {usd(p.nvdaLive)}</>}
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
      <p className="muted" style={{ fontSize: 12, margin: 0 }}>
        Solo cambia el valor en USD del par. La curva y las reservas on-chain no se mueven.
      </p>
    </aside>
  );
}
