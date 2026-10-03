"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { CavosProvider, useCavos } from "@cavos/kit/react";
import { CAVOS_APP_ID, CAVOS_ENV } from "../config";
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

interface CavosApi {
  openModal: () => void;
  logout: () => void;
  invoke: (call: Call) => Promise<string>;
}

/**
 * Lives inside CavosProvider. useCavos() hands back new function identities on
 * every render, so the functions go into a ref and only the address is lifted
 * as state; lifting the whole object would re-render the provider in a loop.
 */
function CavosBridge({ apiRef, onAddress }: { apiRef: RefObject<CavosApi | null>; onAddress: (a: string | null) => void }) {
  const { wallet, address, openModal, logout, walletStatus } = useCavos();
  const usable = walletStatus.needsDeviceApproval ? null : address;

  useEffect(() => {
    apiRef.current = {
      openModal,
      logout,
      invoke: async (call) => {
        if (!wallet || wallet.chain !== "stellar") throw new Error("Wallet de Cavos no conectada.");
        if (wallet.status === "needs-device-approval") throw new Error("Aprueba este dispositivo en Cavos.");
        // invokeContract needs an existing account; the first execute creates it (sponsored).
        if (wallet.status === "undeployed") await wallet.execute(1n, wallet.address).catch(() => {});
        return wallet.invokeContract({ contractId: call.contractId, method: call.method, args: call.args });
      },
    };
  });

  useEffect(() => onAddress(usable), [usable, onAddress]);

  return null;
}

const STORAGE_KEY = "garfio-wallet";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<WalletKind | null>(null);
  const [freighterAddr, setFreighterAddr] = useState<string | null>(null);
  const [cavosAddr, setCavosAddr] = useState<string | null>(null);
  const cavos = useRef<CavosApi | null>(null);
  // Cavos restores its own session, so it is active whenever it reports an address.
  const kind: WalletKind | null = chosen === "freighter" ? "freighter" : cavosAddr ? "cavos" : null;

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
    if (kind === "cavos") cavos.current?.logout();
    setFreighterAddr(null);
    setChosen(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [kind]);

  const address = kind === "freighter" ? freighterAddr : kind === "cavos" ? cavosAddr : null;

  const value = useMemo<Wallet>(
    () => ({
      address,
      kind,
      cavosEnabled: Boolean(CAVOS_APP_ID),
      connectCavos: () => cavos.current?.openModal(),
      connectFreighter,
      disconnect,
      invoke: (call) => {
        if (kind === "freighter" && freighterAddr) return freighter.invoke(freighterAddr, call);
        if (kind === "cavos" && cavos.current) return cavos.current.invoke(call);
        return Promise.reject(new Error("Conecta una wallet primero."));
      },
    }),
    [address, kind, freighterAddr, connectFreighter, disconnect],
  );

  const tree = <Ctx.Provider value={value}>{children}</Ctx.Provider>;
  if (!CAVOS_APP_ID) return tree;
  return (
    <CavosProvider
      config={{ appId: CAVOS_APP_ID, environment: CAVOS_ENV, chains: ["stellar"], network: "testnet", appSalt: "garfio" }}
      modal={{ appName: "Garfio" }}
    >
      <CavosBridge apiRef={cavos} onAddress={setCavosAddr} />
      {tree}
    </CavosProvider>
  );
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet outside WalletProvider");
  return v;
}
