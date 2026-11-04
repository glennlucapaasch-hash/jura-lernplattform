import { PageHeader, Notice } from "@/components/ui";
import { listDeadlines, listModules, today } from "@/lib/repo/study";
import { DeadlineManager } from "./DeadlineManager";

export default function TerminePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Termine & Fristen" subtitle="Anmeldungen, Einsendeaufgaben, Hausarbeit und Klausuren – mit Countdown und Erinnerungen" actions={<a href="/api/deadlines/ics" className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-[15px] font-medium hover:bg-brand-50">In Kalender übernehmen (.ics)</a>} />
      <Notice tone="warn" title="Wichtig: Offizielle Termine prüfen">
        Termine mit „unbestätigt“ stammen aus deinen eigenen Angaben oder aus Vorjahreswerten. Verbindlich sind nur die Angaben der FernUniversität (Fakultätsseiten Rechtswissenschaft, Modulseiten, Moodle und Prüfungsportal pos.fernuni-hagen.de).
        Sobald du einen Termin dort geprüft hast, setze ihn auf „bestätigt“ und trage die Quelle ein. Die Kalenderdatei erinnert dich 14, 3 und 1 Tag vorher.
      </Notice>
      <DeadlineManager initial={listDeadlines()} modules={listModules().map((m) => ({ id: m.id, short: m.short }))} today={today()} />
    </div>
  );
}
