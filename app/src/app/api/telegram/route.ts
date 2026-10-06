// Telegram webhook for the bot. Telegram sends TELEGRAM_WEBHOOK_SECRET back in a header, so only
// it can call this. Commands: /top (king of the hill), /nuevas, /meme <ticker>.
import { fetchMemes } from "@/lib/chain";
import { gradProgress } from "@/lib/curve";
import { getRates } from "@/lib/rates";
import { memeCard, send, SITE } from "@/lib/telegram";

interface Update {
  message?: { chat: { id: number }; text?: string };
}

const HELP = [
  "Memecoins respaldadas por bonos soberanos tokenizados, en Stellar.",
  "",
  "/top · la más cerca de graduar",
  "/nuevas · las últimas cinco",
  "/meme TICKER · una en particular",
].join("\n");

export async function POST(request: Request) {
  if (request.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  const { message }: Update = await request.json();
  const text = message?.text?.trim();
  if (!message || !text?.startsWith("/")) return new Response("ok");
  const chat = message.chat.id;
  const [command, arg] = text.split(/\s+/, 2);

  try {
    if (command === "/start" || command === "/help") {
      await send(chat, HELP, [[{ text: "Abrir Hooks", url: SITE }]]);
      return new Response("ok");
    }
    const [memes, rates] = await Promise.all([fetchMemes(), getRates().catch(() => null)]);
    if (command === "/top") {
      const king = memes.filter((m) => !m.graduated).sort((a, b) => gradProgress(b) - gradProgress(a))[0];
      if (!king) await send(chat, "Todavía no hay memes en curva.");
      else {
        const { html, buttons } = memeCard(king, rates);
        await send(chat, `👑 Rey de la colina\n\n${html}`, buttons);
      }
    } else if (command === "/nuevas") {
      const latest = [...memes].sort((a, b) => Number(b.created_at - a.created_at)).slice(0, 5);
      if (!latest.length) await send(chat, "Todavía no hay memes.");
      for (const m of latest) {
        const { html, buttons } = memeCard(m, rates);
        await send(chat, html, buttons);
      }
    } else if (command.startsWith("/meme")) {
      const sym = (arg ?? "").replace(/^\$/, "").toUpperCase();
      const m = memes.find((x) => x.symbol.toUpperCase() === sym);
      if (!m) await send(chat, sym ? `No encontré $${sym}.` : "Escribe /meme TICKER, por ejemplo /meme TACO.");
      else {
        const { html, buttons } = memeCard(m, rates);
        await send(chat, html, buttons);
      }
    } else {
      await send(chat, HELP);
    }
  } catch {
    await send(chat, "No pude leer el launchpad. Intenta en un momento.").catch(() => {});
  }
  return new Response("ok");
}
