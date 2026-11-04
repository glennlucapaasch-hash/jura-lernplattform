import { PageHeader } from "@/components/ui";
import { aiAvailable } from "@/lib/ai/client";
import { listModules, listTopics } from "@/lib/repo/study";
import { db } from "@/lib/db";
import { DozentClient } from "./DozentClient";

export default async function DozentPage({ searchParams }: { searchParams: Promise<{ chat?: string; topic?: string }> }) {
  const sp = await searchParams;
  const chats = db().prepare("SELECT id, title, updated_at FROM chats ORDER BY updated_at DESC LIMIT 30").all() as { id: string; title: string; updated_at: string }[];
  const modules = listModules().filter((m) => m.id !== "gesetze").map((m) => ({ id: m.id, title: m.short }));
  const topics = listTopics().filter((t) => t.level === 1 && t.kind === "study").map((t) => ({ id: t.id, moduleId: t.module_id, title: `${t.ke ? `KE ${t.ke} · ` : ""}${t.marker} ${t.title}` }));
  return (
    <div>
      <PageHeader title="KI-Dozent" subtitle="Fragen, erklären lassen, abfragen lassen – auf Grundlage deiner Unterlagen, mit Fundstellen" />
      <DozentClient aiReady={aiAvailable()} chats={chats} modules={modules} topics={topics} initialChat={sp.chat} initialTopic={sp.topic} />
    </div>
  );
}
