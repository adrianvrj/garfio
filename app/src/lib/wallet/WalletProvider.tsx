"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CavosProvider, useCavos } from "@cavos/kit/react";
import { CAVOS_APP_ID, CAVOS_ENV, NETWORK } from "../config";
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
  /** Opens a trustline to a classic asset (`CODE:ISSUER`). Resolves with the tx hash. */
  addTrustline: (asset: string) => Promise<string>;
}

const Ctx = createContext<Wallet | null>(null);

interface CavosApi {
  openModal: () => void;
  logout: () => void;
  invoke: (call: Call) => Promise<string>;
  addTrustline: (asset: string) => Promise<string>;
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
    /** The Stellar wallet, created on-chain if needed: Cavos only acts on existing accounts. */
    const ready = async () => {
      if (!wallet || wallet.chain !== "stellar") throw new Error("Wallet de Cavos no conectada.");
      if (wallet.status === "needs-device-approval") throw new Error("Aprueba este dispositivo en Cavos.");
      // The first execute creates the account (sponsored).
      if (wallet.status === "undeployed") await wallet.execute(1n, wallet.address).catch(() => {});
      return wallet;
    };
    apiRef.current = {
      openModal,
      logout,
      // Sponsored by Cavos's relayer: the wallet holds no XLM.
      invoke: async (call) =>
        (await ready()).invokeContract({ contractId: call.contractId, method: call.method, args: call.args }),
      // Sponsored by Cavos's relayer, which also covers the trustline's reserve.
      addTrustline: async (asset) => {
        const [code, issuer] = asset.split(":");
        return (await ready()).addTrustline({ code, issuer });
      },
    };
  });

  useEffect(() => onAddress(usable), [usable, onAddress]);

  return null;
}

const STORAGE_KEY = "garfio-wallet";

/**
 * Cavos's Google login returns to the page it started on, and that URL must be registered in the
 * Cavos dashboard exactly. Only "/" is, so the login runs there and then goes back to this path.
 */
const RETURN_KEY = "garfio-login-return";
/** A return path older than this belongs to a login that was abandoned. */
const RETURN_TTL = 10 * 60_000;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<WalletKind | null>(null);
  const [freighterAddr, setFreighterAddr] = useState<string | null>(null);
  const [cavosAddr, setCavosAddr] = useState<string | null>(null);
  const cavos = useRef<CavosApi | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const pendingModal = useRef(false);
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

  // Open the Cavos modal once the redirect to "/" has landed.
  useEffect(() => {
    if (pathname !== "/" || !pendingModal.current) return;
    pendingModal.current = false;
    cavos.current?.openModal();
  }, [pathname]);

  // Back to where the login started, once Cavos reports the account.
  useEffect(() => {
    if (!cavosAddr) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) ?? "null") as { path: string; at: number } | null;
      sessionStorage.removeItem(RETURN_KEY);
      if (saved && Date.now() - saved.at < RETURN_TTL) router.replace(saved.path);
    } catch {}
  }, [cavosAddr, router]);

  const connectCavos = useCallback(() => {
    if (location.pathname === "/") return cavos.current?.openModal();
    try {
      sessionStorage.setItem(RETURN_KEY, JSON.stringify({ path: location.pathname + location.search, at: Date.now() }));
    } catch {}
    pendingModal.current = true;
    router.push("/");
  }, [router]);

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
      connectCavos,
      connectFreighter,
      disconnect,
      invoke: (call) => {
        if (kind === "freighter" && freighterAddr) return freighter.invoke(freighterAddr, call);
        if (kind === "cavos" && cavos.current) return cavos.current.invoke(call);
        return Promise.reject(new Error("Conecta una wallet primero."));
      },
      addTrustline: (asset) => {
        if (kind === "freighter" && freighterAddr) return freighter.addTrustline(freighterAddr, asset);
        if (kind === "cavos" && cavos.current) return cavos.current.addTrustline(asset);
        return Promise.reject(new Error("Conecta una wallet primero."));
      },
    }),
    [address, kind, freighterAddr, connectCavos, connectFreighter, disconnect],
  );

  const tree = <Ctx.Provider value={value}>{children}</Ctx.Provider>;
  if (!CAVOS_APP_ID) return tree;
  return (
    <CavosProvider
      config={{ appId: CAVOS_APP_ID, environment: CAVOS_ENV, chains: ["stellar"], network: NETWORK, appSalt: "garfio" }}
      modal={{ appName: "Hooks" }}
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
