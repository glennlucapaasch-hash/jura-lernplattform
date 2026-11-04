import Link from "next/link";
import { PageHeader, Card, CardBody, SectionTitle, formatDate } from "@/components/ui";
import { listNotes } from "@/lib/repo/archive";
import { sessionHistory } from "@/lib/repo/session";
import { db } from "@/lib/db";
import { listLessons } from "@/lib/repo/study";
import { ArchiveSearch, NoteEditor } from "./ArchiveClient";

export default function ArchivePage() {
  const notes = listNotes(50);
  const sessions = sessionHistory(30);
  const chats = db().prepare("SELECT id, title, updated_at FROM chats ORDER BY updated_at DESC LIMIT 15").all() as { id: string; title: string; updated_at: string }[];
  const lessons = listLessons();
  return (
    <div className="space-y-8">
      <PageHeader title="Archiv & Suche" subtitle="Notizen, Gespräche, Klausuren, Karteikarten, Lerneinheiten und Fehleranalysen – alles an einem Ort" />
      <ArchiveSearch />
      <div>
        <SectionTitle>Eigene Notizen</SectionTitle>
        <NoteEditor notes={notes.map((n) => ({ id: n.id, text: n.text, updated_at: n.updated_at }))} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle>Lernhistorie</SectionTitle>
          <Card><CardBody>
            {sessions.length === 0 ? <p className="text-sm text-ink-soft">Noch keine Lerneinheiten.</p> : (
              <ul className="space-y-1 text-sm">{sessions.map((s) => { const p = JSON.parse(s.plan); return <li key={s.id} className="flex justify-between gap-2"><span>{formatDate(s.date)} · {p.blocks.find((b: { kind: string; title: string }) => b.kind === "new" || b.kind === "reading")?.title.replace(/^.*?: /, "") ?? p.mode}</span><span className="tabular-nums text-ink-faint">{Math.round(s.minutes)} Min.{s.status === "done" ? " ✓" : ""}</span></li>; })}</ul>
            )}
          </CardBody></Card>
        </div>
        <div>
          <SectionTitle>KI-Gespräche</SectionTitle>
          <Card><CardBody>
            {chats.length === 0 ? <p className="text-sm text-ink-soft">Noch keine.</p> : <ul className="space-y-1 text-sm">{chats.map((c) => <li key={c.id}><Link href={`/dozent?chat=${c.id}`} className="flex justify-between gap-2 hover:text-brand-700"><span className="truncate">{c.title}</span><span className="shrink-0 text-ink-faint">{formatDate(c.updated_at, { day: "2-digit", month: "2-digit" })}</span></Link></li>)}</ul>}
          </CardBody></Card>
        </div>
      </div>
      <div>
        <SectionTitle>Lerneinheiten & Zusammenfassungen</SectionTitle>
        <Card><CardBody><ul className="grid gap-1 text-sm sm:grid-cols-2">{lessons.map((l) => <li key={l.id}><Link className="hover:text-brand-700" href={`/lektion/${l.id}`}>{l.title}{l.origin === "ai" ? " (KI)" : ""}</Link></li>)}</ul></CardBody></Card>
      </div>
    </div>
  );
}
