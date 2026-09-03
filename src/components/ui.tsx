import Link from "next/link";
import type { ReactNode } from "react";
import { IconInbox } from "@/components/icons";

/** The colour families sections are tinted with. Passing a hue to a card or a
 *  stat tints its surface and icon, so an area of the school is recognisable
 *  before any label is read — which is what happens once someone has used this
 *  every day for a term. */
export type Hue = "people" | "learning" | "time" | "money" | "comms" | "admin";

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-subtle">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  children,
  className = "",
  hue,
  tinted = false,
  action,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  hue?: Hue;
  /** Washes the card in its hue. For cards that are the point of a page, not
   *  every card on it — tint everything and nothing stands out. */
  tinted?: boolean;
  action?: ReactNode;
}) {
  return (
    <section
      data-hue={hue}
      className={`rounded-2xl border border-line-soft p-6 shadow-card ${
        tinted ? "kh-tint" : "bg-card"
      } ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Metric tile. Renders as a link when href is supplied. */
export function StatCard({
  label,
  value,
  icon,
  href,
  hue = "people",
  hint,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  href?: string;
  hue?: Hue;
  hint?: string;
}) {
  const body = (
    <>
      <span className="kh-tint flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
        <span className="h-[22px] w-[22px]">{icon}</span>
      </span>
      <span className="min-w-0">
        <span className="block text-[28px] font-extrabold leading-none tracking-[-0.02em] text-ink">
          {value}
        </span>
        {/* Wraps rather than truncates: a stat whose label reads "Results
            rec…" is a stat nobody can use. */}
        <span className="mt-1.5 block text-[13px] font-medium leading-snug text-ink-muted">
          {label}
        </span>
        {hint && (
          <span className="mt-0.5 block text-[11px] text-ink-subtle">{hint}</span>
        )}
      </span>
    </>
  );

  const cls =
    "flex items-start gap-4 rounded-2xl border border-line-soft bg-card p-5 shadow-card transition-all duration-200";

  return href ? (
    <Link
      href={href}
      data-hue={hue}
      className={`${cls} hover:-translate-y-0.5 hover:border-line hover:shadow-card-hover`}
    >
      {body}
    </Link>
  ) : (
    <div data-hue={hue} className={cls}>
      {body}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
  icon,
  hue = "people",
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
  hue?: Hue;
}) {
  return (
    <div
      data-hue={hue}
      className="rounded-3xl border border-dashed border-line bg-card px-6 py-16 text-center"
    >
      <span className="kh-tint mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
        <span className="h-7 w-7">{icon ?? <IconInbox />}</span>
      </span>
      <p className="text-base font-bold text-ink">{title}</p>
      {hint && (
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-muted">
          {hint}
        </p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-300/60 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
    >
      {message}
    </p>
  );
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-emerald-300/60 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
      {children}
    </p>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-line bg-card px-3.5 text-sm text-ink " +
  "placeholder:text-ink-subtle transition-colors focus:border-brand-500 " +
  "focus:outline-none focus:ring-4 focus:ring-brand-500/12";

export const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-gradient px-5 " +
  "text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 " +
  "active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

export const btnGhost =
  "inline-flex h-11 items-center justify-center rounded-xl border border-line bg-card " +
  "px-5 text-sm font-semibold text-ink transition-colors hover:bg-hover";

export function LabelledField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-subtle">{hint}</span>}
    </label>
  );
}

export function Table({
  head,
  children,
  minWidth = 640,
}: {
  head: string[];
  children: ReactNode;
  /** Lower this for narrow tables. 640 forces a scroll on a phone even when
   *  three columns would have fitted. */
  minWidth?: number;
}) {
  return (
    <div className="kh-scroll-x overflow-x-auto rounded-2xl border border-line-soft bg-card shadow-card">
      <table className="w-full text-sm" style={{ minWidth: `${minWidth}px` }}>
        <thead className="border-b border-line-soft bg-sunken">
          <tr>
            {head.map((h, i) => (
              <th
                key={`${h}-${i}`}
                className="whitespace-nowrap px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.09em] text-ink-subtle"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft text-ink">{children}</tbody>
      </table>
    </div>
  );
}

/** Initials bubble used in people-shaped tables. */
export function Avatar({
  name,
  tone = "brand",
  size = "md",
}: {
  name: string;
  tone?: "brand" | "muted";
  size?: "sm" | "md";
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
        size === "sm" ? "h-8 w-8 text-[10px]" : "h-9 w-9 text-xs"
      } ${
        tone === "brand"
          ? "bg-brand-gradient text-white"
          : "bg-sunken text-ink-muted"
      }`}
    >
      {initials || "?"}
    </span>
  );
}

export const roleChip: Record<string, string> = {
  admin: "bg-brand-500/12 text-brand-600 dark:text-brand-300",
  teacher: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  student: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  parent: "bg-amber-500/14 text-amber-700 dark:text-amber-300",
};

export function Chip({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "amber" | "brand" | "blue" | "red";
}) {
  // Colour-mixed against the surface rather than fixed hex, so a chip is
  // legible on both a white card and a near-black one.
  const tones = {
    slate: "bg-sunken text-ink-muted",
    green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/14 text-amber-700 dark:text-amber-300",
    brand: "bg-brand-500/12 text-brand-600 dark:text-brand-300",
    blue: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
    red: "bg-red-500/12 text-red-700 dark:text-red-300",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Skeleton row used by route-level loading.tsx files. */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line-soft bg-card shadow-card">
      <div className="h-12 border-b border-line-soft bg-sunken" />
      <div className="divide-y divide-line-soft">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-sunken" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded bg-sunken" />
              <div className="h-2.5 w-1/5 animate-pulse rounded bg-sunken opacity-60" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-sunken" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 rounded-2xl border border-line-soft bg-card p-5 shadow-card"
        >
          <div className="h-11 w-11 animate-pulse rounded-xl bg-sunken" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-12 animate-pulse rounded bg-sunken" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-sunken opacity-60" />
          </div>
        </div>
      ))}
    </div>
  );
}
