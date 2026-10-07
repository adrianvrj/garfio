// Testnet faucet: sends about $65 of a bond from our treasury account (stocked through Etherfuse's sandbox
// onramp) to whoever asks. The treasury key stays on the server, in FAUCET_SECRET.
import { BASE_FEE, Contract, Keypair, rpc, StrKey, TransactionBuilder } from "@stellar/stellar-sdk";
import { addr, balanceOf, i128, server } from "@/lib/chain";
import { faucetAmount, IS_MAINNET, NETWORK_PASSPHRASE, PAIRS } from "@/lib/config";
import { allow, clientIp } from "@/lib/rateLimit";
import { toUnits } from "@/lib/units";
import { DICTS, negotiate } from "@/i18n/locales";

/** Deposits one IP can ask for per hour: a few bonds and a retry, not a bot draining the treasury. */
const PER_IP_HOURLY = 6;
const HOUR = 3_600_000;

const fail = (status: number, error: string) => Response.json({ error }, { status });

/**
 * The bonds the treasury can still hand out, so the app offers only those. On mainnet, or with no
 * faucet configured, every bond is listed.
 */
export async function GET() {
  const secret = process.env.FAUCET_SECRET;
  if (IS_MAINNET || !secret) return Response.json({ symbols: PAIRS.map((p) => p.symbol) });
  const treasury = Keypair.fromSecret(secret).publicKey();
  const held = await Promise.all(PAIRS.map((p) => balanceOf(p.id, treasury).catch(() => 0n)));
  const symbols = PAIRS.filter((p, i) => held[i] >= toUnits(String(faucetAmount(p)))).map((p) => p.symbol);
  return Response.json({ symbols });
}

export async function POST(req: Request) {
  const secret = process.env.FAUCET_SECRET;
  // Answers in the asker's language: the deposit dialog shows these as they come.
  const t = DICTS[negotiate(req.headers.get("accept-language"))].faucet;
  if (IS_MAINNET) return fail(404, t.noFaucet);
  if (!secret) return fail(503, t.notConfigured);
  if (!allow(`faucet:${clientIp(req)}`, PER_IP_HOURLY, HOUR)) {
    return fail(429, t.tooMany);
  }
  const { address, pair: symbol } = await req.json().catch(() => ({}));
  const pair = PAIRS.find((p) => p.symbol === symbol);
  if (!pair) return fail(400, t.unknownBond);
  const amount = toUnits(String(faucetAmount(pair)));
  if (typeof address !== "string" || !(StrKey.isValidEd25519PublicKey(address) || StrKey.isValidContract(address))) {
    return fail(400, t.badAddress);
  }

  // Reading the balance also proves the account can receive the asset (it has the trustline).
  let held: bigint;
  try {
    held = await balanceOf(pair.id, address);
  } catch {
    return fail(409, t.noTrustline(pair.symbol));
  }
  if (held >= amount) return fail(429, t.enough(pair.symbol));

  const treasury = Keypair.fromSecret(secret);
  const tx = new TransactionBuilder(await server.getAccount(treasury.publicKey()), {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(new Contract(pair.id).call("transfer", addr(treasury.publicKey()), addr(address), i128(amount)))
    .setTimeout(30)
    .build();

  try {
    const prepared = await server.prepareTransaction(tx);
    prepared.sign(treasury);
    const sent = await server.sendTransaction(prepared);
    if (sent.status === "ERROR") return fail(502, t.rejected);
    const done = await server.pollTransaction(sent.hash, { attempts: 20 });
    if (done.status !== rpc.Api.GetTransactionStatus.SUCCESS) return fail(502, t.failed);
    return Response.json({ hash: sent.hash });
  } catch {
    return fail(503, t.dry(pair.symbol));
  }
}
