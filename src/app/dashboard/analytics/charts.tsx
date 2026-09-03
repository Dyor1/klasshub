/** Hand-rolled SVG charts.
 *
 *  No charting library on purpose: everything here is static once rendered, so
 *  a client bundle would buy nothing. These stay server components and ship
 *  zero JavaScript. */

/** Colour ramp keyed to performance, so a weak number looks weak at a glance
 *  without anyone reading the axis. */
export function toneFor(pct: number): { bar: string; text: string } {
  if (pct >= 70) return { bar: "#059669", text: "text-emerald-700 dark:text-emerald-300" };
  if (pct >= 50) return { bar: "#4f46e5", text: "text-brand-700 dark:text-brand-300" };
  if (pct >= 40) return { bar: "#d97706", text: "text-amber-700 dark:text-amber-300" };
  return { bar: "#dc2626", text: "text-red-700 dark:text-red-300" };
}

/** One labelled horizontal bar, scaled 0–100. */
export function BarRow({
  label,
  sublabel,
  value,
  suffix = "%",
  color,
}: {
  label: string;
  sublabel?: string;
  value: number;
  suffix?: string;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = toneFor(value);

  // Stacked rather than a single row: the sublabel carries the entry count and
  // the min-max spread, which a fixed-width label column truncated away on
  // anything narrower than a desktop.
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium text-ink">{label}</p>
        <span className={`shrink-0 text-sm font-bold tabular-nums ${tone.text}`}>
          {value.toFixed(1)}
          {suffix}
        </span>
      </div>
      {sublabel && <p className="mt-0.5 text-[11px] text-ink-subtle">{sublabel}</p>}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color ?? tone.bar }}
        />
      </div>
    </div>
  );
}

/** Vertical columns — used for the grade spread, where the category order
 *  matters more than the magnitude. */
export function Columns({
  data,
}: {
  data: { label: string; value: number; color?: string }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex items-end gap-2 sm:gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <span className="text-xs font-bold tabular-nums text-ink">{d.value}</span>
          <div
            className="w-full rounded-t-lg transition-all"
            style={{
              // Floor at 4px so an empty band is still visibly a band.
              height: `${Math.max(4, (d.value / max) * 120)}px`,
              backgroundColor: d.color ?? "#4f46e5",
            }}
          />
          <span className="w-full truncate text-center text-xs font-semibold text-ink-muted">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Attendance over time. preserveAspectRatio is off so the line fills any
 *  width; non-scaling-stroke keeps it from being stretched with it. */
export function Sparkline({
  points,
  height = 120,
}: {
  points: { label: string; value: number }[];
  height?: number;
}) {
  if (points.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-ink-subtle">
        Not enough days marked yet to draw a trend.
      </p>
    );
  }

  const W = 100;
  const H = 40;
  const pad = 2;

  // Fixed 0–100 scale: attendance is a percentage, and auto-scaling would make
  // a drop from 99% to 97% look like a collapse.
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - pad - (Math.max(0, Math.min(100, v)) / 100) * (H - pad * 2);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`Attendance from ${first.label} to ${last.label}`}
      >
        <defs>
          <linearGradient id="kh-spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75, 100].map((g) => (
          <line
            key={g}
            x1="0"
            x2={W}
            y1={y(g)}
            y2={y(g)}
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={area} fill="url(#kh-spark)" />
        <path
          d={line}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-ink-subtle">
        <span>{first.label}</span>
        <span>{last.label}</span>
      </div>
    </div>
  );
}

/** Stacked money bar for fee collection. */
export function StackedBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div>
      <div className="flex h-3.5 overflow-hidden rounded-full bg-sunken">
        {total > 0 &&
          segments.map((s) => (
            <div
              key={s.label}
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-ink-muted">{s.label}</span>
            <span className="font-semibold text-ink">{naira(s.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function naira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}
