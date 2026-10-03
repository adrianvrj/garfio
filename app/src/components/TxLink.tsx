import { txUrl } from "@/lib/config";
import type { TxLog } from "@/hooks/useTx";

export function TxLog({ log }: { log: TxLog[] }) {
  if (!log.length) return null;
  return (
    <div className="stack small muted" style={{ gap: 2 }} aria-live="polite">
      {log.map((l, i) => (
        <div key={i}>
          ✓ {l.msg}
          {l.hash && (
            <>
              {" · "}
              <a href={txUrl(l.hash)} target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>ver tx</a>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
