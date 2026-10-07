// The share card for a meme: what shows when its link is pasted in X, Telegram or WhatsApp.
import { ImageResponse } from "next/og";
import { fetchMeme, fetchPool } from "@/lib/chain";
import { pairById } from "@/lib/config";
import { gradProgress, pricePair, SUPPLY } from "@/lib/curve";
import { bondUsd, getRates } from "@/lib/rates";
import { compact, fmt, fromUnits, usd } from "@/lib/units";
import { getDict } from "@/i18n/server";

export const alt = "The Hooks Daily";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [m, rates, t] = await Promise.all([fetchMeme(id), getRates().catch(() => null), getDict()]);
  const pair = pairById(m.pair);
  const pairUsd = pair ? bondUsd(rates, pair.symbol, pair.currency, pair.usd0) : 0;
  const pool = m.pool ? await fetchPool(m) : null;
  const reserve = pool ? pool.pairAmt : m.real_pair;
  const price = pool ? Number(pool.pairAmt) / Number(pool.memeAmt) : pricePair(m);
  const progress = m.graduated ? 100 : gradProgress(m);
  const rate = pair && rates?.bonds[pair.symbol]?.rateBps;

  const stat = (k: string, v: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 24, color: "#675f55", textTransform: "uppercase", letterSpacing: 2 }}>{k}</span>
      <span style={{ fontSize: 44, fontWeight: 700 }}>{v}</span>
    </div>
  );

  const ink = "#161412";
  const paper = "#f2ede4";
  const red = "#c9261b";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: paper, color: ink, padding: 48, gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "center", background: red, borderTop: `8px solid ${ink}`, borderBottom: `8px solid ${ink}`, padding: "8px 0" }}>
          <span style={{ fontSize: 64, fontWeight: 900, color: paper, fontStyle: "italic", letterSpacing: 2 }}>THE HOOKS DAILY</span>
        </div>
        <span style={{ fontSize: 24, fontWeight: 700, color: red, textTransform: "uppercase", letterSpacing: 3 }}>
          {pair ? t.og.backedBy(pair.symbol, t.pairLabel[pair.symbol] ?? t.pairLabel.other) : "Memecoin"}
        </span>
        <span style={{ fontSize: 132, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>${m.symbol}</span>
        <span style={{ fontSize: 36, fontStyle: "italic" }}>{m.name}</span>
        <div style={{ display: "flex", gap: 64, borderTop: `4px solid ${ink}`, paddingTop: 16, marginTop: "auto" }}>
          {stat(t.common.marketCap, usd(price * pairUsd * SUPPLY, 0))}
          {stat(t.og.reserve, `${compact(fromUnits(reserve))} ${pair?.symbol ?? ""}`)}
          {rate ? stat(t.og.yields, t.og.perYear(fmt(rate / 100, 2))) : null}
          {stat(t.og.curve, m.pool ? t.common.graduated : `${fmt(progress, 1)}%`)}
        </div>
      </div>
    ),
    size,
  );
}
