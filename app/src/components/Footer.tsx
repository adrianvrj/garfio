import { accountUrl, ADMIN, contractUrl, IS_MAINNET, LAUNCHPAD_ID } from "@/lib/config";

/** Who controls what: the admin can replace the launchpad's code, and on mainnet nothing is audited. */
export function Footer() {
  return (
    <footer className="footer small muted">
      <span>
        Contrato <a className="copy" href={contractUrl(LAUNCHPAD_ID)} target="_blank" rel="noopener">{LAUNCHPAD_ID.slice(0, 4)}…{LAUNCHPAD_ID.slice(-4)} ↗</a>.
        Su admin (<a className="copy" href={accountUrl(ADMIN)} target="_blank" rel="noopener">{ADMIN.slice(0, 4)}…{ADMIN.slice(-4)} ↗</a>) puede
        reemplazar su código, y con eso sus reglas, incluidas las de las reservas.
      </span>
      <span>{IS_MAINNET ? "Stellar mainnet" : "Stellar testnet: los bonos son de sandbox, con precio y tasa reales."}</span>
    </footer>
  );
}

/** Fixed notice on mainnet: real money, unaudited contracts. */
export function MainnetBanner() {
  if (!IS_MAINNET) return null;
  return <div className="mainnet-banner" role="note">Contratos sin auditoría. Usa montos pequeños.</div>;
}
