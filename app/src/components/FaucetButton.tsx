"use client";

import { IS_MAINNET, type PairInfo } from "@/lib/config";
import { useT } from "@/i18n/client";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { openDeposit } from "./DepositModal";

/** Opens the deposit dialog on `pair`. Testnet only: on mainnet bonds come from Etherfuse itself. */
export function FaucetButton({ pair }: { pair: PairInfo }) {
  const w = useWallet();
  const t = useT();
  if (!w.address || IS_MAINNET) return null;
  return (
    <button className="btn sm" onClick={() => openDeposit(pair.symbol)}>
      {t.common.addDeposit}
    </button>
  );
}
