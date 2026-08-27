"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FILE_BUCKET,
  MAX_FILE_BYTES,
  buildFilePath,
  formatBytes,
  type FileKind,
} from "@/lib/files";

export type UploadedFile = {
  path: string;
  name: string;
  size: number;
  type: string;
};

/** Uploads straight from the browser to Storage and reports the resulting
 *  path. Server Actions cap request bodies, so routing a 20MB PDF through one
 *  would fail; this keeps the file off that path entirely. */
export default function FileField({
  schoolId,
  kind,
  owner,
  value,
  onChange,
  label = "File",
  required,
}: {
  schoolId: string;
  kind: FileKind;
  /** Required for assignment uploads — storage RLS confines a student to a
   *  folder named after their own profile id. */
  owner?: string;
  value: UploadedFile | null;
  onChange: (f: UploadedFile | null) => void;
  label?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File) {
    setError(null);

    if (file.size > MAX_FILE_BYTES) {
      setError(`That file is ${formatBytes(file.size)} — the limit is 20 MB.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const path = buildFilePath(schoolId, kind, file.name, owner);

    const { error: upErr } = await supabase.storage
      .from(FILE_BUCKET)
      .upload(path, file, { upsert: false });

    setBusy(false);

    if (upErr) {
      setError(upErr.message);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    onChange({ path, name: file.name, size: file.size, type: file.type });
  }

  async function clear() {
    if (value) {
      const supabase = createClient();
      await supabase.storage.from(FILE_BUCKET).remove([value.path]);
    }
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-brand-600"> *</span>}
      </span>

      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-emerald-900">{value.name}</p>
            <p className="text-xs text-emerald-700">{formatBytes(value.size)} · uploaded</p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500 transition-colors hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700 disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Choose a file (max 20 MB)"}
        </button>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
        }}
      />

      {/* Submitted with the form so the Server Action records the file. */}
      <input type="hidden" name="file_path" value={value?.path ?? ""} />
      <input type="hidden" name="file_name" value={value?.name ?? ""} />
      <input type="hidden" name="file_size" value={value?.size ?? ""} />
      <input type="hidden" name="file_type" value={value?.type ?? ""} />
    </div>
  );
}
