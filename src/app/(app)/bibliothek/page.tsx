import Link from "next/link";
import { FileText, AlertCircle } from "lucide-react";
import { Card, PageHeader, Badge, Notice } from "@/components/ui";
import { listDocuments } from "@/lib/repo/documents";
import { listModules } from "@/lib/repo/study";
import { UploadBox } from "./UploadBox";
import { LibrarySearch } from "./LibrarySearch";

export default function LibraryPage() {
  const docs = listDocuments();
  const modules = listModules();
  return (
    <div className="space-y-8">
      <PageHeader title="Bibliothek" subtitle="Deine Studienunterlagen – durchsuchbar, mit Seitenangaben und Originalansicht" />
      <UploadBox modules={modules.map((m) => ({ id: m.id, title: m.title }))} />
      <LibrarySearch />
      {modules.map((m) => {
        const d = docs.filter((x) => x.module_id === m.id);
        if (!d.length) return null;
        return (
          <div key={m.id}>
            <p className="mb-2 font-semibold">{m.title}</p>
            <Card>
              <ul className="divide-y divide-line">
                {d.map((doc) => (
                  <li key={doc.id}>
                    <Link href={`/bibliothek/${doc.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-brand-50/50">
                      <FileText size={18} className="text-brand-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium">{doc.title}</p>
                        <p className="text-xs text-ink-faint">{doc.filename} · {doc.page_count} Seiten · {doc.word_count.toLocaleString("de-DE")} Wörter</p>
                      </div>
                      {doc.status === "error" ? <Badge tone="bad"><AlertCircle size={12} /> Fehler</Badge> : <Badge tone="ok">indexiert</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        );
      })}
      {docs.filter((x) => !x.module_id).length > 0 && (
        <div>
          <p className="mb-2 font-semibold">Ohne Modulzuordnung</p>
          <Card><ul className="divide-y divide-line">{docs.filter((x) => !x.module_id).map((doc) => <li key={doc.id}><Link href={`/bibliothek/${doc.id}`} className="block px-5 py-3 text-[15px] hover:bg-brand-50/50">{doc.title}</Link></li>)}</ul></Card>
        </div>
      )}
      <Notice title="Urheberrecht und Datenschutz">
        Die Studienbriefe der FernUniversität sind urheberrechtlich geschützt; die private Speicherung zum eigenen Studium ist erlaubt (§ 53 UrhG), eine Weitergabe nicht. Die App speichert die Dateien nur lokal auf deinem Rechner (Ordner <code>data/</code>, nicht im GitHub-Repository).
        Für KI-Funktionen werden einzelne Textpassagen an die Claude-API übermittelt; Anthropic verwendet API-Daten standardmäßig nicht zum Training.
      </Notice>
    </div>
  );
}
