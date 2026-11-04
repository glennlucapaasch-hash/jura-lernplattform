/** Personal archive: search across notes, tutor chats, exams, flashcards, lessons and mistakes. */
import { db } from "../db";

export interface ArchiveHit {
  kind: "notiz" | "gespräch" | "klausur" | "karteikarte" | "lerneinheit" | "fehler";
  id: string;
  title: string;
  snippet: string;
  href: string;
  date: string;
}

function snip(text: string, q: string) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  const s = Math.max(0, i - 60);
  return (s > 0 ? "… " : "") + text.slice(s, s + 180).replace(/\s+/g, " ") + (text.length > s + 180 ? " …" : "");
}

export function searchArchive(q: string, limit = 40): ArchiveHit[] {
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const d = db();
  const hits: ArchiveHit[] = [];
  for (const r of d.prepare("SELECT id, text, created_at FROM notes WHERE text LIKE ? ORDER BY updated_at DESC LIMIT 20").all(like) as { id: string; text: string; created_at: string }[])
    hits.push({ kind: "notiz", id: r.id, title: r.text.slice(0, 60), snippet: snip(r.text, q), href: `/archiv?note=${r.id}`, date: r.created_at });
  for (const r of d
    .prepare("SELECT m.chat_id, m.content, m.created_at, c.title FROM chat_messages m JOIN chats c ON c.id = m.chat_id WHERE m.content LIKE ? ORDER BY m.created_at DESC LIMIT 20")
    .all(like) as { chat_id: string; content: string; created_at: string; title: string }[])
    hits.push({ kind: "gespräch", id: r.chat_id, title: r.title, snippet: snip(r.content, q), href: `/dozent?chat=${r.chat_id}`, date: r.created_at });
  for (const r of d
    .prepare("SELECT id, title, facts, answer, created_at FROM exams WHERE title LIKE ? OR facts LIKE ? OR answer LIKE ? ORDER BY created_at DESC LIMIT 20")
    .all(like, like, like) as { id: string; title: string; facts: string; answer: string; created_at: string }[])
    hits.push({ kind: "klausur", id: r.id, title: r.title, snippet: snip(r.answer || r.facts, q), href: `/klausur/${r.id}`, date: r.created_at });
  for (const r of d.prepare("SELECT id, front, back, created_at FROM flashcards WHERE front LIKE ? OR back LIKE ? LIMIT 20").all(like, like) as { id: string; front: string; back: string; created_at: string }[])
    hits.push({ kind: "karteikarte", id: r.id, title: r.front.slice(0, 80), snippet: snip(r.back, q), href: `/karteikarten?card=${r.id}`, date: r.created_at });
  for (const r of d.prepare("SELECT id, title, json, created_at FROM lessons WHERE title LIKE ? OR json LIKE ? LIMIT 20").all(like, like) as { id: string; title: string; json: string; created_at: string }[])
    hits.push({ kind: "lerneinheit", id: r.id, title: r.title, snippet: snip(r.json.replace(/"[a-zA-Z]+":/g, " ").replace(/[{}[\]"]/g, " "), q), href: `/lektion/${r.id}`, date: r.created_at });
  for (const r of d.prepare("SELECT id, category, description, created_at FROM mistakes WHERE description LIKE ? ORDER BY created_at DESC LIMIT 20").all(like) as { id: string; category: string; description: string; created_at: string }[])
    hits.push({ kind: "fehler", id: r.id, title: `Fehleranalyse (${r.category})`, snippet: snip(r.description, q), href: `/fortschritt#fehler`, date: r.created_at });
  return hits.slice(0, limit);
}

export interface NoteRow { id: string; module_id: string | null; topic_id: string | null; doc_id: string | null; page: number | null; text: string; created_at: string; updated_at: string }

export function listNotes(limit = 100): NoteRow[] {
  return db().prepare("SELECT * FROM notes ORDER BY updated_at DESC LIMIT ?").all(limit) as NoteRow[];
}
