import { isPreview } from "@/lib/deploy-env";

/** Marks a preview deployment as one.
 *
 *  A preview carries unfilled legal placeholders and a fixture school of
 *  invented pupils. Anyone sent the link — a colleague, a prospective school,
 *  yourself in three weeks — should be able to tell at a glance that they are
 *  not looking at the live product, without having to notice the URL.
 *
 *  Renders nothing in production and nothing during local development, so it
 *  costs a boolean on every other build. */
export default function PreviewBanner() {
  if (!isPreview) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-t border-amber-500/40 bg-amber-500/95 px-4 py-2 text-center text-[13px] font-semibold text-amber-950 backdrop-blur"
    >
      <span>Preview build — not the live site.</span>
      <span className="font-normal">
        Legal pages carry unfilled placeholders and the data is a demo school.
      </span>
    </div>
  );
}
