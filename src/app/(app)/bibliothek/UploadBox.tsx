"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Button, Card, CardBody, cx } from "@/components/ui";

interface Result { filename: string; error?: string; duplicate?: boolean; topicsCreated?: number; topicsLinked?: number; document?: { title: string; page_count: number; module_id: string | null } }

export function UploadBox({ modules }: { modules: { id: string; title: string }[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [moduleId, setModuleId] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const router = useRouter();
  async function upload(files: FileList | File[]) {
    const list = [...files].filter((f) => /\.(pdf|docx|txt|md)$/i.test(f.name));
    if (!list.length) return setResults([{ filename: "–", error: "Nur PDF, DOCX oder TXT." }]);
    setBusy(true);
    const all: Result[] = [];
    for (const f of list) {
      const fd = new FormData();
      fd.append("file", f);
      if (moduleId) fd.append("moduleId", moduleId);
      const r = await fetch("/api/documents", { method: "POST", body: fd });
      const d = await r.json();
      all.push(...(d.results ?? [{ filename: f.name, error: d.error }]));
      setResults([...all]);
    }
    setBusy(false);
    router.refresh();
  }
  return (
    <Card>
      <CardBody>
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
          className={cx("grid place-items-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition", drag ? "border-brand-400 bg-brand-50" : "border-line")}>
          <UploadCloud className="text-brand-500" size={36} />
          <p className="mt-2 font-medium">Dateien hierher ziehen oder auswählen</p>
          <p className="text-sm text-ink-soft">PDF, DOCX oder TXT · Modul und Kurseinheit werden automatisch erkannt</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => input.current?.click()} disabled={busy}>{busy ? "Wird verarbeitet …" : "Dateien auswählen"}</Button>
            <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm">
              <option value="">Modul automatisch erkennen</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.id} – {m.title}</option>)}
            </select>
          </div>
          <input ref={input} type="file" multiple accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
        </div>
        {results.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {results.map((r, i) => (
              <li key={i} className={r.error ? "text-bad" : "text-ok"}>
                {r.error ? `✗ ${r.filename}: ${r.error}` : r.duplicate ? `= ${r.filename}: bereits in der Bibliothek` : `✓ ${r.filename} → ${r.document?.title} (${r.document?.page_count} Seiten${r.topicsCreated ? `, ${r.topicsCreated} Themen erkannt` : r.topicsLinked ? `, mit ${r.topicsLinked} Themen verknüpft` : ""})`}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
