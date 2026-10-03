"use client";

import { useSyncExternalStore } from "react";

/** Local-only profile per wallet address. Lives in this browser's localStorage. */
export interface Profile {
  name: string;
  bio: string;
  /** Small JPEG data URL (resized to 160px on upload). */
  image: string | null;
}

const KEY = (a: string) => `garfio-profile:${a}`;
const EMPTY: Profile = { name: "", bio: "", image: null };
const listeners = new Set<() => void>();
const cache = new Map<string, Profile>();

function read(address: string): Profile {
  if (cache.has(address)) return cache.get(address)!;
  let p = EMPTY;
  try {
    const raw = localStorage.getItem(KEY(address));
    if (raw) p = { ...EMPTY, ...JSON.parse(raw) };
  } catch {}
  cache.set(address, p);
  return p;
}

export function saveProfile(address: string, patch: Partial<Profile>) {
  const next = { ...read(address), ...patch };
  cache.set(address, next);
  try {
    localStorage.setItem(KEY(address), JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith("garfio-profile:")) {
      cache.clear();
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Profile for `address` (empty for addresses without one, or on the server). */
export function useProfile(address: string | null): Profile {
  return useSyncExternalStore(
    subscribe,
    () => (address ? read(address) : EMPTY),
    () => EMPTY,
  );
}

/** Resizes an image file to a square JPEG data URL, small enough for localStorage. */
export async function imageToDataUrl(file: File, size = 160): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas
    .getContext("2d")!
    .drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.85);
}
