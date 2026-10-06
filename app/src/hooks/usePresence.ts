"use client";

import { useEffect, useState } from "react";

/**
 * Keeps an overlay mounted through its exit transition. `shown` flips a frame after mount so CSS
 * transitions run in both directions, and reopening mid-exit reverses from the live value.
 */
export function usePresence(open: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      let f = requestAnimationFrame(() => {
        setMounted(true);
        f = requestAnimationFrame(() => setShown(true));
      });
      return () => cancelAnimationFrame(f);
    }
    const t = setTimeout(() => {
      setMounted(false);
      setShown(false);
    }, exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);

  return { mounted: open || mounted, shown: open && shown };
}
