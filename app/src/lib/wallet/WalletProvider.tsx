"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CavosProvider, useCavos } from "@cavos/kit/react";
import { CAVOS_APP_ID } from "../config";
import type { Call } from "../chain";
import * as freighter from "./freighter";

export type WalletKind = "cavos" | "freighter";

interface Wallet {
  address: string | null;
  kind: WalletKind | null;
  /** True when a Cavos appId is configured. */
  cavosEnabled: boolean;
  connectCavos: () => void;
  connectFreighter: () => Promise<void>;
  disconnect: () => Promise<void>;
  /** Signs and submits a contract call. Resolves with the tx hash. */
  invoke: (call: Call) => Promise<string>;
}

const Ctx = createContext<Wallet | null>(null);

interface CavosBridgeState {
  address: string | null;
  openModal: () => void;
  logout: () => void;
  invoke: (call: Call) => Promise<string>;
}

/** Lives inside CavosProvider and exposes what the app needs from it. */
function CavosBridge({ onChange }: { onChange: (s: CavosBridgeState) => void }) {
  const { wallet, address, openModal, logout, walletStatus } = useCavos();

  useEffect(() => {
    onChange({
      address: walletStatus.needsDeviceApproval ? null : address,
      openModal,
      logout,
      invoke: async (call) => {
        if (!wallet || wallet.chain !== "stellar") throw new Error("Wallet de Cavos no conectada.");
        if (wallet.status === "needs-device-approval") throw new Error("Aprueba este dispositivo en Cavos.");
        // invokeContract needs an existing account; the first execute creates it (sponsored).
        if (wallet.status === "undeployed") await wallet.execute(1n, wallet.address).catch(() => {});
        return wallet.invokeContract({ contractId: call.contractId, method: call.method, args: call.args });
      },
    });
  }, [wallet, address, walletStatus.needsDeviceApproval, openModal, logout, onChange]);

  return null;
}

const STORAGE_KEY = "garfio-wallet";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<WalletKind | null>(null);
  const [freighterAddr, setFreighterAddr] = useState<string | null>(null);
  const [cavos, setCavos] = useState<CavosBridgeState | null>(null);
  // Cavos restores its own session, so it is active whenever it reports an address.
  const kind: WalletKind | null = chosen === "freighter" ? "freighter" : cavos?.address ? "cavos" : null;

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "freighter") {
        freighter.connect().then((a) => {
          setFreighterAddr(a);
          setChosen("freighter");
        }).catch(() => {});
      }
    } catch {}
  }, []);

  const connectFreighter = useCallback(async () => {
    const a = await freighter.connect();
    setFreighterAddr(a);
    setChosen("freighter");
    try {
      localStorage.setItem(STORAGE_KEY, "freighter");
    } catch {}
  }, []);

  const disconnect = useCallback(async () => {
    if (kind === "freighter") await freighter.disconnect();
    if (kind === "cavos") cavos?.logout();
    setFreighterAddr(null);
    setChosen(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [kind, cavos]);

  const address = kind === "freighter" ? freighterAddr : kind === "cavos" ? (cavos?.address ?? null) : null;

  const value = useMemo<Wallet>(
    () => ({
      address,
      kind,
      cavosEnabled: Boolean(CAVOS_APP_ID),
      connectCavos: () => cavos?.openModal(),
      connectFreighter,
      disconnect,
      invoke: (call) => {
        if (kind === "freighter" && freighterAddr) return freighter.invoke(freighterAddr, call);
        if (kind === "cavos" && cavos) return cavos.invoke(call);
        return Promise.reject(new Error("Conecta una wallet primero."));
      },
    }),
    [address, kind, freighterAddr, cavos, connectFreighter, disconnect],
  );

  const tree = <Ctx.Provider value={value}>{children}</Ctx.Provider>;
  if (!CAVOS_APP_ID) return tree;
  return (
    <CavosProvider
      config={{ appId: CAVOS_APP_ID, chains: ["stellar"], network: "testnet", appSalt: "garfio" }}
      modal={{ appName: "Garfio" }}
    >
      <CavosBridge onChange={setCavos} />
      {tree}
    </CavosProvider>
  );
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet outside WalletProvider");
  return v;
}
