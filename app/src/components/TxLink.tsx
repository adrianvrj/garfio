"use client";

import { txUrl } from "@/lib/config";
import type { TxLog } from "@/hooks/useTx";
import { useT } from "@/i18n/client";

export function TxLog({ log }: { log: TxLog[] }) {
  const t = useT();
  if (!log.length) return null;
  return (
    <div className="stack small muted" style={{ gap: 2 }} aria-live="polite">
      {log.map((l, i) => (
        <div key={i}>
          ✓ {l.msg}
          {l.hash && (
            <>
              {" · "}
              <a href={txUrl(l.hash)} target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>{t.common.seeTx}</a>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
