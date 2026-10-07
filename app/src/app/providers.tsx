"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/locales";
import { PriceProvider } from "@/lib/prices";
import { WalletProvider } from "@/lib/wallet/WalletProvider";

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <I18nProvider locale={locale}>
      <PriceProvider>
        <WalletProvider>{children}</WalletProvider>
      </PriceProvider>
    </I18nProvider>
  );
}
