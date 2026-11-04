"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardBody } from "@/components/ui";

interface Hit { kind: string; id: string; title: string; snippet: string; href: string }
interface DocHit { docId: string; docTitle: string; page: number; printedPage: number; snippet: string }

export function ArchiveSearch() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ documents: DocHit[]; archive: Hit[] } | null>(null);
  return (
    <div>
      <form onSubmit={async (e) => { e.preventDefault(); setRes(await (await fetch(`/api/search?q=${encodeURIComponent(q)}`)).json()); }} className="relative">
        <Search size={18} className="absolute left-3 top-3 text-ink-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Alles durchsuchen …" className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 outline-none focus:border-brand-400" />
      </form>
      {res && (
        <Card className="mt-3"><CardBody className="space-y-2">
          {res.archive.length + res.documents.length === 0 && <p className="text-sm text-ink-soft">Keine Treffer.</p>}
          {res.archive.map((h, i) => <Link key={i} href={h.href} className="block rounded-lg p-2 hover:bg-brand-50/60"><Badge tone="brand">{h.kind}</Badge> <span className="font-medium">{h.title}</span><p className="text-sm text-ink-soft">{h.snippet}</p></Link>)}
          {res.documents.slice(0, 10).map((h, i) => <Link key={"d" + i} href={`/bibliothek/${h.docId}?page=${h.page}`} className="block rounded-lg p-2 hover:bg-brand-50/60"><Badge>Skript</Badge> <span className="font-medium">{h.docTitle}, S. {h.printedPage}</span><p className="text-sm text-ink-soft">{h.snippet.replace(/\[\[|\]\]/g, "")}</p></Link>)}
        </CardBody></Card>
      )}
    </div>
  );
}

export function NoteEditor({ notes }: { notes: { id: string; text: string; updated_at: string }[] }) {
  const [text, setText] = useState("");
  const router = useRouter();
  async function add() { await fetch("/api/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }); setText(""); router.refresh(); }
  async function del(id: string) { if (confirm("Notiz löschen?")) { await fetch(`/api/notes/${id}`, { method: "DELETE" }); router.refresh(); } }
  return (
    <div className="space-y-3">
      <Card><CardBody className="space-y-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Neue Notiz …" className="w-full rounded-xl border border-line p-3 text-[15px]" />
        <Button onClick={add} disabled={!text.trim()}>Notiz speichern</Button>
      </CardBody></Card>
      {notes.map((n) => (
        <Card key={n.id}><CardBody className="flex gap-3 p-4 sm:p-4"><p className="flex-1 whitespace-pre-wrap text-[15px]">{n.text}</p><button onClick={() => del(n.id)} className="text-ink-faint" aria-label="Löschen"><Trash2 size={15} /></button></CardBody></Card>
      ))}
    </div>
  );
}
