"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  saveNotificationRoutes,
  type PrefState,
} from "../notifications/delivery-actions";
import { ErrorNote, SuccessNote } from "@/components/ui";

const initial: PrefState = { error: null };

export type Route = { kind: string; email: boolean; sms: boolean };

/** Every event a notification can be raised for, with a plain description of
 *  when it fires. Ordered by how much a parent wants it, not alphabetically. */
const KINDS: { kind: string; label: string; when: string }[] = [
  { kind: "attendance", label: "Absence alerts", when: "A child is marked absent" },
  { kind: "fees", label: "Fee reminders", when: "An admin chases an outstanding balance" },
  { kind: "result", label: "Results published", when: "A term's marks are released" },
  { kind: "announcement", label: "Announcements", when: "Anyone posts to the school" },
  { kind: "lesson_note", label: "Lesson notes", when: "A lesson note is submitted or reviewed" },
  { kind: "general", label: "Everything else", when: "Anything not covered above" },
];

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save delivery settings"}
    </button>
  );
}

export default function DeliveryRoutesForm({
  routes,
  recipientCount,
}: {
  routes: Route[];
  recipientCount: number;
}) {
  const [state, formAction] = useActionState(saveNotificationRoutes, initial);

  const byKind = new Map(routes.map((r) => [r.kind, r]));
  const [sms, setSms] = useState<Record<string, boolean>>(
    Object.fromEntries(KINDS.map((k) => [k.kind, byKind.get(k.kind)?.sms ?? false]))
  );

  const smsOn = KINDS.filter((k) => sms[k.kind]);
  // Termii is roughly ₦3.50 a page for a single-segment message.
  const perBlast = Math.round(recipientCount * 3.5);

  return (
    <form action={formAction} className="space-y-5">
      <ErrorNote message={state.error} />
      {state.ok && state.message && <SuccessNote>{state.message}</SuccessNote>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Event
              </th>
              <th className="w-20 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Email
              </th>
              <th className="w-20 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                SMS
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {KINDS.map((k) => (
              <tr key={k.kind}>
                <td className="py-3">
                  <input type="hidden" name="kind" value={k.kind} />
                  <p className="font-medium text-slate-800">{k.label}</p>
                  <p className="text-xs text-slate-400">{k.when}</p>
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    name={`email:${k.kind}`}
                    defaultChecked={byKind.get(k.kind)?.email ?? true}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    name={`sms:${k.kind}`}
                    checked={sms[k.kind] ?? false}
                    onChange={(e) =>
                      setSms((prev) => ({ ...prev, [k.kind]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {smsOn.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            SMS costs money on every send
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            You have {recipientCount} {recipientCount === 1 ? "person" : "people"} with a
            mobile number on file. At roughly ₦3.50 a text, one notice to all of them is
            about ₦{perBlast.toLocaleString("en-NG")}.{" "}
            {sms.announcement && (
              <>
                <strong>Announcements are on</strong> — that is the highest-volume event
                here, so it will be your largest line item by some distance.
              </>
            )}
          </p>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Anyone can still opt themselves out of either channel from their own
        Notifications page, and that always wins over the setting above.
      </p>

      <Save />
    </form>
  );
}
