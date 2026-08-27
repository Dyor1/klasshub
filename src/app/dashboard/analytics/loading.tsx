import { SkeletonStats } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <div className="h-7 w-40 animate-pulse rounded bg-slate-100" />
        <div className="h-3.5 w-72 animate-pulse rounded bg-slate-50" />
      </div>
      <div className="mb-6 h-24 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
      <SkeletonStats />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-2xl border border-slate-200/80 bg-white"
          />
        ))}
      </div>
    </>
  );
}
