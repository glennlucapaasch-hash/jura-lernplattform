"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function DocActions({ doc, modules }: { doc: { id: string; module_id: string | null; ke: number | null }; modules: { id: string; title: string }[] }) {
  const router = useRouter();
  const [moduleId, setModuleId] = useState(doc.module_id ?? "");
  const [ke, setKe] = useState(doc.ke?.toString() ?? "");
  async function save() {
    await fetch(`/api/documents/${doc.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ moduleId: moduleId || null, ke: ke ? Number(ke) : null }) });
    router.refresh();
  }
  async function del() {
    if (!confirm("Dokument aus der Bibliothek löschen? Lernfortschritt und Lerneinheiten bleiben erhalten.")) return;
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    router.push("/bibliothek");
  }
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-ink-soft">Zuordnung ändern / löschen</summary>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="h-9 rounded-xl border border-line bg-surface px-2">
          <option value="">ohne Modul</option>
          {modules.map((m) => <option key={m.id} value={m.id}>{m.id} – {m.title}</option>)}
        </select>
        <input value={ke} onChange={(e) => setKe(e.target.value)} placeholder="KE" className="h-9 w-16 rounded-xl border border-line px-2" />
        <Button size="sm" variant="secondary" onClick={save}>Speichern</Button>
        <Button size="sm" variant="danger" onClick={del}>Löschen</Button>
      </div>
    </details>
  );
}
