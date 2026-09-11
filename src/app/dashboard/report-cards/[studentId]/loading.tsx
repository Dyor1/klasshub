/** The report card runs several queries plus the term-context RPC, so it is
 *  the page most likely to show a wait — and the one people open most. The
 *  skeleton mirrors the sheet's own shape rather than a generic table, so the
 *  layout does not jump when the real card arrives. */
export default function Loading() {
  return (
    <>
      <div className="kh-no-print mb-6 flex items-center justify-between gap-3">
        <div className="h-4 w-36 animate-pulse rounded bg-sunken" />
        <div className="h-11 w-44 animate-pulse rounded-2xl bg-sunken" />
      </div>

      <div className="kh-clay mx-auto max-w-3xl rounded-3xl border border-line-soft bg-card p-8">
        <div className="flex items-start justify-between gap-4 border-b-2 border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-sunken" />
            <div className="space-y-2">
              <div className="h-5 w-56 animate-pulse rounded bg-sunken" />
              <div className="h-2.5 w-28 animate-pulse rounded bg-sunken" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-sunken" />
            <div className="h-3 w-16 animate-pulse rounded bg-sunken" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 border-b border-line py-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2.5 w-16 animate-pulse rounded bg-sunken" />
              <div className="h-4 w-24 animate-pulse rounded bg-sunken" />
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-sunken" />
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-sunken" />
          ))}
        </div>
      </div>
    </>
  );
}
