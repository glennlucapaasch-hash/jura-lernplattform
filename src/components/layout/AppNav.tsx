"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, CalendarDays, AlarmClock, Library, GraduationCap, ListChecks, PenLine, Timer, Layers, BookOpen, TrendingUp, Search, Settings, Menu, X, Scale, ClipboardList,
} from "lucide-react";
import { NAV, MOBILE_PRIMARY } from "./nav-items";
import { cx } from "@/components/ui";

const ICONS = { LayoutDashboard, CalendarDays, AlarmClock, Library, GraduationCap, ListChecks, PenLine, Timer, Layers, BookOpen, TrendingUp, Search, Settings, ClipboardList };

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

export function AppNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Desktop / iPad sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface/80 px-3 py-5 backdrop-blur md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white"><Scale size={18} /></span>
          <span className="leading-tight">
            <span className="block font-semibold">Jura-Lernbegleiter</span>
            <span className="block text-xs text-ink-faint">FernUni Hagen · EJP</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {NAV.map((n) => {
            const Icon = ICONS[n.icon];
            const active = isActive(path, n.href);
            return (
              <Link key={n.href} href={n.href}
                className={cx("flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] transition-colors",
                  active ? "bg-brand-50 font-medium text-brand-700" : "text-ink-soft hover:bg-brand-50/60 hover:text-ink")}>
                <Icon size={18} strokeWidth={1.8} />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* iPhone bottom bar */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.filter((n) => MOBILE_PRIMARY.includes(n.href)).map((n) => {
            const Icon = ICONS[n.icon];
            const active = isActive(path, n.href);
            return (
              <Link key={n.href} href={n.href} className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-brand-600" : "text-ink-faint")}>
                <Icon size={21} strokeWidth={1.8} />
                {n.label.replace("Karteikarten", "Karten")}
              </Link>
            );
          })}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-ink-faint">
            <Menu size={21} strokeWidth={1.8} />
            Mehr
          </button>
        </div>
      </nav>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 md:hidden" onClick={() => setOpen(false)}>
          <div className="safe-bottom absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="font-semibold">Alle Bereiche</span>
              <button onClick={() => setOpen(false)} aria-label="Schließen" className="p-2"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NAV.map((n) => {
                const Icon = ICONS[n.icon];
                return (
                  <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                    className={cx("flex flex-col items-center gap-1 rounded-2xl p-3 text-center text-xs", isActive(path, n.href) ? "bg-brand-50 text-brand-700" : "text-ink-soft")}>
                    <Icon size={22} strokeWidth={1.8} />
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
