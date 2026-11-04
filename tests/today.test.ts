import { describe, it, expect } from "vitest";
import { buildTodos } from "@/lib/learning/today";
import { splitBites } from "@/components/learn/BiteReader";

describe("Heute zu tun", () => {
  const dl = (id: string, kind: string, date: string, end: string | null = null) => ({ id, kind, title: id, date, end_date: end, time: null, note: null, done: 0 });
  it("orders urgent registration and lectures before routine items", () => {
    const t = buildTodos({
      today: "2027-01-30",
      session: { status: "planned", topic: "§ 2", minutes: 60 },
      deadlines: [dl("anm", "anmeldung", "2027-01-04", "2027-02-01"), dl("lek", "lektion", "2027-02-01"), dl("old", "klausur", "2026-01-01"), dl("far", "klausur", "2027-03-10")],
      dueCards: 12,
    });
    expect(t[0].id).toBe("anm");
    expect(t[0].tone).toBe("bad");
    expect(t.map((x) => x.id)).toContain("lek");
    expect(t.map((x) => x.id)).not.toContain("old");
    expect(t.map((x) => x.id)).not.toContain("far");
    expect(t.at(-1)!.id).toBe("cards");
  });
});

describe("Häppchen", () => {
  it("splits long text into bites and keeps headings with their paragraph", () => {
    const para = (n: number) => Array.from({ length: n }, (_, i) => `wort${i}`).join(" ");
    const md = `### Überschrift\n\n${para(60)}\n\n${para(60)}\n\n${para(60)}`;
    const b = splitBites(md);
    expect(b.length).toBeGreaterThanOrEqual(2);
    expect(b[0].startsWith("### Überschrift")).toBe(true);
    expect(b.join("\n\n").split(/\s+/).length).toBe(md.split(/\s+/).length);
  });
});
