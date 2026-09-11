export default function Loading() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-sunken" />
        <div className="h-3 w-80 animate-pulse rounded bg-sunken" />
      </div>
      <div className="kh-clay rounded-2xl border border-line-soft bg-card p-6">
        <div className="h-3 w-36 animate-pulse rounded bg-sunken" />
        <div className="mt-4 h-32 animate-pulse rounded-2xl bg-sunken" />
        <div className="mt-4 h-11 w-40 animate-pulse rounded-2xl bg-sunken" />
      </div>
    </>
  );
}
