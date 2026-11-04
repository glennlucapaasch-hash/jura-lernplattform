import Link from "next/link";
import { FileText } from "lucide-react";
import type { SrcRef } from "@/lib/learning/types";

const DOC_LABEL: Record<string, string> = { BGB: "BGB AT KE", VR: "VerfR KE", PROP: "Propädeutikum" };

/** PDF page = printed page + offset (front matter); labels show the printed page as in the Studienbrief. */
const PAGE_OFFSET: Record<string, number> = { VR_1: 13, VR_3: 6, PROP_1: -1 };

const EXTRA_LABEL: Record<string, string> = {
  EXTRA_PROP_NORMZITATION: "Merkblatt Normzitation (Prop.)",
  EXTRA_PROP_APPLE_METHODIK: "„An apple a day“ – Methodische Betrachtung",
  EXTRA_PROP_APPLE_LOESUNG: "„An apple a day“ – Lösungshinweise",
  EXTRA_PROP_FOLIEN1: "Prop. Online-Lektion – Folien",
  EXTRA_OER_FALLBEARBEITUNG: "Methodische Hinweise zur Fallbearbeitung im ÖR",
  EXTRA_GRUNDLAGEN_FALLBEARBEITUNG: "Grundlagen der Fallbearbeitung",
  EXTRA_ZJS_DEFINIEREN: "Frenzel, ZJS 2009, 224",
  EXTRA_ZJS_LESEN: "Reimer, ZJS 2012, 618",
  EXTRA_VR_FOLIEN1: "VerfR Online-Lektion 1 – Folien",
};

export function srcLabel(s: SrcRef) {
  if (s.doc.startsWith("EXTRA_")) return `${EXTRA_LABEL[s.doc] ?? "Begleitmaterial"}, S. ${s.page}`;
  const [pre, n] = s.doc.split("_");
  const base = DOC_LABEL[pre] ? (pre === "PROP" ? DOC_LABEL[pre] : `${DOC_LABEL[pre]} ${n}`) : s.doc;
  return `${base}, S. ${s.page - (PAGE_OFFSET[s.doc] ?? 0)}`;
}

/** Links to the exact page of the original document in the built-in viewer. */
export function SourceChips({ src, className }: { src?: SrcRef[]; className?: string }) {
  if (!src?.length) return null;
  const uniq = src.filter((s, i) => src.findIndex((x) => x.doc === s.doc && x.page === s.page) === i).slice(0, 6);
  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {uniq.map((s) => s.doc.startsWith("EXTRA_") ? (
        <span key={`${s.doc}-${s.page}`} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-ink-soft">
          <FileText size={12} /> {srcLabel(s)}
        </span>
      ) : (
        <Link key={`${s.doc}-${s.page}`} href={`/bibliothek/ansicht?key=${encodeURIComponent(s.doc)}&page=${s.page}`}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-ink-soft hover:border-brand-200 hover:text-brand-700">
          <FileText size={12} /> {srcLabel(s)}
        </Link>
      ))}
    </div>
  );
}
