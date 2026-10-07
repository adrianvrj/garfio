"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { IS_MAINNET } from "@/lib/config";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useProfile } from "@/lib/profile";
import { usePresence } from "@/hooks/usePresence";
import { useSwipeSheet } from "@/hooks/useSwipeSheet";
import { explain } from "@/lib/errors";
import { useT } from "@/i18n/client";
import { short } from "@/lib/units";
import { UserAvatar } from "./Art";
import { Logo } from "./Logo";
import { DepositModal, openDeposit } from "./DepositModal";
import { ProfileDrawer } from "./ProfileDrawer";

export function Header() {
  const router = useRouter();
  const params = useSearchParams();
  const w = useWallet();
  const t = useT();
  const th = t.header;
  const profile = useProfile(w.address);
  const [login, setLogin] = useState(false);
  // The address the drawer opened for: if the wallet blinks while Cavos settles, the drawer
  // stays put instead of remounting (and sliding in again).
  const [drawer, setDrawer] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const loginView = usePresence(login, 220);
  const loginSheetRef = useSwipeSheet<HTMLDivElement>(loginView.mounted, login, () => setLogin(false));
  // Phones fold the search into a button; opened, the field takes the whole bar.
  const [searching, setSearching] = useState(false);
  const field = useRef<HTMLInputElement>(null);
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
    loginSheetRef.current = el;
    const b = trigger.current?.getBoundingClientRect();
    if (!el || !b) return;
    const r = el.getBoundingClientRect();
    el.style.transformOrigin = `${b.left + b.width / 2 - r.left}px ${b.top + b.height / 2 - r.top}px`;
  };

  return (
    <header className="header" ref={bar} data-search={searching || undefined}>
      <div className="header-inner">
        <Link href="/" className="logo">
          <Logo />
          <span>The Hooks Daily</span>
        </Link>

        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get("q")?.toString().trim();
            router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
            field.current?.blur();
            setSearching(false);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={field}
            key={params.get("q") ?? ""}
            name="q"
            className="input"
            placeholder={th.search}
            defaultValue={params.get("q") ?? ""}
            aria-label={th.searchLabel}
            onKeyDown={(e) => e.key === "Escape" && setSearching(false)}
          />
          <button type="button" className="search-cancel" onClick={() => setSearching(false)}>{th.cancel}</button>
        </form>

        <div className="header-actions">
          <button
            className="search-open"
            aria-label={th.searchLabel}
            onClick={() => {
              // Rendered and focused inside the tap, or iOS won't raise the keyboard.
              flushSync(() => setSearching(true));
              field.current?.focus();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
          {w.address && !IS_MAINNET && (
            <button className="btn hide-sm" onClick={() => openDeposit()}>{t.common.deposit}</button>
          )}
          {w.address && <Link href="/dividends" className="btn hide-sm">{th.dividends}</Link>}
          <Link href="/create" className="btn primary">{th.create}<span className="hide-sm">{th.createMore.replace(" ", "\u00a0")}</span></Link>
          {w.address ? (
            <button className="wallet-chip" onClick={() => setDrawer(w.address)} aria-label={th.openProfile}>
              <UserAvatar address={w.address} image={profile.image} size={28} />
              <span className="hide-sm">{profile.name || short(w.address)}</span>
            </button>
          ) : (
            <button className="btn" ref={trigger} onClick={() => setLogin(true)}>{th.login}</button>
          )}
        </div>
      </div>

      {/* Portaled: the sticky header's backdrop-filter would trap position:fixed children. */}
      <DepositModal />
      {drawer && createPortal(<ProfileDrawer address={drawer} onClose={() => setDrawer(null)} />, document.body)}

      {loginView.mounted && createPortal(
        <div className="modal-bg" data-open={loginView.shown || undefined} onClick={() => setLogin(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="login-title" ref={anchor} onClick={(e) => e.stopPropagation()}>
            <div className="between">
              <span className="stack" style={{ gap: 4 }}>
                <span className="kicker">{th.loginKicker}</span>
                <h3 id="login-title">{th.loginTitle}</h3>
              </span>
              <button className="btn ghost sm" onClick={() => setLogin(false)} aria-label={t.common.close}>✕</button>
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
                    <b>{th.cavos}</b>
                    <span className="muted small">{th.cavosNote}</span>
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
                    setErr(explain(e, t));
                  }
                }}
              >
                <span>
                  <b>{th.stellar}</b>
                  <span className="muted small">{th.stellarNote}</span>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <p className="muted small">{th.testnet}</p>
            {err && <div className="err">{err}</div>}
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}
