"use client";
import { useEffect, useRef, useState } from "react";
import { Send, AlertTriangle, Volume2 } from "lucide-react";
import Link from "next/link";
import { Button, cx } from "@/components/ui";
import { Markdown } from "@/components/docs/Markdown";
import { DictateButton } from "@/components/speech/SpeechBar";
import { useSpeech } from "@/components/speech/useSpeech";

export interface ChatPassage { ref: string; docId: string; docTitle: string; page: number; printedPage: number; excerpt: string }
interface Check { invalidCitations: string[]; unverifiedNorms: string[]; unverifiedDecisions: string[]; noSources: boolean }
interface Msg { role: "user" | "assistant"; content: string; passages?: ChatPassage[]; check?: Check; error?: string }

export const COMMANDS = [
  "Erkläre mir das einfacher.", "Gib mir ein Beispiel.", "Frag mich dazu ab.", "Gib mir einen Hinweis.", "Erkläre mir den juristischen Hintergrund.",
  "Lass mich einen Fall lösen.", "Prüfe meine Formulierung.", "Mach die Fragen schwieriger.", "Lies mir die Erklärung vor.",
];

export function TutorChat({ ctx, initialChatId, starter, compact, aiReady }: {
  ctx: { moduleId?: string | null; topicId?: string | null; lessonTitle?: string; excerpt?: string };
  initialChatId?: string; starter?: string; compact?: boolean; aiReady: boolean;
}) {
  const [chatId, setChatId] = useState<string | undefined>(initialChatId);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState(starter ?? "");
  const [busy, setBusy] = useState(false);
  const [openSrc, setOpenSrc] = useState<ChatPassage | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const speech = useSpeech();

  useEffect(() => {
    if (!initialChatId) return;
    fetch(`/api/chats/${initialChatId}`).then((r) => r.json()).then((d) =>
      setMsgs((d.messages ?? []).map((m: { role: "user" | "assistant"; content: string; sources: { passages?: ChatPassage[]; check?: Check } }) => ({ role: m.role, content: m.content, passages: m.sources?.passages, check: m.sources?.check }))),
    );
  }, [initialChatId]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const readAloud = /lies mir|vorlesen/i.test(text);
    setInput("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    const res = await fetch("/api/tutor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chatId, message: text, ctx }) });
    if (!res.ok || !res.body) {
      const d = await res.json().catch(() => ({ error: "Fehler" }));
      setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: "", error: d.error }]);
      setBusy(false);
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let full = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const ev = JSON.parse(line);
        if (ev.chatId) setChatId(ev.chatId);
        if (ev.t) { full += ev.t; setMsgs((m) => [...m.slice(0, -1), { ...m[m.length - 1], content: full }]); }
        if (ev.done) {
          const valid = new Set((ev.passages as ChatPassage[]).map((p) => p.ref));
          full = full.replace(/\[(Q\d+)\]/g, (all, id) => (valid.has(id) ? all : ""));
          setMsgs((m) => [...m.slice(0, -1), { ...m[m.length - 1], content: full, passages: ev.passages, check: ev.check }]);
        }
        if (ev.error) setMsgs((m) => [...m.slice(0, -1), { ...m[m.length - 1], error: ev.error }]);
      }
    }
    setBusy(false);
    if (readAloud && full) speech.speak(full.split(/\n{2,}/));
  }

  if (!aiReady)
    return (
      <div className="rounded-xl border border-dashed border-line p-5 text-sm text-ink-soft">
        Der KI-Dozent braucht einen Claude-API-Schlüssel. So richtest du ihn ein: <Link href="/einstellungen" className="text-brand-600 underline">Einstellungen</Link>.
      </div>
    );

  return (
    <div className={cx("flex flex-col", compact ? "h-[70vh]" : "h-[calc(100vh-14rem)] min-h-[480px]")}>
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {msgs.length === 0 && (
          <div className="rounded-2xl bg-brand-50 p-4 text-[15px] text-brand-800">
            Stell mir eine Frage zu deinem Lernstoff – ich antworte auf Grundlage deiner Unterlagen und nenne die Fundstellen. Oder wähle unten eine Anweisung.
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cx("max-w-[92%] rounded-2xl px-4 py-3", m.role === "user" ? "bg-brand-500 text-white" : "border border-line bg-surface")}>
              {m.role === "user" ? (
                <p className="whitespace-pre-wrap text-[15px]">{m.content}</p>
              ) : m.error ? (
                <p className="text-sm text-bad">{m.error}</p>
              ) : (
                <>
                  {m.content ? <Markdown text={m.content} onCite={(ref) => setOpenSrc(m.passages?.find((p) => p.ref === ref) ?? null)} /> : <p className="animate-pulse text-sm text-ink-faint">Denkt nach …</p>}
                  {m.check && (m.check.noSources || m.check.unverifiedNorms.length > 0 || m.check.unverifiedDecisions.length > 0 || m.check.invalidCitations.length > 0) && (
                    <div className="mt-3 flex gap-2 rounded-xl bg-warn-soft p-2.5 text-xs text-amber-900">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <div>
                        {m.check.noSources && <p>In deinen Unterlagen wurde keine passende Stelle gefunden – die Antwort ist nicht belegt.</p>}
                        {m.check.unverifiedNorms.length > 0 && <p>Nicht in den Quellen belegt: {m.check.unverifiedNorms.join(", ")} – bitte im Gesetz prüfen.</p>}
                        {m.check.unverifiedDecisions.length > 0 && <p>Nicht in deinen Unterlagen gefunden (möglicherweise falsch): {m.check.unverifiedDecisions.join(", ")}</p>}
                        {m.check.invalidCitations.length > 0 && <p>Ungültige Quellenverweise entfernt: {m.check.invalidCitations.join(", ")}</p>}
                      </div>
                    </div>
                  )}
                  {m.passages && m.passages.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.passages.map((p) => (
                        <button key={p.ref} onClick={() => setOpenSrc(p)} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft hover:border-brand-200">
                          {p.ref}: {p.docTitle}, S. {p.printedPage}
                        </button>
                      ))}
                      {m.content && <button onClick={() => speech.speak(m.content.split(/\n{2,}/))} className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-brand-600"><Volume2 size={13} /> vorlesen</button>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      {openSrc && (
        <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm">
          <div className="mb-1 flex justify-between gap-2">
            <span className="font-medium">{openSrc.ref}: {openSrc.docTitle}, S. {openSrc.printedPage}</span>
            <button onClick={() => setOpenSrc(null)} className="text-ink-faint">schließen</button>
          </div>
          <p className="text-ink-soft">{openSrc.excerpt} …</p>
          <Link href={`/bibliothek/${openSrc.docId}?page=${openSrc.page}`} className="mt-1 inline-block font-medium text-brand-600">Im Originaldokument öffnen →</Link>
        </div>
      )}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {COMMANDS.map((c) => (
          <button key={c} disabled={busy} onClick={() => send(c)} className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink-soft hover:border-brand-200 hover:text-brand-700 disabled:opacity-50">{c}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-2 flex items-end gap-2">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={2} placeholder="Deine Frage oder Antwort …"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          className="min-h-11 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-brand-400" />
        <DictateButton onText={(t) => setInput((x) => (x ? x + " " : "") + t)} />
        <Button disabled={busy || !input.trim()} aria-label="Senden"><Send size={16} /></Button>
      </form>
    </div>
  );
}
