/**
 * KI-Dozent: context-aware, source-grounded, Socratic tutoring (Claude API, streaming).
 */
import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { client, modelFor, logUsage, checkBudget, aiAvailable, AiUnavailableError, FALLBACK_BETA } from "./client";
import { evidenceBlock, checkAnswer, stripInvalidCitations, SOURCE_RULES, type SourceCheck } from "./sources";
import { retrieve, docByKey, type Passage } from "../repo/documents";
import { db, now, uid } from "../db";
import { getTopic, masteryByTopic, listTopics, progressMap } from "../repo/study";
import { LEVEL_LABEL } from "../learning/mastery";
import { KNOWN_MODULES } from "../docs/curriculum";

export const TUTOR_COMMANDS = [
  { id: "simpler", label: "Erkläre mir das einfacher." },
  { id: "example", label: "Gib mir ein Beispiel." },
  { id: "quiz", label: "Frag mich dazu ab." },
  { id: "hint", label: "Gib mir einen Hinweis." },
  { id: "background", label: "Erkläre mir den juristischen Hintergrund." },
  { id: "case", label: "Lass mich einen Fall lösen." },
  { id: "check", label: "Prüfe meine Formulierung." },
  { id: "harder", label: "Mach die Fragen schwieriger." },
  { id: "read", label: "Lies mir die Erklärung vor." },
] as const;

const SYSTEM = `Du bist der persönliche juristische Dozent eines Studierenden der Rechtswissenschaft an der FernUniversität in Hagen (Studiengang „Erste Juristische Prüfung“). Du sprichst Deutsch und duzt den Studierenden.

Lehrstil:
- Erkläre verständlich, aber juristisch präzise. Verwende die Begriffe und die Systematik der Studienunterlagen. Vereinfachungen dürfen die rechtliche Bedeutung nicht verändern.
- Arbeite aktiv: Nach einer Erklärung prüfst du mit einer kurzen Frage, ob der Inhalt verstanden wurde.
- Wenn eine Antwort falsch oder unvollständig ist, verrate die Lösung NICHT sofort. Gib zuerst einen gezielten Hinweis. Erst wenn der Studierende nach mehreren Hinweisen nicht weiterkommt oder ausdrücklich darum bittet, zeigst du die Lösung und erklärst sie.
- Unterscheide bei Rückmeldungen zwischen inhaltlichen, methodischen (Aufbau, Gutachtenstil) und sprachlichen Fehlern.
- Bei Fällen: Gutachtenstil (Obersatz im Konjunktiv – Definition – Subsumtion – Ergebnis). Frage zuerst nach der Anspruchs- bzw. Prüfungsgrundlage.
- „Mach die Fragen schwieriger“: Wechsle von Wiedererkennen zu Anwendung, Abgrenzung und Formulieren.
- „Lies mir die Erklärung vor“: Antworte mit einer gut vorlesbaren Fassung (keine Tabellen, keine Klammerverweise außer Quellen-IDs).
- Halte Antworten kompakt (meist 80–250 Wörter), nutze Absätze und bei Bedarf kurze Aufzählungen. Keine Überschriften der Ebene 1.
- Eine KI-Rückmeldung ist keine offizielle universitäre Bewertung; vergib keine Noten.

${SOURCE_RULES}`;

export interface TutorContext {
  moduleId?: string | null;
  topicId?: string | null;
  lessonTitle?: string;
  excerpt?: string; // e.g. the lesson section the learner is looking at
}

