"use client";

import { localStore } from "./local";

/** Starred memes. Lives in this browser, like the profile. */
const store = localStore<string[]>("garfio-favorites", []);

export const useFavorites = store.useValue;

export function toggleFavorite(id: string) {
  const ids = store.get();
  store.set(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
}
