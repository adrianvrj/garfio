"use client";

import { useEffect, useState } from "react";

/**
 * A photo about a meme's name: the lead image of the Wikipedia article its name finds
 * ($TACO → tacos, $AJOLOTE → an axolotl), Spanish first, then English, then any photo on
 * Wikimedia Commons. Stands in until creators can upload their own image.
 */

/** Launchpad filler words that never name the thing ("Ajolote Inu" is about the ajolote). */
const FILLER = /\b(coin|token|inu|cash|classic|finance|protocol|swap|dao|meme|the|on|stellar)\b/gi;

const clean = (name: string) => name.replace(FILLER, "").replace(/\s+/g, " ").trim();

type Page = { index?: number; thumbnail?: { source: string }; imageinfo?: { thumburl?: string }[] };

async function query(host: string, params: string): Promise<Page[]> {
  const res = await fetch(`https://${host}/w/api.php?action=query&format=json&origin=*&${params}`);
  if (!res.ok) throw new Error(`${host} ${res.status}`);
  const pages = Object.values((await res.json())?.query?.pages ?? {}) as Page[];
  return pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
}

/** The best-ranked of the top ten articles that has a lead image (the first is often a disambiguation page). */
async function article(lang: string, q: string) {
  const pages = await query(
    `${lang}.wikipedia.org`,
    `generator=search&gsrlimit=10&gsrsearch=${encodeURIComponent(q)}&prop=pageimages&piprop=thumbnail&pithumbsize=640&pilimit=10`,
  );
  return pages.find((p) => p.thumbnail)?.thumbnail?.source ?? null;
}

/** Any photo on Wikimedia Commons about the words: for names no article covers. */
async function commons(q: string) {
  const pages = await query(
    "commons.wikimedia.org",
    `generator=search&gsrnamespace=6&gsrlimit=5&gsrsearch=${encodeURIComponent(`${q} filetype:bitmap`)}&prop=imageinfo&iiprop=url&iiurlwidth=640`,
  );
  return pages.find((p) => p.imageinfo?.[0]?.thumburl)?.imageinfo?.[0]?.thumburl ?? null;
}

async function lookup(symbol: string, name: string): Promise<string | null> {
  const terms = [...new Set([clean(name), name.trim(), symbol].filter(Boolean))];
  const sources = [(q: string) => article("es", q), (q: string) => article("en", q), commons];
  for (const find of sources) {
    for (const q of terms) {
      const hit = await find(q);
      if (hit) return hit;
    }
  }
  return null;
}

// One lookup per name per page load; found photos are also kept per browser so revisits don't wait.
const inflight = new Map<string, Promise<string | null>>();
const STORE = "garfio-art2:";
function stored(key: string): string | null | undefined {
  try {
    const v = localStorage.getItem(STORE + key);
    return v === null ? undefined : v || null;
  } catch {
    return undefined;
  }
}

function resolve(key: string, symbol: string, name: string) {
  let p = inflight.get(key);
  if (!p) {
    p = lookup(symbol, name)
      .then((src) => {
        try {
          localStorage.setItem(STORE + key, src ?? "");
        } catch {}
        return src;
      })
      .catch(() => {
        inflight.delete(key); // a network error may pass; let the next mount retry
        return null;
      });
    inflight.set(key, p);
  }
  return p;
}

/** The photo for a meme's name: `undefined` while looking, `null` when nothing was found. */
export function useMemeArt(symbol: string, name: string): string | null | undefined {
  const key = `${symbol.toUpperCase()}:${name.trim().toLowerCase()}`;
  const [found, setFound] = useState<{ key: string; src: string | null } | null>(null);

  useEffect(() => {
    if (!name.trim()) return;
    let live = true;
    // Read after mount, so the server and the first client render agree.
    const cached = stored(key);
    if (cached !== undefined) {
      queueMicrotask(() => live && setFound({ key, src: cached }));
      return () => void (live = false);
    }
    // Debounced, so typing a name on /create looks up the name, not every letter of it.
    const t = setTimeout(() => resolve(key, symbol, name).then((src) => live && setFound({ key, src })), 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [key, symbol, name]);

  return found?.key === key ? found.src : undefined;
}
