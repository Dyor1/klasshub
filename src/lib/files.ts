export const FILE_BUCKET = "school-files";
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // matches the bucket limit

export type FileKind = "class-notes" | "lesson-notes" | "assignments";

/** Object paths are {school_id}/{kind}/[owner/]{unique}-{name}.
 *
 *  The shape is load-bearing, not cosmetic: storage RLS reads the school from
 *  segment 1 and the kind from segment 2. For assignments it also reads the
 *  uploader from segment 3, which is how a student is confined to their own
 *  folder — so `owner` is required for that kind. */
export function buildFilePath(
  schoolId: string,
  kind: FileKind,
  fileName: string,
  owner?: string
) {
  if (kind === "assignments" && !owner) {
    throw new Error("Assignment uploads need an owner segment for storage RLS.");
  }

  const safe = fileName
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(-120);

  const prefix = owner ? `${schoolId}/${kind}/${owner}` : `${schoolId}/${kind}`;
  return `${prefix}/${crypto.randomUUID()}-${safe}`;
}

export function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
