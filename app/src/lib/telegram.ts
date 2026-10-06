// Hooks' Telegram bot: it never holds keys. It reads the launchpad and answers with links that
// open the app, where the user signs. Server-only: the token lives in TELEGRAM_BOT_TOKEN.
import type { Meme } from "./chain";
import { pairById } from "./config";
import { gradProgress, pricePair, SUPPLY } from "./curve";
import { bondUsd, type Rates } from "./rates";
import { compact, fmt, fromUnits, usd } from "./units";

const API = (method: string) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

/** The app's public origin, for links. */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export interface Button {
  text: string;
  url: string;
}

export async function send(chatId: string | number, html: string, buttons: Button[][] = []) {
  const res = await fetch(API("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: buttons.length > 0 },
      reply_markup: buttons.length ? { inline_keyboard: buttons } : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Telegram respondió ${res.status}: ${await res.text()}`);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** One meme as a message: ticker, market cap, backing and progress, plus buy links. */
export function memeCard(m: Meme, rates: Rates | null): { html: string; buttons: Button[][] } {
  const pair = pairById(m.pair);
  const pairUsd = pair ? bondUsd(rates, pair.symbol, pair.currency, pair.usd0) : 0;
  const mcap = pricePair(m) * pairUsd * SUPPLY;
  const state = m.pool ? "graduada, se opera en Soroswap" : `${fmt(gradProgress(m), 1)}% de la curva vendida`;
  const html = [
    `<b>$${esc(m.symbol)}</b> · ${esc(m.name)}`,
    m.pool ? `Market cap ${usd(mcap, 0)}` : `Market cap ${usd(mcap, 0)} · reserva ${compact(fromUnits(m.real_pair))} ${pair?.symbol ?? ""}`,
    pair ? `Respaldada por ${pair.symbol}, ${pair.label}` : "",
    state,
  ]
    .filter(Boolean)
    .join("\n");
  const page = `${SITE}/m/${m.token}`;
  const buttons = m.pool
    ? [[{ text: "Ver en Hooks", url: page }]]
    : [[10, 50, 100].map((d) => ({ text: `Comprar $${d}`, url: `${page}?buy=${d}` })), [{ text: "Ver en Hooks", url: page }]];
  return { html, buttons };
}
