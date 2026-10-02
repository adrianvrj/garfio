"use client";

import { useRouter } from "next/navigation";
import { useMemes, useValuation } from "@/hooks/useMarket";
import { gradProgress } from "@/lib/curve";
import { compact, fmt, tiny, usd } from "@/lib/units";
import { fromUnits } from "@/lib/units";

export default function Market() {
  const router = useRouter();
  const { data: memes, error } = useMemes();
  const value = useValuation();

  const rows = (memes ?? [])
    .map((m) => ({ m, v: value(m) }))
    .sort((a, b) => b.v.mcapUsd - a.v.mcapUsd);
  const locked = rows.reduce((s, { m, v }) => s + fromUnits(m.real_pair) * v.pairUsd, 0);

  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">Stellar testnet · launchpad</div>
          <h1>Memecoins<br />respaldadas por RWAs</h1>
          <p>
            Cada memecoin guarda su reserva en un activo real tokenizado (CETES, tesoro de EE. UU. o NVDA), no en XLM.
            Si el activo rinde, la meme sube con él.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="eyebrow">Valor en RWAs bloqueado</div>
          <div className="display" style={{ fontSize: 48 }}>{usd(locked, 0)}</div>
          <div className="eyebrow">{rows.length} memecoins</div>
        </div>
      </section>

      <div className="tblwrap">
        <table>
          <thead>
            <tr>
              <th>Meme</th>
              <th>Par</th>
              <th className="r">Precio USD</th>
              <th className="r">Market cap</th>
              <th className="r">Reserva</th>
              <th>Graduación</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, v }) => {
              const g = gradProgress(m);
              return (
                <tr key={m.id} onClick={() => router.push(`/m/${m.id}`)}>
                  <td>
                    <a className="tk" href={`/m/${m.id}`} onClick={(e) => e.preventDefault()}>${m.symbol}</a>{" "}
                    <span className="muted">{m.name}</span>
                  </td>
                  <td><span className="tag">{v.pair?.symbol}</span></td>
                  <td className="r num">${tiny(v.priceUsd)}</td>
                  <td className="r num">{usd(v.mcapUsd, 0)}</td>
                  <td className="r num">{compact(fromUnits(m.real_pair))} {v.pair?.symbol}</td>
                  <td className="num">
                    <span className="minibar"><i style={{ width: `${g}%` }} /></span>
                    {m.graduated ? "graduada" : fmt(g, 0) + "%"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!memes && !error && <div className="empty">Leyendo el contrato…</div>}
        {memes && !rows.length && <div className="empty">Todavía no hay memecoins. Crea la primera.</div>}
        {error && <div className="empty err">No pude leer el RPC: {error}</div>}
      </div>
    </>
  );
}
