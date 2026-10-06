// Mercury webhook: Mercury POSTs each `create` and `graduate` event of the launchpad here, signed
// with MERCURY_WEBHOOK_SECRET, and the bot announces it in TELEGRAM_CHANNEL_ID.
// Register it with ./scripts/telegram-setup.sh.
import { createHmac, timingSafeEqual } from "node:crypto";
import { fetchMeme } from "@/lib/chain";
import { getRates } from "@/lib/rates";
import { memeCard, send } from "@/lib/telegram";

interface Payload {
  event: { body: { v0: { topics: { symbol?: string; address?: string }[] } } };
}

function signed(body: string, signature: string | null) {
  const secret = process.env.MERCURY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  const got = Buffer.from(signature, "hex");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export async function POST(request: Request) {
  const body = await request.text();
  if (!signed(body, request.headers.get("x-mercury-signature"))) return new Response("bad signature", { status: 401 });
  const channel = process.env.TELEGRAM_CHANNEL_ID;
  if (!channel) return new Response("ok");

  const [kind, memeTopic] = (JSON.parse(body) as Payload).event.body.v0.topics;
  const meme = memeTopic?.address;
  if (!meme || (kind?.symbol !== "create" && kind?.symbol !== "graduate")) return new Response("ok");

  const [m, rates] = await Promise.all([fetchMeme(meme), getRates().catch(() => null)]);
  const { html, buttons } = memeCard(m, rates);
  const title = kind.symbol === "create" ? "🆕 Nueva meme" : "🎓 Se graduó: su liquidez pasa a Soroswap";
  await send(channel, `${title}\n\n${html}`, buttons);
  return new Response("ok");
}
