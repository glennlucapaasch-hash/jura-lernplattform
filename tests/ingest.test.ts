import { describe, it, expect, beforeAll } from "vitest";
import { openTestDb } from "@/lib/db";
import { ingestDocument, retrieve, searchDocuments, listDocuments } from "@/lib/repo/documents";
import { listTopics, currentPlan, lessonsForTopic } from "@/lib/repo/study";

const sample = `Studium Rechtswissenschaft\nKurs 55101\nAllgemeiner Teil des BGB\nKurseinheit 2\n\f` +
  `Inhaltsverzeichnis\n§ 2 Rechtsgeschäft und Willenserklärung .......... 3\nI. Der Begriff "Rechtsgeschäft" ........ 3\n\f` +
  `§ 2 Rechtsgeschäft und Willenserklärung\nDer Zugang einer Willenserklärung unter Abwesenden setzt voraus, dass sie in den Machtbereich des Empfängers gelangt.\n\f` +
  `Das Erklärungsbewusstsein ist das Bewusstsein, irgendetwas rechtlich Erhebliches zu erklären.`;

describe("ingestion + retrieval", () => {
  beforeAll(() => { openTestDb(); });
  it("ingests TXT, detects module and KE, links seeded topics", async () => {
    const r = await ingestDocument("Skript.txt", new TextEncoder().encode(sample));
    expect(r.document.module_id).toBe("55101");
    expect(r.document.ke).toBe(2);
    expect(r.document.doc_key).toBe("BGB_2");
    expect(r.topicsLinked).toBeGreaterThan(0);
    const dup = await ingestDocument("Kopie.txt", new TextEncoder().encode(sample));
    expect(dup.duplicate).toBe(true);
    expect(listDocuments()).toHaveLength(1);
  });
  it("retrieves passages with page numbers", () => {
    const hits = retrieve("Was bedeutet Erklärungsbewusstsein?", { moduleId: "55101" });
    expect(hits[0].text).toContain("Erklärungsbewusstsein");
    expect(hits[0].ref).toBe("Q1");
    expect(searchDocuments("Machtbereich Empfängers")[0].snippet).toContain("[[");
  });
  it("seeded curriculum yields a plan with milestones and lessons", () => {
    expect(listTopics("55101").length).toBeGreaterThan(50);
    const { plan } = currentPlan("2026-11-04");
    expect(plan.milestones.map((m) => m.id)).toContain("ea-55101-3");
    expect(plan.days[0].items.length).toBeGreaterThan(0);
    expect(lessonsForTopic("bgb-ke2-s2-ii").length).toBe(1);
  });
});
