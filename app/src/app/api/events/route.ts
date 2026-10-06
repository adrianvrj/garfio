// The launchpad's trades from Mercury. Without MERCURY_JWT, or if Mercury fails, this answers 503
// and the app reads the RPC instead.
import { StrKey } from "@stellar/stellar-sdk";
import { tradeToJson } from "@/lib/events";
import { mercuryTrades } from "@/lib/mercury";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function GET(request: Request) {
  const jwt = process.env.MERCURY_JWT;
  if (!jwt) return fail(503, "Mercury no está configurado.");
  const meme = new URL(request.url).searchParams.get("meme");
  if (meme && !StrKey.isValidContract(meme)) return fail(400, "Meme inválida.");
  try {
    const trades = await mercuryTrades(jwt);
    return Response.json((meme ? trades.filter((t) => t.meme === meme) : trades).map(tradeToJson));
  } catch (e) {
    return fail(503, (e as Error).message);
  }
}
