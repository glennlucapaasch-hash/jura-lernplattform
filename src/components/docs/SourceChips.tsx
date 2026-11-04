import Link from "next/link";
import { FileText } from "lucide-react";
import type { SrcRef } from "@/lib/learning/types";

const DOC_LABEL: Record<string, string> = { BGB: "BGB AT KE", VR: "VerfR KE", PROP: "Propädeutikum" };

export function srcLabel(s: SrcRef) {
  const [pre, n] = s.doc.split("_");
  const base = DOC_LABEL[pre] ? (pre === "PROP" ? DOC_LABEL[pre] : `${DOC_LABEL[pre]} ${n}`) : s.doc;
  return `${base}, S. ${s.page}`;
}

/** Links to the exact page of the original document in the built-in viewer. */
export function SourceChips({ src, className }: { src?: SrcRef[]; className?: string }) {
  if (!src?.length) return null;
  const uniq = src.filter((s, i) => src.findIndex((x) => x.doc === s.doc && x.page === s.page) === i).slice(0, 6);
  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {uniq.map((s) => (
        <Link key={`${s.doc}-${s.page}`} href={`/bibliothek/ansicht?key=${encodeURIComponent(s.doc)}&page=${s.page}`}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-ink-soft hover:border-brand-200 hover:text-brand-700">
          <FileText size={12} /> {srcLabel(s)}
        </Link>
      ))}
    </div>
  );
}
