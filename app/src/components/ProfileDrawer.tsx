"use client";

import { artSeed } from "@/lib/avatar";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { calls } from "@/lib/chain";
import { PAIRS } from "@/lib/config";
import { imageToDataUrl, saveProfile, useProfile } from "@/lib/profile";
import { usePrices } from "@/lib/prices";
import { compact, fmt, fromUnits, short, usd } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useBalances, useMemes, useValuation } from "@/hooks/useMarket";
import { useTx } from "@/hooks/useTx";
import { TokenArt, UserAvatar } from "./Art";
import { TxLog } from "./TxLink";

/** Wallet profile: local name, bio and picture, plus balances, holdings and created coins. */
export function ProfileDrawer({ onClose }: { onClose: () => void }) {
  const w = useWallet();
  const address = w.address!;
  const profile = useProfile(address);
  const memes = useMemes();
  const value = useValuation();
  const prices = usePrices();
  const ids = (memes.data ?? []).map((m) => m.id);
  const balances = useBalances(address, ids);
  const tx = useTx();
  const [copied, setCopied] = useState(false);
  const [imgErr, setImgErr] = useState("");
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const holdings = (memes.data ?? [])
    .map((m) => ({ m, bal: balances.data?.[m.id] ?? 0n, v: value(m) }))
    .filter((h) => h.bal > 0n)
    .sort((a, b) => fromUnits(b.bal) * b.v.priceUsd - fromUnits(a.bal) * a.v.priceUsd);
  const created = (memes.data ?? []).filter((m) => m.creator === address);
  const portfolio =
    holdings.reduce((s, h) => s + fromUnits(h.bal) * h.v.priceUsd, 0) +
    PAIRS.reduce((s, p) => s + fromUnits(balances.data?.[p.id] ?? 0n) * prices.usd(p.symbol), 0);

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Tu perfil" ref={panel} tabIndex={-1}>
        <div className="between">
          <span className="section-title">Tu perfil</span>
          <button className="btn ghost sm" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
          <label className="avatar-edit" title="Cambiar foto">
            <UserAvatar address={address} image={profile.image} size={88} />
            <span>Cambiar</span>
            <input
              id="avatar-file"
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setImgErr("");
                try {
                  saveProfile(address, { image: await imageToDataUrl(f) });
                } catch {
                  setImgErr("No pude leer esa imagen.");
                }
              }}
            />
          </label>
          <div className="stack" style={{ gap: 8, flex: 1, minWidth: 0 }}>
            <input
              className="input"
              placeholder="Tu nombre"
              maxLength={24}
              defaultValue={profile.name}
              onBlur={(e) => saveProfile(address, { name: e.target.value.trim() })}
              aria-label="Nombre"
            />
            <div className="row small">
              <button
                className="copy"
                onClick={() => {
                  navigator.clipboard?.writeText(address);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}
              >
                {copied ? "copiada ✓" : short(address)}
              </button>
              <span className="muted">{w.kind === "cavos" ? "Cavos" : "Freighter"}</span>
              {profile.image ? (
                <button className="copy" onClick={() => saveProfile(address, { image: null })}>quitar foto</button>
              ) : (
                <label htmlFor="avatar-file" className="copy">subir foto</label>
              )}
            </div>
          </div>
        </div>
        <textarea
          className="input"
          placeholder="Bio: qué memes te gustan, a qué le apuestas…"
          maxLength={160}
          defaultValue={profile.bio}
          onBlur={(e) => saveProfile(address, { bio: e.target.value.trim() })}
          aria-label="Bio"
        />
        {imgErr && <div className="err">{imgErr}</div>}
        <p className="muted small">Tu perfil vive solo en este navegador.</p>

        <div className="stack" style={{ gap: 4 }}>
          <span className="section-title">Valor en memes y bonos</span>
          <span className="num" style={{ fontSize: 26 }}>{balances.data ? usd(portfolio) : "…"}</span>
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <span className="section-title">RWAs de prueba</span>
          <div className="list">
            {PAIRS.map((p) => (
              <div key={p.id}>
                <span className="row">
                  <b>{p.symbol}</b>
                  <span className="muted small">{p.name}</span>
                </span>
                <span className="row">
                  <span className="num">{balances.data ? fmt(fromUnits(balances.data[p.id] ?? 0n), p.decimals) : "…"}</span>
                  <button
                    className="btn sm"
                    disabled={tx.busy}
                    onClick={async () => {
                      if (await tx.send(calls.faucet(p.id, address), `faucet · +${p.faucet} ${p.symbol}`)) balances.refresh();
                    }}
                  >
                    + faucet
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <span className="section-title">Tus memes</span>
          {holdings.length ? (
            <div className="list">
              {holdings.map(({ m, bal, v }) => (
                <Link key={m.id} href={`/m/${m.id}`} onClick={onClose}>
                  <span className="row">
                    <TokenArt seed={artSeed(m)} size={32} />
                    <span>
                      <b>${m.symbol}</b>
                      <span className="muted small" style={{ display: "block" }}>{compact(fromUnits(bal))}</span>
                    </span>
                  </span>
                  <span className="num">{usd(fromUnits(bal) * v.priceUsd)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted small">Todavía no tienes memes. Pide RWAs al faucet y compra la primera.</p>
          )}
        </div>

        {created.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            <span className="section-title">Creadas por ti</span>
            <div className="list">
              {created.map((m) => {
                const pair = PAIRS.find((p) => p.id === m.pair);
                return (
                  <div key={m.id}>
                    <Link href={`/m/${m.id}`} onClick={onClose} className="row">
                      <TokenArt seed={artSeed(m)} size={32} />
                      <b>${m.symbol}</b>
                    </Link>
                    <span className="row">
                      <span className="num small">
                        {fmt(fromUnits(m.fees_creator), pair?.decimals ?? 2)} {pair?.symbol}
                      </span>
                      <button
                        className="btn sm"
                        disabled={tx.busy || m.fees_creator === 0n}
                        onClick={async () => {
                          if (await tx.send(calls.claimFees(address, m.id), `cobraste fees de $${m.symbol}`)) {
                            memes.refresh();
                            balances.refresh();
                          }
                        }}
                      >
                        cobrar
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="err">{tx.error}</div>
        <TxLog log={tx.log} />

        <button
          className="btn block"
          onClick={async () => {
            await w.disconnect();
            onClose();
          }}
        >
          Desconectar
        </button>
      </aside>
    </>
  );
}
