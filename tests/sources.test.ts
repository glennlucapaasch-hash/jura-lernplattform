import { describe, it, expect } from "vitest";
import { checkAnswer, stripInvalidCitations } from "@/lib/ai/sources";
import type { Passage } from "@/lib/repo/documents";

const p = (ref: string, text: string): Passage => ({ ref, docId: "d", docKey: "BGB_2", docTitle: "BGB AT – KE 2", moduleId: "55101", page: 30, printedPage: 30, text, score: 0 });

describe("source verification", () => {
  const passages = [p("Q1", "Nach § 130 Abs. 1 S. 1 BGB wird die Erklärung mit Zugang wirksam. Vgl. BGHZ 91, 324. Die §§ 116–118 regeln …")];
  it("detects invalid citations and unverified norms/decisions", () => {
    const ans = "Die Erklärung wird mit Zugang wirksam [Q1]. Siehe auch [Q4], § 312 BGB, § 117 BGB und BGH NJW 2002, 363 sowie BGHZ 91, 324.";
    const c = checkAnswer(ans, passages);
    expect(c.cited).toEqual(["Q1"]);
    expect(c.invalidCitations).toEqual(["Q4"]);
    expect(c.unverifiedNorms).toEqual(["§ 312 BGB"]);
    expect(c.unverifiedDecisions).toEqual(["BGH NJW 2002, 363"]);
    expect(stripInvalidCitations(ans, passages)).not.toContain("[Q4]");
  });
  it("flags missing sources", () => {
    expect(checkAnswer("x", []).noSources).toBe(true);
  });
});
