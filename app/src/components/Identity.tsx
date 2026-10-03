"use client";

import { useProfile } from "@/lib/profile";
import { short } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { UserAvatar } from "./Art";

/** Avatar + display name for any address. Local profile when one exists, else a short address. */
export function Identity({ address, size = 18, strong = false }: { address: string; size?: number; strong?: boolean }) {
  const p = useProfile(address);
  const { address: me } = useWallet();
  const label = p.name || short(address);
  return (
    <span className="row" style={{ gap: 6, display: "inline-flex", minWidth: 0 }} title={address}>
      <UserAvatar address={address} image={p.image} size={size} />
      <span style={{ fontWeight: strong ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
        {me === address && <span className="muted"> (tú)</span>}
      </span>
    </span>
  );
}
