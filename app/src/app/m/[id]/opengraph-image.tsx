// The share card for a meme: what shows when its link is pasted in X, Telegram or WhatsApp.
import { ImageResponse } from "next/og";
import { fetchMeme, fetchPool } from "@/lib/chain";
import { pairById } from "@/lib/config";
import { gradProgress, pricePair, SUPPLY } from "@/lib/curve";
import { bondUsd, getRates } from "@/lib/rates";
import { compact, fmt, fromUnits, usd } from "@/lib/units";

export const alt = "Memecoin en Garfio, respaldada por un bono soberano tokenizado";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [m, rates] = await Promise.all([fetchMeme(id), getRates().catch(() => null)]);
  const pair = pairById(m.pair);
  const pairUsd = pair ? bondUsd(rates, pair.symbol, pair.currency, pair.usd0) : 0;
  const pool = m.pool ? await fetchPool(m) : null;
  const reserve = pool ? pool.pairAmt : m.real_pair;
  const price = pool ? Number(pool.pairAmt) / Number(pool.memeAmt) : pricePair(m);
  const progress = m.graduated ? 100 : gradProgress(m);
  const rate = pair && rates?.bonds[pair.symbol]?.rateBps;

  const stat = (k: string, v: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 24, color: "#5d5d5d", textTransform: "uppercase", letterSpacing: 2 }}>{k}</span>
      <span style={{ fontSize: 44, fontWeight: 700 }}>{v}</span>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#ffffff", color: "#0b0b0b" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 28, color: "#5d5d5d" }}>garfio · {pair ? `respaldada por ${pair.symbol}, ${pair.label}` : "memecoin"}</span>
          <span style={{ fontSize: 120, fontWeight: 800, lineHeight: 1 }}>${m.symbol}</span>
          <span style={{ fontSize: 40 }}>{m.name}</span>
        </div>
        <div style={{ display: "flex", gap: 72 }}>
          {stat("Market cap", usd(price * pairUsd * SUPPLY, 0))}
          {stat("Reserva", `${compact(fromUnits(reserve))} ${pair?.symbol ?? ""}`)}
          {rate ? stat("Rinde", `${fmt(rate / 100, 2)}% anual`) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 24, color: "#5d5d5d" }}>
            {m.pool ? "Graduada: liquidez bloqueada en Soroswap" : `${fmt(progress, 1)}% de la curva vendida`}
          </span>
          <div style={{ display: "flex", width: "100%", height: 20, border: "3px solid #0b0b0b" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "#0b0b0b" }} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
