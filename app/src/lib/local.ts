"use client";

import { useSyncExternalStore } from "react";

/** A JSON value kept in this browser's localStorage, shared by every component that reads it. */
export function localStore<T>(key: string, initial: T) {
  const listeners = new Set<() => void>();
  let cache: T | undefined;

  function get(): T {
    if (cache === undefined) {
      cache = initial;
      try {
        const raw = localStorage.getItem(key);
        if (raw) cache = JSON.parse(raw) as T;
      } catch {}
    }
    return cache;
  }

  function set(value: T) {
    cache = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
    listeners.forEach((l) => l());
  }

  function subscribe(l: () => void) {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = undefined;
        l();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  }

  const useValue = () => useSyncExternalStore(subscribe, get, () => initial);
  return { get, set, useValue };
}
