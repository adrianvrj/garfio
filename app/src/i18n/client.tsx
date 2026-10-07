"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DICTS, TAGS, type Locale } from "./locales";

const Ctx = createContext<Locale>("en");

/** The server picks the locale from the request, so the first render and hydration agree. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Ctx value={locale}>{children}</Ctx>;
}

export const useT = () => DICTS[useContext(Ctx)];
/** The BCP 47 tag, for dates. */
export const useLocaleTag = () => TAGS[useContext(Ctx)];
