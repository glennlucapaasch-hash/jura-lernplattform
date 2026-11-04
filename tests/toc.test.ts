import { describe, it, expect } from "vitest";
import { parseToc, buildTopics } from "@/lib/docs/toc";
const toc = `Inhaltsverzeichnis
§3 Das Wirksamwerden von Willenserklärungen ............................ 29
I. Die Empfangsbedürftigkeit von Willenserklärungen ..................... 29
II. Der Zugang ........................................................ 30
1. Willenserklärungen unter Anwesenden ............................... 30
IV. Von § 130 BGB abweichende Vereinbarungen über die
Erklärungswirkung .................................................. 40
VII. Der gemeinsame Motivirrtum – die Störung der Geschäftsgrundlage
§ 313 BGB ........................................................... 41
Lösungen zu den Selbsttestaufgaben .................................... 51`;
describe("toc", () => {
  const pages = [{ page: 1, text: "" }, { page: 2, text: "" }, { page: 3, text: toc }, ...Array.from({ length: 50 }, (_, i) => ({ page: i + 4, text: "wort ".repeat(10) }))];
  it("parses levels and joins wrapped titles", () => {
    const e = parseToc(pages);
    expect(e[0]).toMatchObject({ level: 1, marker: "§ 3", printedPage: 29 });
    expect(e.find((x) => x.marker === "IV.")!.title).toBe("Von § 130 BGB abweichende Vereinbarungen über die Erklärungswirkung");
    expect(e.find((x) => x.marker === "VII.")!.title).toContain("§ 313 BGB");
    expect(e.filter((x) => x.marker === "§ 313")).toHaveLength(0);
    expect(e.at(-1)!.title).toBe("Lösungen zu den Selbsttestaufgaben");
  });
  it("builds topic tree with page ranges", () => {
    const t = buildTopics(pages, parseToc(pages), 0);
    expect(t[0].key).toBe("s3");
    expect(t[0].children[1].key).toBe("s3-ii");
    expect(t[0].children[1].pdfStart).toBe(30);
  });
});
