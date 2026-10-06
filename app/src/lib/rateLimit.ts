// A fixed-window limit per key, in this server's memory. Enough for one long-running instance
// (Railway, a VPS): it resets on restart and is not shared between instances.

const windows = new Map<string, { start: number; count: number }>();

/** True if `key` may act now, counting this call; false once it used `max` in the last `ms`. */
export function allow(key: string, max: number, ms: number, now = Date.now()): boolean {
  const w = windows.get(key);
  if (!w || now - w.start >= ms) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 10_000) {
      for (const [k, v] of windows) if (now - v.start >= ms) windows.delete(k);
    }
    return true;
  }
  if (w.count >= max) return false;
  w.count++;
  return true;
}

/** The caller's IP behind the platform's proxy, or "unknown". */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
