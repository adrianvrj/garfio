import { accountUrl, ADMIN, contractUrl, IS_MAINNET, LAUNCHPAD_ID } from "@/lib/config";
import { getDict } from "@/i18n/server";

/** Who controls what: the admin can replace the launchpad's code, and on mainnet nothing is audited. */
export async function Footer() {
  const t = await getDict();
  return (
    <footer className="footer small muted">
      <span className="colophon-title">The Hooks Daily</span>
      <span>{t.footer.printed(IS_MAINNET)}</span>
      <span>
        {t.footer.editor(
          <a className="copy" href={contractUrl(LAUNCHPAD_ID)} target="_blank" rel="noopener">{LAUNCHPAD_ID.slice(0, 4)}…{LAUNCHPAD_ID.slice(-4)} ↗</a>,
          <a className="copy" href={accountUrl(ADMIN)} target="_blank" rel="noopener">{ADMIN.slice(0, 4)}…{ADMIN.slice(-4)} ↗</a>,
        )}
      </span>
    </footer>
  );
}

/** Fixed notice on mainnet: real money, unaudited contracts. */
export async function MainnetBanner() {
  if (!IS_MAINNET) return null;
  const t = await getDict();
  return <div className="mainnet-banner" role="note">{t.footer.mainnet}</div>;
}
