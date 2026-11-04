"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Text-to-speech using the browser's built-in voices (Safari/macOS/iOS: free, offline-capable German voices).
 * Speaks a list of segments so single sections can be repeated; supports pause/resume and rate.
 */
export function stripForSpeech(md: string) {
  return md
    .replace(/\[(Q\d+)\]/g, "")
    .replace(/[*_`#>|]/g, "")
    .replace(/\(S\.\s*\d+[^)]*\)/g, "")
    .replace(/§§/g, "Paragraphen ")
    .replace(/§/g, "Paragraph ")
    .replace(/\bAbs\.\s*/g, "Absatz ")
    .replace(/\bS\.\s*(\d)/g, "Satz $1")
    .replace(/\bArt\.\s*/g, "Artikel ")
    .replace(/\bNr\.\s*/g, "Nummer ")
    .replace(/\bBGB\b/g, "B G B")
    .replace(/\bGG\b/g, "Grundgesetz")
    .replace(/\bz\.\s?B\./g, "zum Beispiel")
    .replace(/\bd\.\s?h\./g, "das heißt")
    .replace(/\bu\.\s?a\./g, "unter anderem")
    .replace(/\bvgl\./gi, "vergleiche")
    .replace(/\bi\.\s?V\.\s?m\./g, "in Verbindung mit")
    .replace(/\bh\.\s?M\./g, "herrschende Meinung")
    .replace(/\bc\.i\.c\./g, "culpa in contrahendo")
    .replace(/\s+/g, " ")
    .trim();
}

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [rate, setRateState] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");
  const queue = useRef<string[]>([]);
  const idx = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    try {
      const r = Number(localStorage.getItem("ttsRate"));
      if (r >= 0.5 && r <= 2) setRateState(r);
      setVoiceURI(localStorage.getItem("ttsVoice") ?? "");
    } catch {}
    const load = () => setVoices(speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("de")));
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", load);
      speechSynthesis.cancel();
    };
  }, []);

  const speakFrom = useCallback(
    (i: number) => {
      if (!supported) return;
      speechSynthesis.cancel();
      idx.current = i;
      const next = () => {
        if (idx.current >= queue.current.length) {
          setSpeaking(false);
          setCurrent(null);
          return;
        }
        const u = new SpeechSynthesisUtterance(stripForSpeech(queue.current[idx.current]));
        u.lang = "de-DE";
        u.rate = rate;
        const v = voices.find((x) => x.voiceURI === voiceURI) ?? voices.find((x) => /premium|enhanced|anna|helena|petra|markus/i.test(x.name)) ?? voices[0];
        if (v) u.voice = v;
        setCurrent(idx.current);
        u.onend = () => {
          idx.current++;
          next();
        };
        u.onerror = () => {
          setSpeaking(false);
          setCurrent(null);
        };
        speechSynthesis.speak(u);
      };
      setSpeaking(true);
      setPaused(false);
      next();
    },
    [supported, rate, voices, voiceURI],
  );

  const speak = useCallback((segments: string[] | string, start = 0) => {
    queue.current = Array.isArray(segments) ? segments : [segments];
    speakFrom(start);
  }, [speakFrom]);

  const pause = () => { speechSynthesis.pause(); setPaused(true); };
  const resume = () => { speechSynthesis.resume(); setPaused(false); };
  const stop = () => { speechSynthesis.cancel(); setSpeaking(false); setPaused(false); setCurrent(null); };
  const repeat = () => speakFrom(Math.max(0, idx.current));
  const back = () => speakFrom(Math.max(0, idx.current - 1));
  const forward = () => speakFrom(Math.min(queue.current.length - 1, idx.current + 1));
  const setRate = (r: number) => { setRateState(r); try { localStorage.setItem("ttsRate", String(r)); } catch {} };
  const setVoice = (uri: string) => { setVoiceURI(uri); try { localStorage.setItem("ttsVoice", uri); } catch {} };

  return { supported, speaking, paused, current, rate, voices, voiceURI, speak, pause, resume, stop, repeat, back, forward, setRate, setVoice };
}

type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
  onend: () => void; onerror: (e: { error: string }) => void; start: () => void; stop: () => void;
};

/** Speech input (dictation) via the Web Speech API (Safari 14.1+, Chrome). */
export function useDictation(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);
  useEffect(() => {
    const W = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    setSupported(!!(W.SpeechRecognition || W.webkitSpeechRecognition));
  }, []);
  const start = () => {
    const W = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const C = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!C) return;
    const r = new C();
    r.lang = "de-DE";
    r.interimResults = false;
    r.continuous = true;
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript;
      if (t) onText(t.trim());
    };
    r.onend = () => setListening(false);
    r.onerror = (e) => { setError(e.error === "not-allowed" ? "Mikrofonzugriff wurde nicht erlaubt." : "Spracheingabe nicht verfügbar."); setListening(false); };
    rec.current = r;
    setError("");
    r.start();
    setListening(true);
  };
  const stop = () => { rec.current?.stop(); setListening(false); };
  return { supported, listening, error, start, stop };
}
