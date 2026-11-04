"use client";
import { useState } from "react";
import { TutorChat } from "@/components/tutor/TutorChat";
import { cx } from "@/components/ui";

export function DozentClient({ aiReady, chats, modules, topics, initialChat, initialTopic }: {
  aiReady: boolean; chats: { id: string; title: string; updated_at: string }[]; modules: { id: string; title: string }[];
  topics: { id: string; moduleId: string; title: string }[]; initialChat?: string; initialTopic?: string;
}) {
  const t0 = topics.find((t) => t.id === initialTopic);
  const [moduleId, setModuleId] = useState(t0?.moduleId ?? modules[0]?.id ?? "");
  const [topicId, setTopicId] = useState(t0?.id ?? "");
  const [chat, setChat] = useState<string | undefined>(initialChat);
  const [key, setKey] = useState(0);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          <select value={moduleId} onChange={(e) => { setModuleId(e.target.value); setTopicId(""); }} className="h-9 rounded-xl border border-line bg-surface px-2 text-sm">
            {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="h-9 max-w-full flex-1 rounded-xl border border-line bg-surface px-2 text-sm">
            <option value="">Thema: allgemein</option>
            {topics.filter((t) => t.moduleId === moduleId).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button onClick={() => { setChat(undefined); setKey((k) => k + 1); }} className="h-9 rounded-xl bg-brand-50 px-3 text-sm font-medium text-brand-700">Neues Gespräch</button>
        </div>
        <TutorChat key={`${chat ?? "new"}-${key}`} aiReady={aiReady} initialChatId={chat} ctx={{ moduleId, topicId: topicId || null }} />
      </div>
      <aside className="hidden lg:block">
        <p className="mb-2 text-sm font-semibold text-ink-faint">Frühere Gespräche</p>
        <ul className="space-y-1">
          {chats.map((c) => (
            <li key={c.id}><button onClick={() => setChat(c.id)} className={cx("w-full truncate rounded-lg px-2 py-1.5 text-left text-sm", chat === c.id ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-brand-50/60")}>{c.title}</button></li>
          ))}
          {!chats.length && <li className="text-sm text-ink-faint">noch keine</li>}
        </ul>
      </aside>
    </div>
  );
}
