"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { postAnnouncement, type PostState } from "./actions";
import { ErrorNote, LabelledField, inputClass, btnPrimary, btnGhost } from "@/components/ui";

const initial: PostState = { error: null };

const audiences = [
  { value: "everyone", label: "Everyone" },
  { value: "students", label: "Students" },
  { value: "parents", label: "Parents" },
  { value: "staff", label: "Staff only" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      {pending ? "Posting…" : "Post announcement"}
    </button>
  );
}

export default function AnnouncementForm({
  classes,
}: {
  classes: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(postAnnouncement, initial);
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState("everyone");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setOpen(false);
      setAudience("everyone");
    }
  }, [state.ok]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnPrimary}>
        New announcement
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />

      <LabelledField label="Title">
        <input name="title" required placeholder="Mid-term break" className={inputClass} />
      </LabelledField>

      <LabelledField label="Message">
        <textarea
          name="body"
          required
          rows={4}
          placeholder="Write the announcement…"
          className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
        />
      </LabelledField>

      <div className="grid gap-4 sm:grid-cols-2">
        <LabelledField label="Who should see this?">
          <select
            name="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className={inputClass}
          >
            {audiences.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </LabelledField>

        <LabelledField
          label="Limit to a class"
          hint={
            audience === "staff"
              ? "Not available for staff announcements."
              : "Leave blank to send school-wide."
          }
        >
          <select
            name="class_id"
            defaultValue=""
            disabled={audience === "staff"}
            className={`${inputClass} disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-subtle`}
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </LabelledField>
      </div>

      <div className="flex gap-2">
        <Submit />
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
          Cancel
        </button>
      </div>
    </form>
  );
}
