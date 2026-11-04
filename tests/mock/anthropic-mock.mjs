/**
 * Minimal mock of the Anthropic Messages API for offline integration tests of the AI code paths.
 * Start: node tests/mock/anthropic-mock.mjs  (port 4010)
 * App:   ANTHROPIC_API_KEY=test JURA_ANTHROPIC_BASE_URL=http://localhost:4010 npm start
 */
import http from "node:http";

const usage = { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
const issue = { quote: "hat", category: "methodisch", severity: "mittel", explanation: "Urteilsstil statt Gutachtenstil.", suggestion: "könnte … haben" };
const feedback = { score: 0.5, verdict: "teilweise richtig", summary: "Gute Richtung, aber im Urteilsstil formuliert.", rubric: [{ criterion: "Anspruchsgrundlage genannt", met: true, comment: "" }, { criterion: "Konjunktiv", met: false, comment: "fehlt" }], issues: [issue], hint: "Achte auf den Konjunktiv im Obersatz.", improved: "K könnte gegen V einen Anspruch auf Übereignung aus § 433 Abs. 1 S. 1 BGB haben." };
const src = [{ page: 8 }, { page: 999 }];
const item = (type, extra) => ({ type, level: "recall", difficulty: 1, prompt: "Frage {{1}}", options: [], answer: [], answerBool: true, blanks: [], pairs: [], items: [], modelAnswer: "", rubric: [], explanation: "x", hints: ["h"], src, ...extra });
const pack = {
  title: "Generierte Einheit", sections: [{ title: "A", short: "kurz", long: "lang", src }], definitions: [{ term: "T", text: "D", norm: "", src }], schemas: [{ title: "S", steps: ["1"], src }],
  quiz: [item("cloze", { blanks: [["x"]] }), item("mc-single", { options: ["a", "b", "c", "d"], answer: [1] }), item("mc-single", { options: ["a"], answer: [5] }), item("order", { items: ["1", "2", "3"] })],
  case: { title: "Fall", facts: "SV", question: "Frage?", steps: [{ part: "obersatz", prompt: "p", model: "m", rubric: ["r"], hints: [] }], src },
  flashcards: [{ front: "F", back: "B", src }],
};
const examCase = { title: "Übungsfall", facts: "K kauft bei V …", question: "Ansprüche K gegen V?", solution: "## Lösung\nK könnte …", problems: ["Zugang"], basis: "§ 433 I BGB", src };
const examEval = { overall: "Solide.", basisCorrect: true, basisComment: "ok", problems: [{ problem: "Zugang", recognized: "teilweise", comment: "kurz" }], structure: "ok", language: "ok", issues: [issue], strengths: ["Aufbau"], nextSteps: ["Zugang üben"], rubricScore: 0.6 };

http.createServer((req, res) => {
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    const b = JSON.parse(body || "{}");
    const sys = JSON.stringify(b.system ?? "");
    if (!req.headers["x-api-key"] && !req.headers["authorization"]) { console.log("NOAUTH", JSON.stringify(req.headers)); res.writeHead(401); return res.end("{}"); }
    const out = sys.includes("Autor von Lernmaterial") ? pack : sys.includes("Übungsklausuren") ? examCase : sys.includes("vollständige Klausurbearbeitung") ? examEval : feedback;
    const isTutor = sys.includes("persönliche juristische Dozent");
    if (b.stream) {
      res.writeHead(200, { "content-type": "text/event-stream" });
      const text = !isTutor ? JSON.stringify(out) : "Die Willenserklärung wird mit Zugang wirksam [Q1]. Vgl. auch § 999 BGB und BGH NJW 2099, 1 [Q9].\n\nFrage: Was ist Zugang?";
      const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
      ev("message_start", { message: { id: "msg_1", type: "message", role: "assistant", model: b.model, content: [], stop_reason: null, usage: { ...usage, output_tokens: 0 } } });
      ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } });
      for (const chunk of text.match(/.{1,20}/gs)) ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: chunk } });
      ev("content_block_stop", { index: 0 });
      ev("message_delta", { delta: { stop_reason: "end_turn" }, usage: { output_tokens: 120 } });
      ev("message_stop", {});
      return res.end();
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ id: "msg_2", type: "message", role: "assistant", model: b.model, content: [{ type: "text", text: JSON.stringify(out) }], stop_reason: "end_turn", usage }));
  });
}).listen(4010, () => console.log("mock on 4010"));
