export const NAV = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/lernplan", label: "Lernplan", icon: "CalendarDays" },
  { href: "/termine", label: "Termine & Fristen", icon: "AlarmClock" },
  { href: "/einsendeaufgaben", label: "Einsendeaufgaben", icon: "ClipboardList" },
  { href: "/module", label: "Meine Module", icon: "Library" },
  { href: "/dozent", label: "KI-Dozent", icon: "GraduationCap" },
  { href: "/quiz", label: "Quiz", icon: "ListChecks" },
  { href: "/gutachten", label: "Gutachtenstil", icon: "PenLine" },
  { href: "/klausur", label: "Klausurtraining", icon: "Timer" },
  { href: "/karteikarten", label: "Karteikarten", icon: "Layers" },
  { href: "/bibliothek", label: "Bibliothek", icon: "BookOpen" },
  { href: "/fortschritt", label: "Lernfortschritt", icon: "TrendingUp" },
  { href: "/archiv", label: "Archiv & Suche", icon: "Search" },
  { href: "/einstellungen", label: "Einstellungen", icon: "Settings" },
] as const;

/** Items shown in the iPhone bottom bar; everything else lives under "Mehr". */
export const MOBILE_PRIMARY = ["/", "/lernplan", "/dozent", "/karteikarten"];
