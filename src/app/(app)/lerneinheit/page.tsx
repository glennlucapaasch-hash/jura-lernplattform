import { getOrCreateTodaySession } from "@/lib/repo/session";
import { getLesson, getTopic } from "@/lib/repo/study";
import { resolveItem } from "@/lib/repo/items";
import { listCards, cardPreview } from "@/lib/repo/cards";
import { docByKey } from "@/lib/repo/documents";
import { aiAvailable } from "@/lib/ai/client";
import type { SessionPlan } from "@/lib/learning/session";
import type { LessonPack } from "@/lib/learning/types";
import { SessionPlayer } from "./SessionPlayer";

export default function LerneinheitPage() {
  const s = getOrCreateTodaySession();
  const plan = JSON.parse(s.plan) as SessionPlan;
  const lessons: Record<string, LessonPack> = {};
  const items: Record<string, { lessonId: string; item: LessonPack["quiz"][number] }> = {};
  for (const b of plan.blocks) {
    if (b.lessonId && !lessons[b.lessonId]) { const l = getLesson(b.lessonId); if (l) lessons[l.id] = l; }
    for (const ref of b.itemIds ?? []) {
      const r = resolveItem(ref);
      if (r) items[ref] = { lessonId: r.lesson.id, item: r.item };
    }
  }
  const cardIds = new Set(plan.blocks.flatMap((b) => b.cardIds ?? []));
  const cards = listCards().filter((c) => cardIds.has(c.id)).map((c) => ({ id: c.id, front: c.front, back: c.back, src: JSON.parse(c.src), preview: cardPreview(c) }));
  const reading = plan.blocks.find((b) => b.reading)?.reading;
  const readingDoc = reading ? docByKey(reading.docKey) : undefined;
  const unit = plan.unitIds[0] ? getTopic(plan.unitIds[0]) : undefined;
  return (
    <SessionPlayer
      session={{ id: s.id, status: s.status, log: JSON.parse(s.log) }}
      plan={plan}
      lessons={lessons}
      items={items}
      cards={cards}
      readingDocId={readingDoc?.id}
      unit={unit ? { id: unit.id, title: `${unit.marker} ${unit.title}`.trim(), moduleId: unit.module_id } : undefined}
      aiReady={aiAvailable()}
    />
  );
}
