import { Networks } from "@stellar/stellar-sdk";
import testnet from "@/contracts/deployments.testnet.json";
import mainnet from "@/contracts/deployments.mainnet.json";

/** The network the app runs against: testnet unless NEXT_PUBLIC_NETWORK says mainnet. */
export const NETWORK: "testnet" | "mainnet" = process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? "mainnet" : "testnet";
export const IS_MAINNET = NETWORK === "mainnet";

type Deployment = typeof testnet;

/** Mainnet's file stays empty until `NET=mainnet ./scripts/deploy.sh` fills it. */
const deployments = (IS_MAINNET ? mainnet : testnet) as Deployment;
if (IS_MAINNET && !deployments.launchpad) {
  throw new Error("deployments.mainnet.json está vacío: corre NET=mainnet ./scripts/deploy.sh");
}

const NETS = {
  testnet: {
    passphrase: Networks.TESTNET,
    rpc: "https://soroban-testnet.stellar.org",
    horizon: "https://horizon-testnet.stellar.org",
    explorer: "https://stellar.expert/explorer/testnet",
    mercury: "https://testnet.mercurydata.app/rest",
  },
  mainnet: {
    passphrase: Networks.PUBLIC,
    // There is no public mainnet RPC from SDF: set NEXT_PUBLIC_RPC_URL to a provider's.
    rpc: "",
    horizon: "https://horizon.stellar.org",
    explorer: "https://stellar.expert/explorer/public",
    mercury: "https://mainnet.mercurydata.app/rest",
  },
}[NETWORK];

export const NETWORK_PASSPHRASE = NETS.passphrase;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || NETS.rpc;
if (!RPC_URL) throw new Error("En mainnet hace falta NEXT_PUBLIC_RPC_URL.");
export const FRIENDBOT_URL = "https://friendbot.stellar.org";
export const HORIZON_URL = NETS.horizon;
export const EXPLORER = NETS.explorer;
export const MERCURY_URL = NETS.mercury;
export const CAVOS_APP_ID = process.env.NEXT_PUBLIC_CAVOS_APP_ID ?? "";
/** Cavos console environment: origins and gas pool are configured per environment. */
export const CAVOS_ENV: "development" | "production" =
  process.env.NEXT_PUBLIC_CAVOS_ENV === "development" ? "development" : "production";

export const LAUNCHPAD_ID = deployments.launchpad;
/** Soroswap's router, through which the app trades graduated memes against their pool. */
export const AMM_ROUTER = deployments.amm_router;
/** Whoever can replace the launchpad's code (`upgrade`). */
export const ADMIN = deployments.admin;

export type PairSymbol = keyof Deployment["pairs"];

export interface PairInfo {
  /** Etherfuse's symbol for the stablebond, e.g. CETES. */
  symbol: PairSymbol;
  id: string;
  /** Classic asset as `CODE:ISSUER`; `id` is its Stellar Asset Contract. */
  asset: string;
  name: string;
  /** Currency the bond's NAV is quoted in. */
  currency: string;
  /** USD per unit when deployed, used until the live price loads. */
  usd0: number;
  /** Virtual starting reserve of the curve, in base units. */
  vPair0: bigint;
  /** What launching a meme on it costs, in base units. It seeds the meme's vault. */
  createFee: bigint;
  decimals: number;
}

/** Names for every Etherfuse bond we know, whether or not this deployment allows it. Whose debt
 * each one is lives in the dictionaries (`pairLabel`). */
const NAMES: Partial<Record<string, string>> = { CETES: "CETES", TESOURO: "Tesouro", USTRY: "US Treasury" };

/** Every allowed pair: Etherfuse stablebonds. */
export const PAIRS: PairInfo[] = (Object.keys(deployments.pairs) as PairSymbol[]).map((symbol) => {
  const d = deployments.pairs[symbol];
  return {
    symbol,
    id: d.id,
    asset: d.asset,
    currency: d.currency,
    usd0: d.usd,
    vPair0: BigInt(d.v_pair0),
    createFee: BigInt(d.create_fee),
    decimals: 2,
    name: NAMES[symbol] ?? symbol,
  };
});

/** Dollars our testnet faucet sends per request, in each bond. */
export const FAUCET_USD = 65;

/** Whole tokens of `pair` the faucet sends: FAUCET_USD at the deploy-time price. */
export const faucetAmount = (pair: PairInfo) => Math.round(FAUCET_USD / pair.usd0);

export function pairById(id: string): PairInfo | undefined {
  return PAIRS.find((p) => p.id === id);
}

export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const contractUrl = (id: string) => `${EXPLORER}/contract/${id}`;
export const accountUrl = (id: string) => `${EXPLORER}/account/${id}`;
