"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { useProfile } from "@/lib/profile";
import { explain } from "@/lib/errors";
import { short } from "@/lib/units";
import { UserAvatar } from "./Art";
import { ProfileDrawer } from "./ProfileDrawer";

export function Header() {
  const router = useRouter();
  const params = useSearchParams();
  const w = useWallet();
  const profile = useProfile(w.address);
  const [login, setLogin] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [err, setErr] = useState("");

  return (
    <header className="header">
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
          <Link href="/create" className="btn primary">Crear moneda</Link>
          {w.address ? (
            <button className="wallet-chip" onClick={() => setDrawer(true)} aria-label="Abrir perfil">
              <UserAvatar address={w.address} image={profile.image} size={28} />
              <span className="hide-sm">{profile.name || short(w.address)}</span>
            </button>
          ) : (
            <button className="btn" onClick={() => setLogin(true)}>Entrar</button>
          )}
        </div>
      </div>

      {drawer && w.address && <ProfileDrawer onClose={() => setDrawer(false)} />}

      {login && (
        <div className="modal-bg" onClick={() => setLogin(false)}>
          <div className="modal" role="dialog" aria-label="Entrar" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18 }}>Entrar a Garfio</h3>
            {w.cavosEnabled && (
              <button
                className="btn primary block lg"
                onClick={() => {
                  setLogin(false);
                  w.connectCavos();
                }}
              >
                Con email o Google
              </button>
            )}
            <button
              className={`btn block lg ${w.cavosEnabled ? "" : "primary"}`}
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
              Wallet de Stellar (Freighter, xBull…)
            </button>
            <p className="muted small">
              {w.cavosEnabled
                ? "Con email no necesitas extensión ni XLM: Cavos patrocina los fees."
                : "Testnet. Si tu cuenta no existe, la fondeamos con Friendbot."}
            </p>
            {err && <div className="err">{err}</div>}
          </div>
        </div>
      )}
    </header>
  );
}
