"use client";

import type { ReactNode } from "react";
import { PriceProvider } from "@/lib/prices";
import { WalletProvider } from "@/lib/wallet/WalletProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PriceProvider>
      <WalletProvider>{children}</WalletProvider>
    </PriceProvider>
  );
}
