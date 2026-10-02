import { txUrl } from "@/lib/config";
import type { TxLog } from "@/hooks/useTx";

export function TxLog({ log }: { log: TxLog[] }) {
  if (!log.length) return null;
  return (
    <div className="log" aria-live="polite">
      {log.map((l, i) => (
        <div key={i}>
          {l.msg}
          {l.hash && (
            <>
              {" · "}
              <a href={txUrl(l.hash)} target="_blank" rel="noopener">tx ↗</a>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
