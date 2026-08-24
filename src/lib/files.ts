export const FILE_BUCKET = "school-files";
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // matches the bucket limit

export type FileKind = "class-notes" | "lesson-notes";

/** Object paths are {school_id}/{kind}/{unique}-{name} — storage RLS reads the
 *  school out of the first segment and the kind out of the second, so the path
 *  shape is load-bearing, not cosmetic. */
export function buildFilePath(schoolId: string, kind: FileKind, fileName: string) {
  const safe = fileName
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(-120);
  return `${schoolId}/${kind}/${crypto.randomUUID()}-${safe}`;
}

export function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
