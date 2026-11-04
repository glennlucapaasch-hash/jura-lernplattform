/**
 * "Heute zu tun": turns the plan, deadlines and due cards into one short, ordered to-do list.
 * Pure function so it can be tested.
 */
export interface TodoDeadline {
  id: string;
  kind: string;
  title: string;
  date: string;
  end_date: string | null;
  time: string | null;
  note: string | null;
  done: number;
}

export interface TodoItem {
  id: string;
  priority: number; // lower = more urgent
  title: string;
  detail?: string;
  href?: string;
  tone: "brand" | "warn" | "bad" | "ok";
  done?: boolean;
}

function days(a: string, b: string) {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
}

const WEEKDAY = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
function when(today: string, date: string) {
  const n = days(today, date);
  if (n === 0) return "heute";
  if (n === 1) return "morgen";
  if (n < 7) return `am ${WEEKDAY[new Date(date + "T12:00:00Z").getUTCDay()]}`;
  return `in ${n} Tagen`;
}
const de = (iso: string) => iso.split("-").reverse().join(".");

export function buildTodos(opts: {
  today: string;
  session: { status: string; topic: string; minutes: number };
  deadlines: TodoDeadline[];
  dueCards: number;
}): TodoItem[] {
  const { today } = opts;
  const out: TodoItem[] = [];
  out.push({
    id: "session",
    priority: 10,
    title: opts.session.status === "done" ? "Lerneinheit erledigt" : `Lerneinheit (${opts.session.minutes} Min.): ${opts.session.topic}`,
    detail: opts.session.status === "done" ? "Super – morgen geht es automatisch weiter." : "Einfach starten – die App führt dich Schritt für Schritt.",
    href: "/lerneinheit",
    tone: opts.session.status === "done" ? "ok" : "brand",
    done: opts.session.status === "done",
  });
  for (const d of opts.deadlines) {
    if (d.done) continue;
    const start = d.date;
    const end = d.end_date ?? d.date;
    const toStart = days(today, start);
    const toEnd = days(today, end);
    if (toEnd < 0) continue;
    const running = toStart <= 0 && toEnd >= 0;
    if (d.kind === "anmeldung" && (running || toStart <= 7)) {
      out.push({
        id: d.id, priority: running ? (toEnd <= 3 ? 1 : 5) : 30,
        title: running ? `Jetzt anmelden: ${d.title}` : `Bald anmelden: ${d.title}`,
        detail: running ? `Anmeldung offen bis ${de(end)} (${toEnd === 0 ? "letzter Tag!" : `noch ${toEnd} Tage`}).` : `Anmeldung öffnet ${when(today, start)} (${de(start)}).`,
        href: "/termine", tone: running && toEnd <= 3 ? "bad" : "warn",
      });
    } else if ((d.kind === "lektion" || d.kind === "ag") && toStart >= 0 && toStart <= 6) {
      out.push({
        id: d.id, priority: toStart <= 1 ? 3 : 20,
        title: `${d.title} – ${when(today, start)}`,
        detail: d.note ?? undefined, href: "/termine", tone: toStart <= 1 ? "warn" : "brand",
      });
    } else if ((d.kind === "einsendeaufgabe" || d.kind === "klausur") && toStart >= 0 && toStart <= (d.kind === "klausur" ? 14 : 7)) {
      out.push({
        id: d.id, priority: toStart <= 2 ? 2 : 15,
        title: `${d.kind === "klausur" ? "Klausur" : "Abgabe"} ${when(today, start)}: ${d.title}${d.time ? `, ${d.time} Uhr` : ""}`,
        detail: d.note ?? undefined, href: d.kind === "einsendeaufgabe" ? "/einsendeaufgaben" : "/termine", tone: toStart <= 2 ? "bad" : "warn",
      });
    } else if (d.kind === "hausarbeit" && (running || (toStart >= 0 && toStart <= 7))) {
      out.push({
        id: d.id, priority: running ? 4 : 25,
        title: running ? `Hausarbeit läuft: ${d.title} (bis ${de(end)})` : `Hausarbeit beginnt ${when(today, start)}: ${d.title}`,
        detail: d.note ?? undefined, href: "/termine", tone: running && toEnd <= 3 ? "bad" : "warn",
      });
    } else if (d.kind === "sonstiges" && (running || (toStart >= 0 && toStart <= 3))) {
      out.push({ id: d.id, priority: 35, title: d.title, detail: d.note ?? undefined, href: "/termine", tone: "brand" });
    }
  }
  if (opts.dueCards > 0)
    out.push({ id: "cards", priority: 40, title: `${opts.dueCards} Karteikarten wiederholen`, detail: "Geht auch zwischendurch in 5 Minuten – z. B. in der Bahn.", href: "/karteikarten", tone: "brand" });
  return out.sort((a, b) => a.priority - b.priority);
}
