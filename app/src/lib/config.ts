import { Networks } from "@stellar/stellar-sdk";
import deployments from "@/contracts/deployments.json";

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";
export const EXPLORER = "https://stellar.expert/explorer/testnet";
export const CAVOS_APP_ID = process.env.NEXT_PUBLIC_CAVOS_APP_ID ?? "";
/** Cavos console environment: origins and gas pool are configured per environment. */
export const CAVOS_ENV: "development" | "production" =
  process.env.NEXT_PUBLIC_CAVOS_ENV === "development" ? "development" : "production";

export const LAUNCHPAD_ID = deployments.launchpad;
export const DEPLOYED_AT = Date.parse(deployments.deployed_at);

export type PairSymbol = keyof typeof deployments.pairs;

export interface PairInfo {
  symbol: PairSymbol;
  id: string;
  label: string;
  /** Faucet amount per call, for the UI copy. */
  faucet: number;
  /** Quick-buy chips in pair units. */
  quick: string[];
  decimals: number;
}

const META: Record<PairSymbol, Omit<PairInfo, "symbol" | "id">> = {
  tCETES: { label: "bonos MX · rinde ~7% anual", faucet: 1000, quick: ["10", "100", "500"], decimals: 2 },
  tUSTRY: { label: "tesoro EE. UU. · rinde ~4% anual", faucet: 1000, quick: ["10", "100", "500"], decimals: 2 },
  tNVDA: { label: "sigue a la acción de NVIDIA", faucet: 5, quick: ["0.1", "0.5", "2"], decimals: 4 },
};

export const PAIRS: PairInfo[] = (Object.keys(deployments.pairs) as PairSymbol[]).map((symbol) => ({
  symbol,
  id: deployments.pairs[symbol].id,
  ...META[symbol],
}));

export function pairById(id: string): PairInfo | undefined {
  return PAIRS.find((p) => p.id === id);
}

export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const contractUrl = (id: string) => `${EXPLORER}/contract/${id}`;
