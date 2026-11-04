import { PageHeader, Notice } from "@/components/ui";
import { listLessons, getLesson } from "@/lib/repo/study";
import { aiAvailable } from "@/lib/ai/client";
import { db } from "@/lib/db";
import { GutachtenTrainer } from "./GutachtenTrainer";

export default function GutachtenPage() {
  const cases = listLessons().map((l) => getLesson(l.id)!).filter((l) => l?.case).map((l) => ({ lessonId: l.id, moduleId: l.moduleId, lessonTitle: l.title, c: l.case!, topicId: l.topicIds[0] }));
  const history = db().prepare("SELECT type, AVG(score) avg, COUNT(*) n FROM attempts WHERE type LIKE 'gutachten-%' GROUP BY type").all() as { type: string; avg: number; n: number }[];
  return (
    <div className="space-y-6">
      <PageHeader title="Gutachtenstil-Trainer" subtitle="Obersatz · Definition · Subsumtion · Ergebnis – Schritt für Schritt mit konkreter Rückmeldung" />
      {!aiAvailable() && <Notice>Ohne API-Schlüssel vergleichst du deine Formulierung selbst mit der Musterlösung und den Bewertungspunkten. Mit KI-Dozent erhältst du markierte Fehlerstellen (inhaltlich, methodisch, sprachlich) und Verbesserungsvorschläge.</Notice>}
      <GutachtenTrainer cases={cases} history={history} />
    </div>
  );
}
