"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@/lib/wallet/WalletProvider";
import { explain } from "@/lib/errors";
import { short } from "@/lib/units";

export function Header() {
  const path = usePathname();
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");

  const link = (href: string, label: string) => (
    <Link href={href} aria-current={path === href ? "page" : undefined}>
      {label}
    </Link>
  );

  return (
    <header className="top">
      <Link href="/" className="brand">Garfio</Link>
      <nav className="nav">
        {link("/", "Mercado")}
        {link("/create", "Crear")}
      </nav>
      {w.address ? (
        <button className="btn" onClick={() => w.disconnect()} title="Desconectar">
          {w.kind === "cavos" ? "Cavos" : "Freighter"} · {short(w.address)}
        </button>
      ) : (
        <button className="btn inv" onClick={() => setOpen(true)}>Entrar</button>
      )}

      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <div className="modal" role="dialog" aria-label="Conectar wallet" onClick={(e) => e.stopPropagation()}>
            <div className="display" style={{ fontSize: 28 }}>Entrar</div>
            {w.cavosEnabled && (
              <button
                className="go"
                onClick={() => {
                  setOpen(false);
                  w.connectCavos();
                }}
              >
                Con email o Google (Cavos)
              </button>
            )}
            <button
              className={w.cavosEnabled ? "btn" : "go"}
              onClick={async () => {
                setErr("");
                try {
                  await w.connectFreighter();
                  setOpen(false);
                } catch (e) {
                  setErr(explain(e));
                }
              }}
            >
              Wallet de Stellar (Freighter, xBull…)
            </button>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              {w.cavosEnabled
                ? "Con Cavos no necesitas extensión ni XLM: los fees van patrocinados."
                : "Testnet. Si tu cuenta no existe, la fondeamos con Friendbot."}
            </p>
            <div className="err">{err}</div>
          </div>
        </div>
      )}
    </header>
  );
}
