"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IS_MAINNET } from "@/lib/config";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useProfile } from "@/lib/profile";
import { usePresence } from "@/hooks/usePresence";
import { explain } from "@/lib/errors";
import { short } from "@/lib/units";
import { UserAvatar } from "./Art";
import { DepositModal, openDeposit } from "./DepositModal";
import { ProfileDrawer } from "./ProfileDrawer";

export function Header() {
  const router = useRouter();
  const params = useSearchParams();
  const w = useWallet();
  const profile = useProfile(w.address);
  const [login, setLogin] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [err, setErr] = useState("");
  const loginView = usePresence(login, 220);
  const trigger = useRef<HTMLButtonElement>(null);
  const bar = useRef<HTMLElement>(null);

  // Hides on scroll down and returns on scroll up (only phones style it). 6px of hysteresis
  // keeps a finger's jitter from flickering it.
  useEffect(() => {
    let last = scrollY;
    const onScroll = () => {
      const dy = scrollY - last;
      if (Math.abs(dy) < 6) return;
      bar.current?.toggleAttribute("data-hidden", dy > 0 && scrollY > 120);
      last = scrollY;
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!login) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLogin(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [login]);

  // The dialog grows out of the button that opened it.
  const anchor = (el: HTMLDivElement | null) => {
    const b = trigger.current?.getBoundingClientRect();
    if (!el || !b) return;
    const r = el.getBoundingClientRect();
    el.style.transformOrigin = `${b.left + b.width / 2 - r.left}px ${b.top + b.height / 2 - r.top}px`;
  };

  return (
    <header className="header" ref={bar}>
      <div className="header-inner">
        <Link href="/" className="logo">garfio</Link>

        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get("q")?.toString().trim();
            router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            key={params.get("q") ?? ""}
            name="q"
            className="input"
            placeholder="Buscar memes por nombre o ticker"
            defaultValue={params.get("q") ?? ""}
            aria-label="Buscar"
          />
        </form>

        <div className="header-actions">
          {w.address && !IS_MAINNET && (
            <button className="btn" onClick={() => openDeposit()}>Depositar</button>
          )}
          <Link href="/create" className="btn primary">Crear moneda</Link>
          {w.address ? (
            <button className="wallet-chip" onClick={() => setDrawer(true)} aria-label="Abrir perfil">
              <UserAvatar address={w.address} image={profile.image} size={28} />
              <span className="hide-sm">{profile.name || short(w.address)}</span>
            </button>
          ) : (
            <button className="btn" ref={trigger} onClick={() => setLogin(true)}>Entrar</button>
          )}
        </div>
      </div>

      {/* Portaled: the sticky header's backdrop-filter would trap position:fixed children. */}
      <DepositModal />
      {drawer && w.address && createPortal(<ProfileDrawer onClose={() => setDrawer(false)} />, document.body)}

      {loginView.mounted && createPortal(
        <div className="modal-bg" data-open={loginView.shown || undefined} onClick={() => setLogin(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="login-title" ref={anchor} onClick={(e) => e.stopPropagation()}>
            <div className="between">
              <h3 id="login-title">Entrar</h3>
              <button className="btn ghost sm" onClick={() => setLogin(false)} aria-label="Cerrar">✕</button>
            </div>
            <div className="options">
              {w.cavosEnabled && (
                <button
                  className="option"
                  autoFocus
                  onClick={() => {
                    setLogin(false);
                    w.connectCavos();
                  }}
                >
                  <span>
                    <b>Email o Google</b>
                    <span className="muted small">Sin extensión ni XLM. Cavos paga los fees.</span>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              )}
              <button
                className="option"
                autoFocus={!w.cavosEnabled}
                onClick={async () => {
                  setErr("");
                  try {
                    await w.connectFreighter();
                    setLogin(false);
                  } catch (e) {
                    setErr(explain(e));
                  }
                }}
              >
                <span>
                  <b>Wallet de Stellar</b>
                  <span className="muted small">Freighter, xBull, Lobstr y otras.</span>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <p className="muted small">Garfio corre en testnet: nada de esto es dinero real.</p>
            {err && <div className="err">{err}</div>}
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}
