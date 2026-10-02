// Display-only NVDA price for the tNVDA pair. Cached for a minute; never used on-chain.
const FALLBACK = 182;

export async function GET() {
  try {
    const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/NVDA?interval=1d&range=1d", {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 60 },
    });
    const json = await res.json();
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (typeof price === "number" && price > 0) return Response.json({ price, source: "yahoo" });
  } catch {}
  return Response.json({ price: FALLBACK, source: "fallback" });
}
