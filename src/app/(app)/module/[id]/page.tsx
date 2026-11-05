import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, FileText, ListChecks, Layers, Timer } from "lucide-react";
import { Card, CardBody, Badge, SectionTitle, formatMinutes, CountBar, cx } from "@/components/ui";
import { getModule, listTopics, progressMap, lessonsForTopic, listDeadlines, studyUnits, listLessons, getLesson } from "@/lib/repo/study";
import { nextUnit } from "@/lib/repo/session";
import { unitStatus } from "@/lib/repo/status";
import { listDocuments } from "@/lib/repo/documents";
import { aiAvailable } from "@/lib/ai/client";
import { moduleTheme } from "@/components/ui/theme";
import { normUrl } from "@/lib/norms";
import { TopicActions } from "./TopicActions";

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = getModule(id);
  if (!m) notFound();
  const th = moduleTheme(id);
  const topics = listTopics(id);
  const prog = progressMap();
  const docs = listDocuments(id);
  const dls = listDeadlines().filter((d) => d.module_id === id && ["einsendeaufgabe", "hausarbeit", "klausur", "anmeldung"].includes(d.kind) && !d.done);
  const kes = [...new Set(topics.map((t) => t.ke))];
  const ai = aiAvailable();
  const next = nextUnit(id);
  const units = studyUnits(id);
  const unitIds = new Set(units.map((u) => u.id));
  const studied = units.filter((u) => prog.get(u.id)?.status === "studied").length;
  const statuses = new Map(units.map((u) => [u.id, unitStatus(u)]));
  const readCount = [...statuses.values()].filter((s) => s?.read).length;
  const extras = listLessons(id).map((l) => getLesson(l.id)!).filter((l) => l.kind && l.kind !== "lesson");
  const kern = listLessons(id).map((l) => getLesson(l.id)!).filter((l) => !l.kind || l.kind === "lesson").flatMap((l) => (l.kernnormen ?? []).map((k) => ({ ...k, lesson: l.title })));
  const kernUnique = kern.filter((k, i) => kern.findIndex((x) => x.norm === k.norm) === i);

  return (
    <div className="space-y-8">
      <div className={cx("rounded-2xl p-6 text-white shadow-[var(--shadow-card)] sm:p-8", th.gradient)}>
        <p className="text-sm text-white/80">{th.emoji} Modul {m.id}</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{m.title}</h1>
        <div className="mt-4 grid max-w-xl grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-white/15 p-2"><p className="text-xl font-semibold">{readCount}/{units.length}</p><p className="text-xs text-white/80">gelesen</p></div>
          <div className="rounded-xl bg-white/15 p-2"><p className="text-xl font-semibold">{studied}/{units.length}</p><p className="text-xs text-white/80">erarbeitet</p></div>
          <div className="rounded-xl bg-white/15 p-2"><p className="text-xl font-semibold">{[...statuses.values()].reduce((n, s) => n + (s?.quizSolved ?? 0), 0)}</p><p className="text-xs text-white/80">Quizfragen gelöst</p></div>
        </div>
        {next && (
          <Link href={`/lerneinheit?unit=${next.id}`} className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-ink shadow-lg sm:p-4">
            <span className="min-w-0"><span className={cx("block text-xs font-semibold uppercase", th.text)}>▶ Weiterlernen</span><span className="block truncate font-semibold">{next.marker} {next.title}</span></span>
            <span className={cx("shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold", th.solid)}>Starten</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: `/quiz?module=${id}`, label: "Quiz", icon: ListChecks },
          { href: `/karteikarten`, label: "Karteikarten", icon: Layers },
          { href: `/klausur?module=${id}`, label: "Klausurtraining", icon: Timer },
          { href: `#gesetze`, label: "Gesetze", icon: BookOpen },
        ].map((b) => (
          <Link key={b.label} href={b.href} className={cx("flex items-center gap-2 rounded-2xl bg-surface p-4 font-medium shadow-[var(--shadow-card)] ring-1 hover:brightness-95", th.ring)}>
            <b.icon size={18} className={th.text} /> {b.label}
          </Link>
        ))}
      </div>

      {dls.length > 0 && (
        <div className="flex flex-wrap gap-2">{dls.map((d) => <Badge key={d.id} tone={d.status === "confirmed" ? "ok" : "warn"}>{d.title.replace(/^.*?–\s*/, "")}: {d.date.split("-").reverse().join(".")}{d.end_date ? `–${d.end_date.split("-").reverse().join(".")}` : ""}</Badge>)}</div>
      )}

      <div>
        <SectionTitle>Themen – alles freigeschaltet, beliebig anklickbar</SectionTitle>
        <p className="mb-3 text-sm text-ink-soft">Legende: <span className="text-ok">✓ gelesen</span> · Quiz gelöst/gesamt · ⚖ Fall bearbeitet · ★ erarbeitet. Die Reihenfolge des Lernplans ist ein Vorschlag – du kannst jederzeit springen.</p>
        <div className="space-y-6">
          {kes.map((ke) => (
            <div key={String(ke)}>
              {ke != null && <p className="mb-2 font-semibold">Kurseinheit {ke}</p>}
              <Card>
                <ul className="divide-y divide-line">
                  {topics.filter((t) => t.ke === ke && t.kind !== "meta").map((t) => {
                    const p = prog.get(t.id);
                    const st = statuses.get(t.id);
                    const lesson = t.parent_id ? null : lessonsForTopic(t.id)[0];
                    const isUnit = unitIds.has(t.id);
                    return (
                      <li key={t.id} className={cx("flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center", t.level === 2 ? "sm:pl-10" : "bg-canvas/50")}>
                        <div className="min-w-0 flex-1">
                          <p className={t.level === 1 ? "font-semibold" : "text-[15px]"}>
                            {p?.status === "studied" && <span className="mr-1 text-amber-500">★</span>}{t.marker} {t.title}
                          </p>
                          <p className="text-xs text-ink-faint">
                            {t.placeholder ? "Platzhalter – Unterlagen fehlen" : t.pdf_start ? `S. ${t.pdf_start}–${t.pdf_end}` : ""}
                            {t.kind === "study" && t.est_minutes ? ` · ca. ${formatMinutes(t.est_minutes)}` : ""}
                            {t.kind === "solutions" ? "Lösungen zu den Selbsttestaufgaben" : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {st && isUnit && (
                            <>
                              <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", st.read ? "bg-ok-soft text-ok" : "bg-canvas text-ink-faint ring-1 ring-line")}>{st.read ? "✓ gelesen" : `${st.readSections}/${st.totalSections} gelesen`}</span>
                              <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", st.quizSolved === st.quizTotal && st.quizTotal ? "bg-ok-soft text-ok" : st.quizTried ? "bg-warn-soft text-warn" : "bg-canvas text-ink-faint ring-1 ring-line")}>Quiz {st.quizSolved}/{st.quizTotal}</span>
                            </>
                          )}
                          {lesson && t.level === 1 && <Link href={`/lektion/${lesson.id}`} className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", th.soft)}><BookOpen size={12} /> Lerneinheit</Link>}
                          {lesson && t.level === 1 && <Link href={`/lektion/${lesson.id}?tab=Quiz`} className={cx("rounded-full px-2.5 py-0.5 text-xs font-medium", th.soft)}>Quiz</Link>}
                          {isUnit && <Link href={`/lerneinheit?unit=${t.id}`} className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", th.solid)}>▶ Lernen</Link>}
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

      {extras.length > 0 && (
        <div>
          <SectionTitle>Vertiefung & Training</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {extras.map((l) => (
              <Link key={l.id} href={`/lektion/${l.id}`}><Card className="h-full hover:brightness-[0.98]"><CardBody className="p-4 sm:p-5">
                <Badge tone="brand">{l.kind === "drill" ? "Klausurtraining" : "Vertiefung"}</Badge>
                <p className="mt-2 font-semibold">{l.title}</p>
                <p className="text-sm text-ink-soft">{l.quiz.length} Aufgaben</p>
              </CardBody></Card></Link>
            ))}
          </div>
        </div>
      )}

      {kernUnique.length > 0 && (
        <div id="gesetze">
          <SectionTitle>Gesetze, die du für dieses Fach kennen musst</SectionTitle>
          <Card><CardBody>
            <ul className="divide-y divide-line">
              {kernUnique.map((k) => {
                const url = normUrl(k.norm);
                return (
                  <li key={k.norm} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-3">
                    {url ? <a href={url} target="_blank" rel="noreferrer" className="w-56 shrink-0 font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2">{k.norm}</a> : <span className="w-56 shrink-0 font-semibold text-emerald-700">{k.norm}</span>}
                    <span className="text-[15px] text-ink-soft">{k.inhalt} <span className="text-xs text-ink-faint">· {k.lesson}</span></span>
                  </li>
                );
              })}
            </ul>
          </CardBody></Card>
        </div>
      )}

      <div>
        <SectionTitle aside={<Link href="/bibliothek" className="text-sm text-brand-600">Hochladen</Link>}>Originaldokumente (nur zum Nachschlagen)</SectionTitle>
        {docs.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {docs.map((d) => (
              <Link key={d.id} href={`/bibliothek/${d.id}`}><Card className="hover:brightness-[0.98]"><CardBody className="flex items-center gap-3 p-4 sm:p-4"><FileText size={18} className={th.text} /><span className="flex-1 text-[15px]">{d.title}</span><span className="text-sm text-ink-faint">{d.page_count} S.</span></CardBody></Card></Link>
            ))}
          </div>
        ) : <p className="text-sm text-ink-soft">Noch keine Dokumente – optional in der <Link className="text-brand-600 underline" href="/bibliothek">Bibliothek</Link> hochladen.</p>}
        <div className="mt-3"><CountBar value={studied} max={units.length} label="Abschnitte erarbeitet" tone="ok" /></div>
      </div>
    </div>
  );
}
