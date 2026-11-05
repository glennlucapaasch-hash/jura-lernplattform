"use client";
import { Pause, Play, Square, RotateCcw, SkipBack, SkipForward, Volume2, Mic, MicOff } from "lucide-react";
import { useSpeech, useDictation } from "./useSpeech";
import { cx } from "@/components/ui";

/** Compact read-aloud control for a list of text segments. */
export function SpeechBar({ segments, labels, className }: { segments: string[]; labels?: string[]; className?: string }) {
  const s = useSpeech();
  if (!s.supported) return null;
  return (
    <div className={cx("flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-1.5 text-sm", className)}>
      {!s.speaking ? (
        <button onClick={() => s.speak(segments)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-brand-700 hover:bg-brand-50">
          <Volume2 size={16} /> Vorlesen
        </button>
      ) : (
        <>
          <button onClick={s.back} title="Vorheriger Abschnitt" className="rounded-lg p-1.5 hover:bg-brand-50"><SkipBack size={16} /></button>
          {s.paused ? (
            <button onClick={s.resume} title="Fortsetzen" className="rounded-lg p-1.5 hover:bg-brand-50"><Play size={16} /></button>
          ) : (
            <button onClick={s.pause} title="Pause" className="rounded-lg p-1.5 hover:bg-brand-50"><Pause size={16} /></button>
          )}
          <button onClick={s.repeat} title="Abschnitt wiederholen" className="rounded-lg p-1.5 hover:bg-brand-50"><RotateCcw size={16} /></button>
          <button onClick={s.forward} title="Nächster Abschnitt" className="rounded-lg p-1.5 hover:bg-brand-50"><SkipForward size={16} /></button>
          <button onClick={s.stop} title="Stopp" className="rounded-lg p-1.5 hover:bg-brand-50"><Square size={16} /></button>
          {s.current != null && <span className="px-1 text-ink-faint">{labels?.[s.current] ?? `Abschnitt ${s.current + 1}/${segments.length}`}</span>}
        </>
      )}
      <select value={s.rate} onChange={(e) => s.setRate(Number(e.target.value))} className="ml-auto rounded-lg bg-transparent px-1 py-1 text-ink-soft" title="Sprechgeschwindigkeit">
        {[0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75].map((r) => <option key={r} value={r}>{r.toLocaleString("de-DE")}×</option>)}
      </select>
      {s.voices.length > 1 && (
        <select value={s.voiceURI} onChange={(e) => s.setVoice(e.target.value)} className="max-w-36 rounded-lg bg-transparent px-1 py-1 text-ink-soft" title="Stimme">
          <option value="">Stimme: automatisch</option>
          {s.voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
        </select>
      )}
    </div>
  );
}

export function DictateButton({ onText }: { onText: (t: string) => void }) {
  const d = useDictation(onText);
  if (!d.supported) return null;
  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={d.listening ? d.stop : d.start} title={d.error || "Spracheingabe"}
        className={cx("inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm", d.listening ? "animate-pulse bg-bad-soft text-bad" : "bg-brand-50 text-brand-700 hover:bg-brand-100")}>
        {d.listening ? <MicOff size={16} /> : <Mic size={16} />} {d.listening ? "Stopp – ich höre zu" : "Diktieren"}
      </button>
      {d.error && <span className="mt-1 max-w-64 text-xs text-bad">{d.error}</span>}
    </span>
  );
}
