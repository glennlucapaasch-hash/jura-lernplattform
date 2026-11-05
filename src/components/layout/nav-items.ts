export interface NavItem { href: string; label: string; icon: string; module?: string }
export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Heute & Planung",
    items: [
      { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/lernplan", label: "Lernplan", icon: "CalendarDays" },
      { href: "/termine", label: "Termine & Fristen", icon: "AlarmClock" },
      { href: "/einsendeaufgaben", label: "Einsendeaufgaben", icon: "ClipboardList" },
      { href: "/hausarbeit", label: "Kurzhausarbeit BGB", icon: "FileText" },
    ],
  },
  {
    title: "Fächer",
    items: [
      { href: "/module/55101", label: "BGB AT", icon: "Dot", module: "55101" },
      { href: "/module/55104", label: "Verfassungsrecht", icon: "Dot", module: "55104" },
      { href: "/module/55100", label: "Propädeutikum", icon: "Dot", module: "55100" },
    ],
  },
  {
    title: "Üben",
    items: [
      { href: "/quiz", label: "Quiz", icon: "ListChecks" },
      { href: "/karteikarten", label: "Karteikarten", icon: "Layers" },
      { href: "/gutachten", label: "Gutachtenstil", icon: "PenLine" },
      { href: "/klausur", label: "Klausurtraining", icon: "Timer" },
    ],
  },
  {
    title: "Mehr",
    items: [
      { href: "/fortschritt", label: "Lernfortschritt", icon: "TrendingUp" },
      { href: "/dozent", label: "KI-Dozent", icon: "GraduationCap" },
      { href: "/bibliothek", label: "Bibliothek", icon: "BookOpen" },
      { href: "/module", label: "Alle Module", icon: "Library" },
      { href: "/archiv", label: "Archiv & Suche", icon: "Search" },
      { href: "/einstellungen", label: "Einstellungen", icon: "Settings" },
    ],
  },
]

export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** Items shown in the iPhone bottom bar; everything else lives under "Mehr". */
export const MOBILE_PRIMARY = ["/", "/lernplan", "/quiz", "/karteikarten"];
