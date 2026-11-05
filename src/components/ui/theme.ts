/** Module colour themes (static class names so Tailwind includes them). */
export interface ModuleTheme { gradient: string; solid: string; soft: string; text: string; dot: string; ring: string; emoji: string }

const THEMES: Record<string, ModuleTheme> = {
  "55101": { gradient: "bg-gradient-to-br from-indigo-500 via-brand-500 to-violet-600", solid: "bg-indigo-500 text-white", soft: "bg-indigo-50 text-indigo-700", text: "text-indigo-700", dot: "bg-indigo-500", ring: "ring-indigo-200", emoji: "📘" },
  "55104": { gradient: "bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600", solid: "bg-rose-500 text-white", soft: "bg-rose-50 text-rose-700", text: "text-rose-700", dot: "bg-rose-500", ring: "ring-rose-200", emoji: "🏛️" },
  "55100": { gradient: "bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600", solid: "bg-teal-500 text-white", soft: "bg-teal-50 text-teal-700", text: "text-teal-700", dot: "bg-teal-500", ring: "ring-teal-200", emoji: "🧭" },
};
const DEFAULT: ModuleTheme = { gradient: "bg-gradient-to-br from-slate-500 to-slate-700", solid: "bg-slate-600 text-white", soft: "bg-slate-100 text-slate-700", text: "text-slate-700", dot: "bg-slate-500", ring: "ring-slate-200", emoji: "📄" };

export function moduleTheme(moduleId: string | null | undefined): ModuleTheme {
  return (moduleId && THEMES[moduleId]) || DEFAULT;
}
