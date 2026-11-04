"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button, Card, CardBody, Badge, cx } from "@/components/ui";
import { FlashcardReview, type ReviewCard } from "@/components/learn/FlashcardReview";

interface Row { id: string; front: string; back: string; module_id: string | null; topic: string; due: string | null; origin: string; suspended: number }

export function CardsClient({ due, cards, modules }: { due: ReviewCard[]; cards: Row[]; modules: { id: string; title: string }[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"lernen" | "verwalten">(due.length ? "lernen" : "verwalten");
  const [filter, setFilter] = useState("");
  const [edit, setEdit] = useState<Row | null>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [q, setQ] = useState("");

  async function saveNew() {
    await fetch("/api/flashcards", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ front, back, moduleId }) });
    setFront(""); setBack(""); router.refresh();
  }
  async function saveEdit() {
    if (!edit) return;
    await fetch(`/api/flashcards/${edit.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ front: edit.front, back: edit.back }) });
    setEdit(null); router.refresh();
  }
  async function act(id: string, body: object | null) {
    await fetch(`/api/flashcards/${id}`, body ? { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : { method: "DELETE" });
    router.refresh();
  }
  const shown = cards.filter((c) => (!filter || c.module_id === filter) && (!q || (c.front + c.back).toLowerCase().includes(q.toLowerCase())));
  const introduced = cards.filter((c) => c.due).length;

  return (
    <div className="space-y-6">
      <div className="flex gap-1">
        {(["lernen", "verwalten"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={cx("rounded-full px-4 py-1.5 text-sm font-medium", tab === t ? "bg-brand-500 text-white" : "border border-line bg-surface text-ink-soft")}>{t === "lernen" ? `Wiederholen (${due.length})` : `Alle Karten (${cards.length})`}</button>)}
      </div>
      {tab === "lernen" && (due.length ? <FlashcardReview cards={due} onFinish={() => router.refresh()} /> : (
        <Card><CardBody><p className="font-medium">Heute ist nichts fällig.</p><p className="mt-1 text-sm text-ink-soft">{introduced} von {cards.length} Karten sind im Wiederholungszyklus. Neue Karten kommen hinzu, sobald du den passenden Stoff in einer Lerneinheit bearbeitet hast – oder du nimmst sie unten selbst auf.</p></CardBody></Card>
      ))}
      {tab === "verwalten" && (
        <>
          <Card><CardBody className="space-y-3">
            <p className="font-semibold">Eigene Karte anlegen</p>
            <textarea value={front} onChange={(e) => setFront(e.target.value)} placeholder="Vorderseite (Frage)" rows={2} className="w-full rounded-xl border border-line p-3 text-[15px]" />
            <textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Rückseite (Antwort / Definition)" rows={3} className="w-full rounded-xl border border-line p-3 text-[15px]" />
            <div className="flex flex-wrap gap-2">
              <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm">{modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select>
              <Button onClick={saveNew} disabled={!front.trim() || !back.trim()}><Plus size={16} /> Karte speichern</Button>
            </div>
          </CardBody></Card>
          <div className="flex flex-wrap gap-2">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm"><option value="">Alle Module</option>{modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Karten durchsuchen" className="h-10 flex-1 rounded-xl border border-line px-3 text-sm" />
          </div>
          <div className="space-y-2">
            {shown.map((c) => (
              <Card key={c.id}><CardBody className="p-4 sm:p-4">
                {edit?.id === c.id ? (
                  <div className="space-y-2">
                    <textarea value={edit.front} onChange={(e) => setEdit({ ...edit, front: e.target.value })} rows={2} className="w-full rounded-xl border border-line p-2 text-[15px]" />
                    <textarea value={edit.back} onChange={(e) => setEdit({ ...edit, back: e.target.value })} rows={3} className="w-full rounded-xl border border-line p-2 text-[15px]" />
                    <div className="flex gap-2"><Button size="sm" onClick={saveEdit}>Speichern</Button><Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Abbrechen</Button></div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.front}</p>
                      <p className="mt-1 text-sm text-ink-soft">{c.back}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {c.topic && <Badge>{c.topic}</Badge>}
                        {c.origin === "user" && <Badge tone="brand">eigene</Badge>}
                        {c.suspended ? <Badge tone="warn">pausiert</Badge> : c.due ? <Badge tone="ok">nächste Wiederholung {new Date(c.due).toLocaleDateString("de-DE")}</Badge> : <Badge>noch nicht eingeführt</Badge>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button onClick={() => setEdit(c)} className="rounded-lg p-1.5 text-ink-faint hover:bg-brand-50" aria-label="Bearbeiten"><Pencil size={15} /></button>
                      {!c.due && <button onClick={() => act(c.id, { introduce: true })} className="rounded-lg px-1.5 text-xs text-brand-600">einführen</button>}
                      <button onClick={() => act(c.id, { suspended: !c.suspended })} className="rounded-lg px-1.5 text-xs text-ink-faint">{c.suspended ? "fortsetzen" : "pausieren"}</button>
                      <button onClick={() => confirm("Karte löschen?") && act(c.id, null)} className="rounded-lg p-1.5 text-ink-faint hover:bg-bad-soft" aria-label="Löschen"><Trash2 size={15} /></button>
                    </div>
                  </div>
                )}
              </CardBody></Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
