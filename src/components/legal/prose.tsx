import Link from "next/link";

/** A decision only the business can make.
 *
 *  Rendered loudly on purpose. A legal page is the one place where a quiet
 *  placeholder is dangerous: an unfilled retention period or a missing company
 *  name reads as a commitment either way, and nobody proofreads a policy page
 *  after the first week. If one of these ships, it should be embarrassing
 *  rather than invisible. */
export function Fill({ children }: { children: React.ReactNode }) {
  return (
    <mark className="mx-0.5 rounded bg-amber-400/30 px-1.5 py-0.5 font-semibold text-amber-900 ring-1 ring-amber-500/40 dark:text-amber-100">
      [{children}]
    </mark>
  );
}

export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: React.ReactNode;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <Link
        href="/"
        className="text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
      >
        &larr; Back to site
      </Link>

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-ink-subtle">Last updated {updated}</p>

      <div className="mt-6 rounded-2xl border border-line-soft bg-card p-5 text-[15px] leading-relaxed text-ink-muted">
        {intro}
      </div>

      <div className="mt-10 space-y-10">{children}</div>
    </article>
  );
}

export function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold tracking-tight text-ink">{heading}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-muted">
        {children}
      </div>
    </section>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500/60" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Two-column table for the "what we collect" and "who sees it" sections,
 *  which are the parts a parent or a school actually reads. */
export function DefTable({ rows }: { rows: [React.ReactNode, React.ReactNode][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line-soft">
      <table className="w-full text-left text-[15px]">
        <tbody className="divide-y divide-line-soft">
          {rows.map(([term, detail], i) => (
            <tr key={i} className="align-top">
              <th scope="row" className="w-1/3 min-w-40 bg-sunken px-4 py-3 font-semibold text-ink">
                {term}
              </th>
              <td className="px-4 py-3 text-ink-muted">{detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
