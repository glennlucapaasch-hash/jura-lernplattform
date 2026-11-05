import { Scale } from "lucide-react";
import { normUrl } from "@/lib/norms";

/** "Im Gesetz lesen": norms as chips; known laws link to the official text. */
export function NormChips({ norms, label = "Im Gesetz lesen" }: { norms: string[]; label?: string }) {
  if (!norms.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-faint"><Scale size={13} /> {label}:</span>
      {norms.map((n) => {
        const url = normUrl(n);
        return url ? (
          <a key={n} href={url} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">{n}</a>
        ) : (
          <span key={n} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">{n}</span>
        );
      })}
    </div>
  );
}
