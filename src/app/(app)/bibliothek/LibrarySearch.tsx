"use client";
import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card } from "@/components/ui";

interface Hit { docId: string; docTitle: string; page: number; printedPage: number; snippet: string }

export function LibrarySearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    setHits((await r.json()).documents);
  }
  return (
    <div>
      <form onSubmit={go} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-3 text-ink-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Volltextsuche in allen Unterlagen, z. B. „Erklärungsbewusstsein“ oder „§ 130“" className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 outline-none focus:border-brand-400" />
        </div>
      </form>
      {hits && (
        <Card className="mt-3">
          {hits.length === 0 ? <p className="p-5 text-sm text-ink-soft">Keine Treffer.</p> : (
            <ul className="divide-y divide-line">
              {hits.map((h, i) => (
                <li key={i}>
                  <Link href={`/bibliothek/${h.docId}?page=${h.page}`} className="block px-5 py-3 hover:bg-brand-50/50">
                    <p className="text-sm font-medium">{h.docTitle} · S. {h.printedPage}</p>
                    <p className="text-sm text-ink-soft" dangerouslySetInnerHTML={{ __html: escapeAndMark(h.snippet) }} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function escapeAndMark(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!).replace(/\[\[/g, '<mark class="bg-yellow-100 rounded px-0.5">').replace(/\]\]/g, "</mark>");
}
