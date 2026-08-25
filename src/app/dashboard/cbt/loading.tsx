import { SkeletonTable } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-80 animate-pulse rounded bg-slate-100" />
      </div>
      <SkeletonTable />
    </>
  );
}
