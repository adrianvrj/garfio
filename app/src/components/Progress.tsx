import type { CSSProperties } from "react";

/** Fill animates on the compositor (scaleX), not width. `value` is 0–100. */
export function Progress({ value, label, style }: { value: number; label?: string; style?: CSSProperties }) {
  return (
    <div className="progress" style={style} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <i style={{ "--p": Math.min(1, Math.max(0, value / 100)) } as CSSProperties} />
    </div>
  );
}
