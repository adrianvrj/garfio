"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs `fn` now and every `ms`; `refresh()` forces a reload (e.g. after a tx).
 * `key` identifies what is being polled: results for an older key are dropped.
 * Pass `fn = null` to stop polling.
 */
export function usePoll<T>(fn: (() => Promise<T>) | null, ms: number, key = "") {
  const [state, setState] = useState<{ key: string; data: T | null; error: string | null }>({
    key,
    data: null,
    error: null,
  });
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  const refresh = useCallback(async () => {
    const f = fnRef.current;
    if (!f) return;
    try {
      const data = await f();
      setState({ key, data, error: null });
    } catch (e) {
      setState((s) => ({ key, data: s.key === key ? s.data : null, error: e instanceof Error ? e.message : String(e) }));
    }
  }, [key]);

  const enabled = fn !== null;
  useEffect(() => {
    if (!enabled) return;
    refresh();
    const t = setInterval(refresh, ms);
    return () => clearInterval(t);
  }, [ms, refresh, enabled]);

  const current = enabled && state.key === key;
  const data = current ? state.data : null;
  const error = current ? state.error : null;
  return { data, error, refresh, loading: enabled && data === null && error === null };
}
