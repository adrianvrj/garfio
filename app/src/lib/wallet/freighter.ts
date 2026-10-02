import { Contract, TransactionBuilder, BASE_FEE, rpc } from "@stellar/stellar-sdk";
import { FRIENDBOT_URL, NETWORK_PASSPHRASE } from "../config";
import { server, type Call } from "../chain";

// Loaded on first use: the kit restyles <html> on import, which breaks hydration.
let kit: Promise<typeof import("@creit.tech/stellar-wallets-kit/sdk").StellarWalletsKit> | null = null;
function load() {
  kit ??= Promise.all([
    import("@creit.tech/stellar-wallets-kit/sdk"),
    import("@creit.tech/stellar-wallets-kit/modules/utils"),
    import("@creit.tech/stellar-wallets-kit/types"),
  ]).then(([{ StellarWalletsKit }, { defaultModules }, { Networks }]) => {
    StellarWalletsKit.init({ modules: defaultModules(), network: Networks.TESTNET });
    return StellarWalletsKit;
  });
  return kit;
}

export async function connect(): Promise<string> {
  const { address } = await (await load()).authModal();
  return address;
}

export async function disconnect() {
  if (kit) await (await kit).disconnect();
}

/** Creates the account with Friendbot if it does not exist yet. */
async function ensureAccount(address: string) {
  try {
    return await server.getAccount(address);
  } catch {
    await fetch(`${FRIENDBOT_URL}?addr=${address}`);
    return await server.getAccount(address);
  }
}

/** Builds, simulates, signs with the selected wallet and submits. Returns the tx hash. */
export async function invoke(address: string, call: Call): Promise<string> {
  const StellarWalletsKit = await load();
  const account = await ensureAccount(address);
  const built = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(new Contract(call.contractId).call(call.method, ...call.args))
    .setTimeout(60)
    .build();
  const prepared = await server.prepareTransaction(built);
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  const sent = await server.sendTransaction(TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE));
  if (sent.status === "ERROR") throw new Error("La red rechazó la transacción.");
  const done = await server.pollTransaction(sent.hash, { attempts: 30 });
  if (done.status !== rpc.Api.GetTransactionStatus.SUCCESS) throw new Error("La transacción falló on-chain.");
  return sent.hash;
}
