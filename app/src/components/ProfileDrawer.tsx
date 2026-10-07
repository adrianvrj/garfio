"use client";

import { artSeed } from "@/lib/avatar";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { calls } from "@/lib/chain";
import { PAIRS } from "@/lib/config";
import { imageToDataUrl, saveProfile, useProfile } from "@/lib/profile";
import { usePrices } from "@/lib/prices";
import { compact, fmt, fromUnits, pct, short, usd } from "@/lib/units";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { createSpring, prefersReducedMotion, project, rubberband, type Spring } from "@/lib/spring";
import { useListedPairs } from "@/hooks/useListedPairs";
import { useBalances, useMemes, usePositions, useValuation } from "@/hooks/useMarket";
import { useTx } from "@/hooks/useTx";
import { TokenArt, UserAvatar } from "./Art";
import { FaucetButton } from "./FaucetButton";
import { TxLog } from "./TxLink";

const OPEN = { damping: 1, response: 0.35 };

/**
 * Drives the drawer's offset with a spring: enters from the right, leaves the same way,
 * follows a horizontal swipe 1:1 and can be grabbed again mid-flight.
 */
function useSwipeDrawer(onClosed: () => void) {
  const panel = useRef<HTMLElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const spring = useRef<Spring>(null);
  const closed = useRef(onClosed);
  useLayoutEffect(() => {
    closed.current = onClosed;
  });

  const closing = useRef(false);
  const close = useCallback(() => {
    // Asked again while leaving (a second Escape, a scrim tap): leave now.
    if (closing.current || !spring.current) return void (spring.current?.stop(), closed.current());
    closing.current = true;
    const w = panel.current?.offsetWidth ?? 400;
    spring.current.to(w, { ...OPEN, onRest: () => closed.current() });
  }, []);

  useLayoutEffect(() => {
    const el = panel.current!;
    const reduce = prefersReducedMotion();
    const apply = (x: number) => {
      const p = Math.min(1, Math.max(0, x / el.offsetWidth));
      // Reduced motion: the same spring cross-fades instead of sliding.
      if (reduce) el.style.opacity = String(1 - p);
      else el.style.transform = `translateX(${x}px)`;
      if (scrim.current) scrim.current.style.opacity = String(1 - p);
    };
    const s = createSpring(el.offsetWidth, apply);
    spring.current = s;
    apply(s.value);
    s.to(0, OPEN);

    let drag: { id: number; x0: number; y0: number; start: number; active: boolean; hist: { t: number; x: number }[] } | null = null;

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || (e.target as Element).closest("input, textarea")) return;
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, start: s.value, active: false, hist: [] };
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      const dy = e.clientY - drag.y0;
      if (!drag.active) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return void (drag = null);
        if (Math.abs(dx) < 10) return;
        drag.active = true;
        drag.x0 = e.clientX;
        drag.start = s.value;
        el.setPointerCapture(e.pointerId);
      }
      const raw = drag.start + (e.clientX - drag.x0);
      const x = raw < 0 ? -rubberband(-raw, el.offsetWidth) : raw;
      s.set(x);
      const t = e.timeStamp;
      drag.hist = [...drag.hist.filter((h) => t - h.t < 100), { t, x }];
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { active, hist } = drag;
      drag = null;
      if (!active) return;
      // A swipe is not a tap: swallow the click that follows it.
      el.addEventListener("click", (c) => (c.preventDefault(), c.stopPropagation()), { capture: true, once: true });
      const a = hist[0];
      const b = hist[hist.length - 1];
      const v = e.type === "pointerup" && b.t > a.t ? ((b.x - a.x) / (b.t - a.t)) * 1000 : 0;
      const w = el.offsetWidth;
      if (s.value + project(v) > w / 2) s.to(w, { ...OPEN, velocity: v, onRest: () => closed.current() });
      else {
        // Grabbed mid-exit and pulled back in: it is open again.
        closing.current = false;
        s.to(0, { ...OPEN, velocity: v });
      }
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      s.stop();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);

  return { panel, scrim, close };
}

