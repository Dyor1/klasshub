export default function Loading() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <div className="h-7 w-32 animate-pulse rounded bg-sunken" />
        <div className="h-3 w-56 animate-pulse rounded bg-sunken" />
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-card ring-1 ring-line" />
    </>
  );
}
