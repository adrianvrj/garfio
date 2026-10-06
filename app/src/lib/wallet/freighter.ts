import { Asset, Contract, Operation, TransactionBuilder, BASE_FEE, rpc, xdr } from "@stellar/stellar-sdk";
import { FRIENDBOT_URL, IS_MAINNET, NETWORK_PASSPHRASE } from "../config";
import { server, type Call } from "../chain";

// Loaded on first use: the kit restyles <html> on import, which breaks hydration.
let kit: Promise<typeof import("@creit.tech/stellar-wallets-kit/sdk").StellarWalletsKit> | null = null;
function load() {
  kit ??= Promise.all([
    import("@creit.tech/stellar-wallets-kit/sdk"),
    import("@creit.tech/stellar-wallets-kit/modules/utils"),
    import("@creit.tech/stellar-wallets-kit/types"),
  ]).then(([{ StellarWalletsKit }, { defaultModules }, { Networks }]) => {
    StellarWalletsKit.init({ modules: defaultModules(), network: IS_MAINNET ? Networks.PUBLIC : Networks.TESTNET });
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

/** Creates the account with Friendbot if it does not exist yet (testnet only). */
async function ensureAccount(address: string) {
  try {
    return await server.getAccount(address);
  } catch {
    if (IS_MAINNET) throw new Error("Tu cuenta todavía no existe en mainnet: necesita XLM.");
    await fetch(`${FRIENDBOT_URL}?addr=${address}`);
    return await server.getAccount(address);
  }
}

/** Builds one operation, prepares it, signs with the selected wallet and submits. Returns the tx hash. */
async function submit(address: string, operation: xdr.Operation): Promise<string> {
  const StellarWalletsKit = await load();
  const account = await ensureAccount(address);
  const built = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(operation)
    .setTimeout(60)
    .build();
  // Contract calls need simulation for their footprint and fees; the RPC rejects classic operations.
  const isCall = operation.body().switch() === xdr.OperationType.invokeHostFunction();
  const prepared = isCall ? await server.prepareTransaction(built) : built;
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

export const invoke = (address: string, call: Call) =>
  submit(address, new Contract(call.contractId).call(call.method, ...call.args));

/** Opens a trustline to a classic asset (`CODE:ISSUER`). The account pays its own reserve. */
export function addTrustline(address: string, asset: string) {
  const [code, issuer] = asset.split(":");
  return submit(address, Operation.changeTrust({ asset: new Asset(code, issuer) }));
}
