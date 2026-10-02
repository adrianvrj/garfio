"use client";

import { useEffect, useRef } from "react";
import { compact } from "@/lib/units";

/** Market cap line in USD, drawn like the blueprint's canvas chart. */
export function Chart({ points }: { points: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const draw = () => {
      const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (!w) return;
      cv.width = w * dpr;
      cv.height = h * dpr;
      const g = cv.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const d = points.length === 1 ? [points[0], points[0]] : points.slice(-160);
      if (!d.length) return;
      const lo = Math.min(...d);
      const hi = Math.max(...d);
      const pad = 16;
      const R = 64;
      const x = (i: number) => (i / Math.max(d.length - 1, 1)) * (w - R);
      const y = (v: number) => pad + (1 - (v - lo) / (hi - lo || 1)) * (h - pad * 2);
      g.strokeStyle = css("--line");
      g.lineWidth = 1;
      g.font = "10px " + css("--mono");
      g.fillStyle = css("--muted");
      for (let k = 0; k <= 3; k++) {
        const v = lo + ((hi - lo) * k) / 3;
        const yy = y(v);
        g.beginPath();
        g.moveTo(0, yy);
        g.lineTo(w - R, yy);
        g.stroke();
        g.fillText("$" + compact(v), w - R + 6, yy + 3);
      }
      const fg = css("--fg");
      const path = () => {
        g.beginPath();
        d.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
      };
      path();
      g.lineTo(x(d.length - 1), h);
      g.lineTo(0, h);
      g.closePath();
      g.globalAlpha = 0.08;
      g.fillStyle = fg;
      g.fill();
      g.globalAlpha = 1;
      path();
      g.strokeStyle = fg;
      g.lineWidth = 1.6;
      g.stroke();
      g.beginPath();
      g.arc(x(d.length - 1), y(d[d.length - 1]), 3.5, 0, Math.PI * 2);
      g.fill();
    };
    draw();
    window.addEventListener("resize", draw);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", draw);
    return () => {
      window.removeEventListener("resize", draw);
      mq.removeEventListener("change", draw);
    };
  }, [points]);

  return <canvas ref={ref} className="chart" role="img" aria-label="Market cap en USD" />;
}
