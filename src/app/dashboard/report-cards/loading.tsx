import { SkeletonTable } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <div className="h-7 w-44 animate-pulse rounded bg-sunken" />
        <div className="h-3 w-72 animate-pulse rounded bg-sunken" />
      </div>
      <SkeletonTable />
    </>
  );
}
