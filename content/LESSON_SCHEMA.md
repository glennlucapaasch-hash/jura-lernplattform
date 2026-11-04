# Lesson pack schema (content/lessons/<id>.json)

Every pack is authored from the FernUni course text and MUST cite pages.
`src` = { "doc": "BGB_2", "page": 8 }  (doc = file stem, page = PDF page number = printed page for BGB)

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
