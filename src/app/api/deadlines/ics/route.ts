import { listDeadlines } from "@/lib/repo/study";

/** Calendar export (iPhone/Mac Calendar) with reminders 14, 3 and 1 day(s) before each deadline. */
export async function GET() {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const d8 = (iso: string) => iso.replace(/-/g, "");
  const next = (iso: string) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10).replace(/-/g, ""); };
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Jura-Lernbegleiter//DE", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Jura – Termine & Fristen"];
  for (const d of listDeadlines().filter((x) => !x.done)) {
    const desc = [d.status === "unconfirmed" ? "UNBESTÄTIGT – bitte offiziell prüfen." : "Bestätigt.", d.note, d.source ? `Quelle: ${d.source}` : ""].filter(Boolean).join("\n");
    lines.push("BEGIN:VEVENT", `UID:${d.id}@jura-lernbegleiter`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d8(d.date)}`, `DTEND;VALUE=DATE:${next(d.end_date ?? d.date)}`,
      `SUMMARY:${esc(d.title)}`, `DESCRIPTION:${esc(desc)}`);
    for (const days of [14, 3, 1]) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(d.title)}`, `TRIGGER:-P${days}D`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n"), { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'attachment; filename="jura-termine.ics"' } });
}