/** Wallet profile: local name, bio and picture, plus balances, holdings and created coins. */
export function ProfileDrawer({ address, onClose: onClosed }: { address: string; onClose: () => void }) {
  const w = useWallet();
  const profile = useProfile(address);
  const memes = useMemes();
  const value = useValuation();
  const prices = usePrices();
  const balances = useBalances(address);
  const listed = useListedPairs();
  const positions = usePositions(address, memes.data ?? []);
  const tx = useTx();
  const [copied, setCopied] = useState(false);
  const [imgErr, setImgErr] = useState("");
  const { panel, scrim, close: onClose } = useSwipeDrawer(onClosed);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, panel]);

  const holdings = (positions.data ?? [])
    .map((h) => ({ ...h, v: value(h.m) }))
    .sort((a, b) => b.value * b.v.pairUsd - a.value * a.v.pairUsd);
  const created = (memes.data ?? []).filter((m) => m.creator === address);
  const portfolio =
    holdings.reduce((s, h) => s + h.value * h.v.pairUsd, 0) +
    PAIRS.reduce((s, p) => s + fromUnits(balances.data?.[p.id] ?? 0n) * prices.usd(p.symbol), 0);
  const pnl = holdings.reduce((s, h) => s + (h.realized + (h.unrealized ?? 0)) * h.v.pairUsd, 0);

  return (
    <>
      <div className="drawer-bg" ref={scrim} onClick={onClose} />
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
          <span className="num" style={{ fontSize: "1.625rem" }}>{balances.data && positions.data ? usd(portfolio) : "…"}</span>
          {positions.data && holdings.length > 0 && (
            <span className="small">
              P&L en memes <span className={`num ${pnl >= 0 ? "buy" : "sell"}`}>{usd(pnl)}</span>
              <span className="muted"> · en USD al tipo de cambio de hoy</span>
            </span>
          )}
        </div>

        <Link href="/dividends" className="btn block" onClick={onClose}>Ver tus dividendos</Link>

        <div className="stack" style={{ gap: 6 }}>
          <span className="section-title">Bonos</span>
          <div className="list">
            {PAIRS.filter((p) => listed.includes(p) || (balances.data?.[p.id] ?? 0n) > 0n).map((p) => (
              <div key={p.id}>
                <span className="row">
                  <b>{p.symbol}</b>
                  <span className="muted small">{p.name}</span>
                </span>
                <span className="row">
                  <span className="num">{balances.data ? fmt(fromUnits(balances.data[p.id] ?? 0n), p.decimals) : "…"}</span>
                  <FaucetButton pair={p} />
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <span className="section-title">Tus memes</span>
          {holdings.length ? (
            <div className="list">
              {holdings.map(({ m, bal, v, value, unrealized, cost, realized, sellAll }) => {
                const p = v.pair;
                // P&L, signed, in the meme's pair
                const bond = (n: number) => `${n >= 0 ? "+" : ""}${fmt(n, p?.decimals ?? 2)} ${p?.symbol}`;
                return (
                  <Link key={m.id} href={`/m/${m.id}`} onClick={onClose} style={{ alignItems: "flex-start" }}>
                    <span className="row">
                      <TokenArt seed={artSeed(m)} size={32} />
                      <span>
                        <b>${m.symbol}</b>
                        <span className="muted small" style={{ display: "block" }}>{compact(fromUnits(bal))}</span>
                      </span>
                    </span>
                    <span className="stack small" style={{ gap: 2, textAlign: "right" }}>
                      <span className="num">{usd(value * v.pairUsd)}</span>
                      {unrealized !== null ? (
                        <span className={`num ${unrealized >= 0 ? "buy" : "sell"}`}>
                          {bond(unrealized)} {cost > 0 && `(${pct((unrealized / cost) * 100)})`}
                        </span>
                      ) : (
                        bal > 0n && <span className="muted">sin costo conocido</span>
                      )}
                      {realized !== 0 && <span className="muted num">realizado {bond(realized)}</span>}
                      {sellAll && (
                        <span className="muted num">
                          si vendes todo ~{fmt(sellAll.out, p?.decimals ?? 2)} {p?.symbol}
                          {sellAll.pnl !== null && ` (${bond(sellAll.pnl)})`}
                        </span>
                      )}
                      {m.graduated && <span className="muted">en Soroswap: esos trades no cuentan aquí</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="muted small">Todavía no tienes memes. Consigue un bono y compra la primera.</p>
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
