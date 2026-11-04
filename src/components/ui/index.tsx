/** Small, consistent design-system primitives (Tailwind). */
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("p-5 sm:p-6", className)}>{children}</div>;
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
const variants: Record<Variant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm",
  secondary: "bg-surface text-ink border border-line hover:bg-brand-50",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  ghost: "text-ink-soft hover:bg-brand-50 hover:text-ink",
  danger: "bg-bad-soft text-bad hover:bg-red-100",
};
const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-[15px]", lg: "h-12 px-6 text-base" };

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: { href: string; variant?: Variant; size?: keyof typeof sizes; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}

const tones = {
  neutral: "bg-slate-100 text-slate-700",
  brand: "bg-brand-50 text-brand-700",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
};
export function Badge({ tone = "neutral", children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[15px] font-semibold uppercase tracking-wide text-ink-faint">{children}</h2>
      {aside}
    </div>
  );
}

/** Bar for countable progress (e.g. 12 von 95 Abschnitten). Always shows the absolute numbers. */
export function CountBar({ value, max, label, tone = "brand" }: { value: number; max: number; label?: string; tone?: "brand" | "ok" | "warn" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const bar = tone === "ok" ? "bg-ok" : tone === "warn" ? "bg-warn" : "bg-brand-500";
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-sm text-ink-soft">
          <span>{label}</span>
          <span className="tabular-nums">
            {value} / {max}
          </span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-brand-50">
        <div className={cx("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface/60 p-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "brand", title, children }: { tone?: "brand" | "warn" | "bad" | "ok"; title?: string; children: ReactNode }) {
  const t = {
    brand: "border-brand-200 bg-brand-50 text-brand-800",
    warn: "border-amber-200 bg-warn-soft text-amber-900",
    bad: "border-red-200 bg-bad-soft text-red-900",
    ok: "border-emerald-200 bg-ok-soft text-emerald-900",
  }[tone];
  return (
    <div className={cx("rounded-xl border px-4 py-3 text-sm", t)}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) {
  return new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("de-DE", opts);
}

export function formatMinutes(m: number) {
  if (m < 60) return `${Math.round(m)} Min.`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r ? `${h} Std. ${r} Min.` : `${h} Std.`;
}
