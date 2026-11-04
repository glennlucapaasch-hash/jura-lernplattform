import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, FileText } from "lucide-react";
import { Card, CardBody, PageHeader, Badge, SectionTitle, formatMinutes, ButtonLink } from "@/components/ui";
import { getModule, listTopics, progressMap, masteryByTopic, lessonsForTopic, listDeadlines, formatStage } from "@/lib/repo/study";
import { listDocuments } from "@/lib/repo/documents";
import { aiAvailable } from "@/lib/ai/client";
import { TopicActions } from "./TopicActions";

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = getModule(id);
  if (!m) notFound();
  const topics = listTopics(id);
  const prog = progressMap();
  const mastery = masteryByTopic();
  const docs = listDocuments(id);
  const dls = listDeadlines().filter((d) => d.module_id === id);
  const kes = [...new Set(topics.map((t) => t.ke))];
  const ai = aiAvailable();
  return (
    <div className="space-y-8">
      <PageHeader title={m.title} subtitle={m.description} actions={<><ButtonLink href={`/quiz?module=${id}`} variant="secondary">Quiz</ButtonLink><ButtonLink href={`/klausur?module=${id}`} variant="secondary">Klausurtraining</ButtonLink></>} />
      {dls.length > 0 && (
        <div className="flex flex-wrap gap-2">{dls.map((d) => <Badge key={d.id} tone={d.status === "confirmed" ? "ok" : "warn"}>{d.title.replace(/^.*?–\s*/, "")}: {d.date.split("-").reverse().join(".")}</Badge>)}</div>
      )}
      <div>
        <SectionTitle aside={<Link href="/bibliothek" className="text-sm text-brand-600">Hochladen</Link>}>Dokumente</SectionTitle>
        {docs.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {docs.map((d) => (
              <Link key={d.id} href={`/bibliothek/${d.id}`}><Card className="hover:border-brand-200"><CardBody className="flex items-center gap-3 p-4 sm:p-4"><FileText size={18} className="text-brand-500" /><span className="flex-1 text-[15px]">{d.title}</span><span className="text-sm text-ink-faint">{d.page_count} S.</span></CardBody></Card></Link>
            ))}
          </div>
        ) : <p className="text-sm text-ink-soft">Noch keine Dokumente – bitte in der <Link className="text-brand-600 underline" href="/bibliothek">Bibliothek</Link> hochladen.</p>}
      </div>
      <div>
        <SectionTitle>Themenübersicht</SectionTitle>
        <div className="space-y-6">
          {kes.map((ke) => (
            <div key={String(ke)}>
              {ke != null && <p className="mb-2 font-semibold">Kurseinheit {ke}</p>}
              <Card>
                <ul className="divide-y divide-line">
                  {topics.filter((t) => t.ke === ke && t.kind !== "meta").map((t) => {
                    const p = prog.get(t.id);
                    const ms = mastery.get(t.id);
                    const lesson = t.parent_id ? null : lessonsForTopic(t.id)[0];
                    return (
                      <li key={t.id} className={`flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center ${t.level === 2 ? "sm:pl-10" : ""}`}>
                        <div className="min-w-0 flex-1">
                          <p className={t.level === 1 ? "font-semibold" : "text-[15px]"}>{t.marker} {t.title}</p>
                          <p className="text-xs text-ink-faint">
                            {t.placeholder ? "Platzhalter – Unterlagen fehlen" : t.pdf_start ? `S. ${t.pdf_start}–${t.pdf_end}` : ""}
                            {t.kind === "study" && t.est_minutes ? ` · ca. ${formatMinutes(t.est_minutes)}` : ""}
                            {t.kind === "solutions" ? "Lösungen zu den Selbsttestaufgaben" : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {p?.status === "studied" && <Badge tone="ok">erarbeitet</Badge>}
                          {p?.status === "learning" && <Badge tone="brand">in Arbeit</Badge>}
                          {ms && <Badge>{formatStage(ms.stage)}</Badge>}
                          {lesson && <Link href={`/lektion/${lesson.id}`} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700"><BookOpen size={12} /> Lerneinheit</Link>}
                          {t.kind === "study" && <TopicActions topicId={t.id} level={t.level} hasLesson={!!lesson} studied={p?.status === "studied"} ai={ai} />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
