import Link from "next/link";
import { Card, CardBody, PageHeader, CountBar, formatMinutes, formatDate } from "@/components/ui";
import { listModules, studyUnits, progressMap, listDeadlines, listLessons } from "@/lib/repo/study";
import { listDocuments } from "@/lib/repo/documents";

export default function ModulesPage() {
  const prog = progressMap();
  const dls = listDeadlines();
  return (
    <div>
      <PageHeader title="Meine Module" subtitle="Jedes Modul hat eigene Unterlagen, Themen, Lernplanung, Übungen und Prüfungsvorbereitung." />
      <div className="grid gap-4 md:grid-cols-2">
        {listModules().map((m) => {
          const u = studyUnits(m.id);
          const done = u.filter((x) => prog.get(x.id)?.status === "studied").length;
          const docs = listDocuments(m.id).length;
          const exam = dls.find((d) => d.module_id === m.id && d.kind === "klausur");
          return (
            <Link key={m.id} href={`/module/${m.id}`}>
              <Card className="h-full transition hover:border-brand-200">
                <CardBody>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{m.id === "gesetze" ? "Nachschlagewerk" : `Modul ${m.id}`}</p>
                  <p className="mt-0.5 text-lg font-semibold">{m.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{m.description}</p>
                  {u.length > 0 && <div className="mt-4"><CountBar value={done} max={u.length} label="Abschnitte erarbeitet" /></div>}
                  <p className="mt-3 text-sm text-ink-soft">
                    {docs} Dokument{docs === 1 ? "" : "e"} · {listLessons(m.id).length} Lerneinheiten
                    {u.length ? ` · ca. ${formatMinutes(u.reduce((n, x) => n + x.est_minutes, 0))} Stoff` : ""}
                    {exam ? ` · Klausur ${formatDate(exam.date)}` : ""}
                  </p>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-ink-faint">Neue Module entstehen automatisch, wenn du Unterlagen eines weiteren Moduls in der Bibliothek hochlädst (die Modulnummer wird erkannt).</p>
    </div>
  );
}
