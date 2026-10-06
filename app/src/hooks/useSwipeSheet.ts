"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createSpring, prefersReducedMotion, project, rubberband } from "@/lib/spring";

const SETTLE = { damping: 1, response: 0.35 };

/**
 * On phones the dialogs are bottom sheets: this lets a downward swipe carry one away. It tracks
 * the finger 1:1, resists above its resting place, and on release projects the flick to decide
 * between leaving and settling back, handing the finger's velocity to the spring either way.
 * The CSS transitions still own opening and closing; the spring only runs after a drag.
 */
export function useSwipeSheet<T extends HTMLElement>(mounted: boolean, open: boolean, onDismiss: () => void, enabled = true) {
  const ref = useRef<T>(null);
  const dismiss = useRef(onDismiss);
  const can = useRef(enabled);
  const reset = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    dismiss.current = onDismiss;
    can.current = enabled;
  });

  useEffect(() => {
    const el = ref.current;
    const scrim = el?.parentElement;
    if (!mounted || !el || !scrim) return;
    const phone = matchMedia("(max-width: 640px)");

    const apply = (y: number) => {
      el.style.transform = `translateY(${y}px)`;
      scrim.style.opacity = String(1 - Math.min(1, Math.max(0, y / el.offsetHeight)));
    };
    // Back to the stylesheet: the open/close transitions take over again.
    const release = () => {
      el.style.transform = el.style.transition = scrim.style.opacity = scrim.style.transition = "";
    };
    const s = createSpring(0, apply);
    reset.current = () => (s.stop(), release());

    let drag: { id: number; y0: number; x0: number; start: number; active: boolean; hist: { t: number; y: number }[] } | null = null;

    const down = (e: PointerEvent) => {
      if (!phone.matches || prefersReducedMotion() || !can.current || e.pointerType === "mouse") return;
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, start: 0, active: false, hist: [] };
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      const dy = e.clientY - drag.y0;
      if (!drag.active) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) return void (drag = null);
        if (Math.abs(dy) < 10) return;
        drag.active = true;
        drag.y0 = e.clientY;
        // Grabbed while settling: pick it up where it is.
        drag.start = el.style.transform ? s.value : 0;
        el.style.transition = scrim.style.transition = "none";
        el.setPointerCapture(e.pointerId);
      }
      const raw = drag.start + (e.clientY - drag.y0);
      const y = raw < 0 ? -rubberband(-raw, el.offsetHeight) : raw;
      s.set(y);
      const t = e.timeStamp;
      drag.hist = [...drag.hist.filter((h) => t - h.t < 100), { t, y }];
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { active, hist } = drag;
      drag = null;
      if (!active) return;
      // A swipe is not a tap: swallow the click that follows it.
      el.addEventListener("click", (c) => (c.preventDefault(), c.stopPropagation()), { capture: true, once: true });
      const a = hist[0];
      const b = hist[hist.length - 1];
      const v = e.type === "pointerup" && b.t > a.t ? ((b.y - a.y) / (b.t - a.t)) * 1000 : 0;
      const h = el.offsetHeight;
      if (s.value + project(v) > h / 2) s.to(h, { ...SETTLE, velocity: v, onRest: () => dismiss.current() });
      else s.to(0, { ...SETTLE, velocity: v, onRest: release });
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      s.stop();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [mounted]);

  // Reopened before the swiped-away sheet unmounted: hand it back to the stylesheet.
  useEffect(() => {
    if (open) reset.current();
  }, [open]);

  return ref;
}