function learnerProfile(ctx: TutorContext): string {
  const topic = ctx.topicId ? getTopic(ctx.topicId) : undefined;
  const mod = KNOWN_MODULES.find((m) => m.id === (ctx.moduleId ?? topic?.module_id));
  const prog = progressMap();
  const mastery = masteryByTopic();
  const studied = listTopics(mod?.id)
    .filter((t) => prog.get(t.id)?.status === "studied")
    .map((t) => t.title)
    .slice(-12);
  const weak = [...mastery.entries()]
    .filter(([, m]) => m.needsReview)
    .map(([id]) => getTopic(id)?.title)
    .filter(Boolean)
    .slice(0, 6);
  const mistakes = db()
    .prepare("SELECT category, description FROM mistakes ORDER BY created_at DESC LIMIT 6")
    .all() as { category: string; description: string }[];
  const tm = topic ? mastery.get(topic.id) : undefined;
  return [
    mod ? `Modul: ${mod.id} ${mod.title}` : "Modul: nicht festgelegt",
    topic ? `Aktuelles Thema: ${topic.marker} ${topic.title}` : null,
    ctx.lessonTitle ? `Aktuelle Lerneinheit: ${ctx.lessonTitle}` : null,
    tm ? `Lernstand zum Thema: ${tm.stage}; nächster Kompetenzschritt: ${tm.nextStepLevel ? LEVEL_LABEL[tm.nextStepLevel] : "—"}` : null,
    studied.length ? `Bereits erarbeitet: ${studied.join("; ")}` : "Bereits erarbeitet: noch nichts dokumentiert",
    weak.length ? `Schwierigkeiten bei: ${weak.join("; ")}` : null,
    mistakes.length ? `Wiederkehrende Fehler: ${mistakes.map((m) => `${m.category}: ${m.description}`).join(" | ")}` : null,
    ctx.excerpt ? `Der Studierende sieht gerade diesen Lerntext:\n"""${ctx.excerpt.slice(0, 2500)}"""` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

export function gatherPassages(question: string, ctx: TutorContext, history: TutorMessage[]): Passage[] {
  const topic = ctx.topicId ? getTopic(ctx.topicId) : undefined;
  const mod = KNOWN_MODULES.find((m) => m.id === (ctx.moduleId ?? topic?.module_id));
  const lastUser = history.filter((h) => h.role === "user").slice(-1)[0]?.content ?? "";
  const q = [question, topic?.title, lastUser.slice(0, 200)].filter(Boolean).join(" ");
  let pageRange: { docId: string; from: number; to: number } | undefined;
  if (topic && mod && topic.pdf_start) {
    const doc = docByKey(`${mod.prefix.toUpperCase()}_${topic.ke ?? 1}`);
    if (doc) pageRange = { docId: doc.id, from: topic.pdf_start, to: topic.pdf_end ?? topic.pdf_start };
  }
  return retrieve(q, { moduleId: mod?.id ?? null, limit: 6, pageRange });
}

/** Streams the tutor's answer. Calls onText for each chunk; resolves with the full text and the source check. */
export async function tutorReply(opts: {
  chatId: string;
  message: string;
  ctx: TutorContext;
  onText: (t: string) => void;
}): Promise<{ text: string; passages: Passage[]; check: SourceCheck }> {
  if (!aiAvailable()) throw new AiUnavailableError();
  checkBudget();
  const history = (
    db().prepare("SELECT role, content FROM chat_messages WHERE chat_id = ? ORDER BY created_at").all(opts.chatId) as TutorMessage[]
  ).slice(-16);
  const passages = gatherPassages(opts.message, opts.ctx, history);
  const model = modelFor("tutor");
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    {
      role: "user",
      content: `${evidenceBlock(passages)}\n\n<lernkontext>\n${learnerProfile(opts.ctx)}\n</lernkontext>\n\n<nachricht>\n${opts.message}\n</nachricht>`,
    },
  ];
  const stream = client().beta.messages.stream({
    model,
    max_tokens: 4000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages,
    output_config: { effort: "medium" },
  } as Parameters<ReturnType<typeof client>["beta"]["messages"]["stream"]>[0]);
  let text = "";
  stream.on("text", (t: string) => {
    text += t;
    opts.onText(t);
  });
  const final = await stream.finalMessage();
  logUsage("tutor", final.model ?? model, final.usage);
  if (final.stop_reason === "refusal") {
    text += "\n\n(Die KI hat die Antwort abgebrochen. Bitte formuliere die Frage anders.)";
  }
  const check = checkAnswer(text, passages);
  text = stripInvalidCitations(text, passages);
  const t = now();
  db().prepare("INSERT INTO chat_messages (id, chat_id, role, content, sources, created_at) VALUES (?, ?, 'user', ?, '[]', ?)").run(uid("cm_"), opts.chatId, opts.message, t);
  db()
    .prepare("INSERT INTO chat_messages (id, chat_id, role, content, sources, created_at) VALUES (?, ?, 'assistant', ?, ?, ?)")
    .run(uid("cm_"), opts.chatId, text, JSON.stringify({ passages: passages.map(slimPassage), check }), new Date(Date.now() + 1).toISOString());
  db().prepare("UPDATE chats SET updated_at = ? WHERE id = ?").run(t, opts.chatId);
  return { text, passages, check };
}

export function slimPassage(p: Passage) {
  return { ref: p.ref, docId: p.docId, docTitle: p.docTitle, page: p.page, printedPage: p.printedPage, excerpt: p.text.slice(0, 280) };
}

export function createChat(title: string, ctx: TutorContext): string {
  const id = uid("ch_");
  db()
    .prepare("INSERT INTO chats (id, title, module_id, topic_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, title.slice(0, 120), ctx.moduleId ?? null, ctx.topicId ?? null, now(), now());
  return id;
}
