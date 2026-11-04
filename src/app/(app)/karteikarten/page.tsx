import { PageHeader } from "@/components/ui";
import { listCards, cardPreview } from "@/lib/repo/cards";
import { listModules, listTopics } from "@/lib/repo/study";
import { CardsClient } from "./CardsClient";

export default function CardsPage() {
  const all = listCards();
  const nowIso = new Date().toISOString();
  const due = all.filter((c) => !c.suspended && c.due && c.due <= nowIso).map((c) => ({ id: c.id, front: c.front, back: c.back, src: JSON.parse(c.src), preview: cardPreview(c) }));
  const topics = new Map(listTopics().map((t) => [t.id, `${t.marker} ${t.title}`]));
  return (
    <div>
      <PageHeader title="Karteikarten" subtitle="Spaced Repetition: Karten kommen genau dann wieder, wenn du sie zu vergessen beginnst" />
      <CardsClient due={due} modules={listModules().filter((m) => m.id !== "gesetze").map((m) => ({ id: m.id, title: m.short }))}
        cards={all.map((c) => ({ id: c.id, front: c.front, back: c.back, module_id: c.module_id, topic: c.topic_id ? topics.get(c.topic_id) ?? "" : "", due: c.due, origin: c.origin, suspended: c.suspended }))} />
    </div>
  );
}
