import Link from "next/link";
import type { ReactNode } from "react";
import { IconInbox } from "@/components/icons";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900 sm:text-[28px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card ${className}`}
    >
      {title && <h2 className="text-sm font-bold text-brand-900">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

/** Metric tile. Renders as a link when href is supplied. */
export function StatCard({
  label,
  value,
  icon,
  href,
  tone = "brand",
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  href?: string;
  tone?: "brand" | "blue" | "green" | "amber";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-600 ring-brand-100",
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
  } as const;

  const body = (
    <>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}
      >
        <span className="h-[22px] w-[22px]">{icon}</span>
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-extrabold leading-tight text-brand-900">
          {value}
        </span>
        <span className="block truncate text-xs text-slate-500">{label}</span>
      </span>
    </>
  );

  const cls =
    "flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all";

  return href ? (
    <Link href={href} className={`${cls} hover:-translate-y-0.5 hover:shadow-card-hover`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
        <IconInbox className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
    >
      {message}
    </p>
  );
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
      {children}
    </p>
  );
}

export const inputClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 " +
  "placeholder:text-slate-400 transition-colors focus:border-brand-500 " +
  "focus:outline-none focus:ring-4 focus:ring-brand-500/10";

export const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-gradient px-5 " +
  "text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 " +
  "active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

export const btnGhost =
  "inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white " +
  "px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50";

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
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/70">
          <tr>
            {head.map((h, i) => (
              <th
                key={`${h}-${i}`}
                className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

/** Initials bubble used in people-shaped tables. */
export function Avatar({ name, tone = "brand" }: { name: string; tone?: "brand" | "slate" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        tone === "brand"
          ? "bg-brand-gradient text-white"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {initials || "?"}
    </span>
  );
}

export const roleChip: Record<string, string> = {
  admin: "bg-brand-100 text-brand-700",
  teacher: "bg-blue-100 text-blue-700",
  student: "bg-emerald-100 text-emerald-700",
  parent: "bg-amber-100 text-amber-700",
};

export function Chip({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "amber" | "brand" | "blue" | "red";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    brand: "bg-brand-100 text-brand-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
  } as const;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Skeleton row used by route-level loading.tsx files. */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="h-11 border-b border-slate-100 bg-slate-50/70" />
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
              <div className="h-2.5 w-1/5 animate-pulse rounded bg-slate-50" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
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
          className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card"
        >
          <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-12 animate-pulse rounded bg-slate-100" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-slate-50" />
          </div>
        </div>
      ))}
    </div>
  );
}
