import Link from "next/link";
import { PageHeader, Card, CardBody, Badge, formatDate } from "@/components/ui";
import { listExams, offlineCases } from "@/lib/repo/exams";
import { listModules } from "@/lib/repo/study";
import { aiAvailable } from "@/lib/ai/client";
import { NewExam } from "./NewExam";

export default async function KlausurPage({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
  const { module } = await searchParams;
  const exams = listExams();
  return (
    <div className="space-y-8">
      <PageHeader title="Klausurtraining" subtitle="Fälle unter realistischen Bedingungen: Zeitlimit, Editor mit Zwischenspeicherung, Auswertung und Musterlösung" />
      <NewExam ai={aiAvailable()} modules={listModules().filter((m) => m.id !== "gesetze").map((m) => ({ id: m.id, title: m.title }))}
        offline={offlineCases().map((c) => ({ lessonId: c.lessonId, moduleId: c.moduleId, title: c.title }))} initialModule={module} />
      <div>
        <p className="mb-2 font-semibold">Bisherige Bearbeitungen</p>
        {exams.length === 0 ? <p className="text-sm text-ink-soft">Noch keine.</p> : (
          <Card><ul className="divide-y divide-line">
            {exams.map((e) => {
              const ev = e.evaluation ? JSON.parse(e.evaluation) : null;
              return (
                <li key={e.id}><Link href={`/klausur/${e.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-brand-50/50">
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{e.title}</p><p className="text-sm text-ink-soft">{formatDate(e.created_at)} · {e.duration_min} Min. · Modul {e.module_id}</p></div>
                  {!e.submitted_at ? <Badge tone="brand">in Bearbeitung</Badge> : ev ? <Badge tone="ok">ausgewertet{typeof ev.rubricScore === "number" ? ` · ${Math.round(ev.rubricScore * 100)} % der Lösungspunkte` : ""}</Badge> : <Badge tone="warn">abgegeben</Badge>}
                </Link></li>
              );
            })}
          </ul></Card>
        )}
      </div>
    </div>
  );
}
