"use client";
import { useState } from "react";
import { RotateCw } from "lucide-react";
import { Button, Card, CardBody } from "@/components/ui";
import { SourceChips } from "@/components/docs/SourceChips";
import { SpeechBar } from "@/components/speech/SpeechBar";
import type { SrcRef } from "@/lib/learning/types";

export interface ReviewCard { id: string; front: string; back: string; src: SrcRef[]; preview: Record<1 | 2 | 3 | 4, string> }

const RATINGS = [
  { r: 1, label: "Nicht gewusst", cls: "bg-bad-soft text-bad" },
  { r: 2, label: "Schwer", cls: "bg-warn-soft text-warn" },
  { r: 3, label: "Gewusst", cls: "bg-brand-50 text-brand-700" },
  { r: 4, label: "Sofort gewusst", cls: "bg-ok-soft text-ok" },
] as const;

/** Spaced-repetition review: active recall first, then self-rating → FSRS schedules the next review. */
export function FlashcardReview({ cards, onFinish }: { cards: ReviewCard[]; onFinish?: () => void }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  if (i >= cards.length)
    return <Card><CardBody className="text-center"><p className="font-semibold">Alle fälligen Karten wiederholt ({done}).</p><p className="mt-1 text-sm text-ink-soft">Die nächsten Termine wurden automatisch berechnet.</p></CardBody></Card>;
  const c = cards[i];
  async function rate(r: 1 | 2 | 3 | 4) {
    await fetch(`/api/flashcards/${c.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rating: r }) });
    setDone((d) => d + 1);
    setFlipped(false);
    if (i + 1 >= cards.length) onFinish?.();
    setI(i + 1);
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-faint">Karte {i + 1} von {cards.length}</p>
      <Card className="min-h-56">
        <CardBody>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Frage</p>
          <p className="mt-1 text-lg font-medium leading-relaxed">{c.front}</p>
          {flipped ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Antwort</p>
              <p className="mt-1 whitespace-pre-wrap text-[16px] leading-relaxed">{c.back}</p>
              <SourceChips src={c.src} className="mt-3" />
              <SpeechBar segments={[c.front, c.back]} className="mt-3" />
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink-soft">Formuliere die Antwort zuerst im Kopf oder laut – dann aufdecken.</p>
          )}
        </CardBody>
      </Card>
      {!flipped ? (
        <Button className="w-full" onClick={() => setFlipped(true)}><RotateCw size={16} /> Antwort aufdecken</Button>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATINGS.map((x) => (
            <button key={x.r} onClick={() => rate(x.r)} className={`rounded-xl px-2 py-2.5 text-sm font-medium ${x.cls}`}>
              {x.label}<span className="block text-xs font-normal opacity-75">{c.preview[x.r]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
