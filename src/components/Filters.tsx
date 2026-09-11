import Link from "next/link";
import type { ReactNode } from "react";
import AutoSubmit from "./AutoSubmit";

/** Filter bars across the dashboard.
 *
 *  These are a plain GET form, not React state, and that is the whole design:
 *
 *  * **The filters live in the URL.** A head teacher can bookmark "JSS 1A,
 *    third term, unpaid", send that link to the bursar, and reload it next
 *    week. Component state cannot be shared or restored, and the back button
 *    does not undo it.
 *  * **Filtering happens in SQL, not in the browser.** PostgREST caps a
 *    response at 1000 rows, so fetching everything and filtering client-side
 *    works fine on a 200-pupil school and silently loses rows on a 1200-pupil
 *    one — with no error, just a shorter list. That is the wrong failure for
 *    software several schools share.
 *  * **It works without JavaScript**, because it is a form with a submit
 *    button. AutoSubmit only removes the extra click.
 *
 *  RLS still bounds every query underneath, so a filter can only ever narrow
 *  what a caller could already see. None of this can widen it.
 */

export function FilterBar({
  children,
  action,
  hidden,
}: {
  children: ReactNode;
  /** The route to submit back to. Defaults to the current URL. */
  action?: string;
  /** Params to preserve that this bar does not itself edit. */
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form
      method="get"
      action={action}
      className="mb-6 rounded-2xl border border-line-soft bg-card p-4 shadow-card"
    >
      {Object.entries(hidden ?? {}).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null
      )}
      <div className="flex flex-wrap items-end gap-3">{children}</div>
      <AutoSubmit />
    </form>
  );
}

export function SearchField({
  name = "q",
  defaultValue,
  placeholder = "Search…",
  label = "Search",
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
}) {
  return (
    <label className="min-w-52 flex-1">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </span>
      <span className="relative block">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="search"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          // Not auto-submitting: typing would fire a request per keystroke.
          data-no-auto-submit=""
          className="h-11 w-full rounded-2xl border border-line bg-card shadow-[var(--clay-press-top)]  pl-10 pr-3 text-sm text-ink transition-all placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12"
        />
      </span>
    </label>
  );
}

export function SelectField({
  name,
  label,
  defaultValue,
  options,
  allLabel = "All",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  /** Omit to make the select required (no blank option). */
  allLabel?: string | null;
}) {
  return (
    <label className="min-w-40">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-11 w-full rounded-2xl border border-line bg-card shadow-[var(--clay-press-top)]  px-3 text-sm text-ink transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12"
      >
        {allLabel !== null && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DateField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <label className="min-w-40">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </span>
      <input
        type="date"
        name={name}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-2xl border border-line bg-card shadow-[var(--clay-press-top)]  px-3 text-sm text-ink transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12"
      />
    </label>
  );
}

/** Submit plus a reset that is a plain link back to the bare route — so
 *  "Clear" cannot leave a stale param behind the way resetting fields would. */
export function FilterActions({
  clearHref,
  isFiltered,
}: {
  clearHref: string;
  isFiltered: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="submit"
        className="h-11 rounded-2xl bg-brand-gradient px-5 text-sm font-semibold text-white kh-clay-brand kh-clay-press transition-all hover:brightness-110"
      >
        Apply
      </button>
      {isFiltered && (
        <Link
          href={clearHref}
          className="inline-flex h-11 items-center rounded-2xl border border-line bg-card shadow-[var(--clay-press-top)]  px-4 text-sm font-medium text-ink-muted transition-colors hover:bg-hover hover:text-ink"
        >
          Clear
        </Link>
      )}
    </div>
  );
}

/** Segmented control rendered as links. Used where the options are few and
 *  worth seeing at a glance — status, published/draft — so the state is
 *  visible without opening a dropdown. */
export function SegmentedFilter({
  options,
  current,
  hrefFor,
}: {
  options: { value: string; label: string }[];
  current: string;
  hrefFor: (value: string) => string;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-sunken p-1">
      {options.map((o) => (
        <Link
          key={o.value}
          href={hrefFor(o.value)}
          aria-current={o.value === current ? "true" : undefined}
          className={`inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
            o.value === current
              ? "bg-card text-brand-700 shadow-card dark:text-brand-300"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

/** Says how many rows are on screen and, when a filter is on, what was
 *  filtered out. Without the second number a short list looks like an empty
 *  school rather than a narrow filter. */
export function ResultCount({
  shown,
  total,
  noun,
  term,
}: {
  shown: number;
  total?: number;
  noun: string;
  term?: string;
}) {
  const plural = shown === 1 ? noun : `${noun}s`;
  return (
    <p className="mb-4 text-sm text-ink-muted">
      <span className="font-semibold text-ink">{shown}</span>{" "}
      {total !== undefined && total !== shown ? (
        <>
          of {total} {noun}s
        </>
      ) : (
        plural
      )}
      {term ? (
        <>
          {" "}
          matching <span className="font-semibold text-ink">“{term}”</span>
        </>
      ) : null}
    </p>
  );
}
