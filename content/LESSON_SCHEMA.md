# Lesson pack schema (content/lessons/<id>.json)

Every pack is authored from the FernUni course text and MUST cite pages.
`src` = { "doc": "BGB_2", "page": 8 }  (doc = document key, page = PDF page number; see v2 rules below)

```jsonc
{
  "id": "bgb-ke2-willenserklaerung",          // kebab-case, unique
  "moduleId": "55101",
  "ke": 2,
  "topicIds": ["bgb-ke2-s2-ii"],               // ids from content/curriculum/55101.json
  "title": "Die Willenserklärung: objektiver und subjektiver Tatbestand",
  "estMinutes": 60,
  "sections": [                                 // explanation, split in 3–6 sections
    { "id": "s1", "title": "…", "short": "2–4 Sätze", "long": "ausführlich, Markdown, mit Beispiel aus dem Skript", "src": [ {"doc":"BGB_2","page":8} ] }
  ],
  "definitions": [ { "term": "Willenserklärung", "text": "…", "norm": "§§ 116 ff. BGB", "src": [..] } ],
  "schemas": [ { "title": "Prüfung Willenserklärung", "steps": ["1. …", "2. …"], "src": [..] } ],
  "quiz": [
    // type: mc-single | mc-multi | truefalse | cloze | match | order | free | case
    // level: recognize | recall | understand | apply | formulate ; difficulty: 1|2|3
    { "id": "q1", "type": "mc-single", "level": "recognize", "difficulty": 1,
      "prompt": "…", "options": ["A","B","C","D"], "answer": [1],          // indices
      "explanation": "…", "hints": ["Hinweis 1", "Hinweis 2"], "src": [..] },
    { "id": "q2", "type": "mc-multi", "...": "answer has >=2 indices; prompt must say 'Wählen Sie zwei/alle zutreffenden Antworten'" },
    { "id": "q3", "type": "truefalse", "prompt": "Aussage", "answer": true, "explanation": "…", "hints": [], "src": [] },
    { "id": "q4", "type": "cloze", "prompt": "Text mit {{1}} und {{2}}", "blanks": [["Erklärungsbewusstsein","Erklärungsbewußtsein"],["…"]], "explanation": "…" },
    { "id": "q5", "type": "match", "prompt": "Ordnen Sie zu", "pairs": [["§ 116","geheimer Vorbehalt"],["§ 117","Scheingeschäft"]], "explanation": "…" },
    { "id": "q6", "type": "order", "prompt": "Bringen Sie in Reihenfolge", "items": ["korrekt 1","korrekt 2","korrekt 3"], "explanation": "…" },
    { "id": "q7", "type": "free", "prompt": "…", "modelAnswer": "…", "rubric": ["Kernpunkt 1","Kernpunkt 2"], "hints": [] },
    { "id": "q8", "type": "case", "prompt": "Kurzer Sachverhalt + Frage", "modelAnswer": "…", "rubric": ["…"], "hints": [] }
  ],
  "case": {                                     // Gutachtenstil-Übung, Sachverhalt bevorzugt aus dem Skript
    "title": "…", "facts": "Sachverhalt", "question": "Fallfrage",
    "steps": [
      { "part": "obersatz",   "prompt": "Formulieren Sie den Obersatz.", "model": "…", "rubric": ["…"], "hints": ["…"] },
      { "part": "definition", "prompt": "…", "model": "…", "rubric": ["…"], "hints": ["…"] },
      { "part": "subsumtion", "prompt": "…", "model": "…", "rubric": ["…"], "hints": ["…"] },
      { "part": "ergebnis",   "prompt": "…", "model": "…", "rubric": ["…"], "hints": ["…"] }
    ],
    "src": [..]
  },
  "flashcards": [ { "front": "…", "back": "…", "src": [..] } ]
}
```
Rules: German; keep the course's terminology and systematics; never invent norms, cases or court decisions
not in the course text (BGH-Entscheidungen only if the Skript cites them, with the Skript page);
simplifications must not change legal meaning; every section/definition/question has src.
Order items are stored in the CORRECT order (the app shuffles). Options are shuffled by the app too.

## Additional rules (v2)
- MC items have EXACTLY 4 options. mc-single: exactly 1 correct; mc-multi: 2–3 correct.
- `src.page` is ALWAYS the PDF page number (1-based index in the PDF file), not the printed page number.
  BGB: identical. VR_1: PDF = printed + 13. VR_3: PDF = printed + 6. PROP_1: PDF = printed − 1.
  Doc keys: BGB_1…BGB_8, VR_1, VR_3, PROP_1.
- Coverage: the pack's topics have sub-sections (I., II., …) with page ranges (see content/curriculum/<module>.json,
  entries whose parentId is one of the pack's topicIds). Every sub-section must be covered by ≥1 section and
  ≥2 quiz items whose src pages fall inside its page range, because the daily session picks content by page range.
- Large topics: up to 10 sections and 20–28 quiz items so that all sub-sections are covered.
- Validate with: `npx tsx scripts/validate-content.ts content/lessons/<id>.json` (must print ✓).

## Exam case schema (content/exams/<id>.json)
```jsonc
{
  "id": "exam-bgb-stellvertretung-1", "moduleId": "55101", "topicIds": ["bgb-ke7-s16"],
  "title": "…", "difficulty": 2, "durationMin": 60,
  "facts": "Sachverhalt (150–500 Wörter)", "question": "Fallfrage",
  "solution": "Ausführliche Musterlösung im Gutachtenstil, Markdown mit Gliederung (A., I., 1.)",
  "rubric": ["Bewertungspunkt 1", "…"],      // ≥ 6 concrete points (Anspruchsgrundlage, Probleme, Ergebnis)
  "src": [{ "doc": "BGB_7", "page": 20 }]
}
```
Exam cases must be solvable with the course material; base them on the Skript's Fälle/Beispiele where possible
and vary facts so they are not identical to the lesson's Gutachten case.

## Additional fields (v3) – short learning aids
- `sections[].merksatz` (string, ≤ 25 Wörter): one catchy, memorable sentence that captures the core of the section – friendly, may be playful/proverb-like, but legally exact. Example: „Im Kasten ist er drin – gelesen ist egal, die Chance zählt.“ (Zugang).
- `sections[].norms` (string[]): the norms the learner should read in the statute for this section, exact citation form (e.g. "§ 130 Abs. 1 S. 1 BGB", "Art. 38 Abs. 1 S. 2 GG"); only norms that appear in the Studienbrief for this section.
- `kernnormen` (top level, array of { "norm": string, "inhalt": string }): 5–15 most important norms of the whole pack with a 1-line content summary („worum geht es“), in Skript order.
