export default function Loading() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <div className="h-7 w-44 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-white ring-1 ring-slate-200" />
        ))}
      </div>
    </>
  );
}
