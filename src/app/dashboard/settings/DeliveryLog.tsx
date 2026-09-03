import { Chip } from "@/components/ui";

export type LogRow = {
  // Nullable because every column off a view is, as far as Postgres will
  // promise. In practice the id is the outbox primary key.
  id: string | null;
  channel: string | null;
  status: string | null;
  attempts: number | null;
  error: string | null;
  provider: string | null;
  queued_at: string | null;
  sent_at: string | null;
};

// An initialism, so CSS `capitalize` renders it "Sms". Spell both out.
const channelLabel: Record<string, string> = { email: "Email", sms: "SMS" };

const statusTone = {
  sent: "green",
  queued: "slate",
  sending: "blue",
  failed: "red",
  skipped: "amber",
} as const;

/** Status only, never content. message_outbox withholds subject, body and
 *  destination from every role but the worker's, so an admin can confirm a
 *  notice went out without being able to read anyone's mail. */
export default function DeliveryLog({ rows }: { rows: LogRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Nothing has been queued yet. Emails and texts appear here as they are sent.
      </p>
    );
  }

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.status ?? "unknown";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  // A skipped row almost always means a missing API key, which is the single
  // most likely reason a school thinks messaging is broken.
  const firstSkip = rows.find((r) => r.status === "skipped")?.error;

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(counts).map(([status, n]) => (
          <Chip key={status} tone={statusTone[status as keyof typeof statusTone] ?? "slate"}>
            {n} {status}
          </Chip>
        ))}
      </div>

      {firstSkip && (
        <p className="mb-4 rounded-lg border border-amber-500/35 bg-amber-500/12 px-3.5 py-2.5 text-sm text-amber-800 dark:text-amber-200">
          Messages are being queued but not delivered: <code>{firstSkip}</code>. Set the
          provider keys as Supabase function secrets and they will send on the next run.
        </p>
      )}

      <div className="kh-scroll-x overflow-x-auto">
        <table className="w-full min-w-[440px] text-sm">
          <thead>
            <tr className="border-b border-line-soft">
              {["Channel", "Status", "Tries", "Queued", "Sent"].map((h) => (
                <th
                  key={h}
                  className="py-2 text-left text-[11px] font-bold uppercase tracking-wider text-ink-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {rows.slice(0, 15).map((r) => (
              <tr key={r.id}>
                <td className="py-2.5 text-ink">
                  {r.channel ? channelLabel[r.channel] ?? r.channel : "—"}
                </td>
                <td className="py-2.5">
                  <Chip tone={statusTone[r.status as keyof typeof statusTone] ?? "slate"}>
                    {r.status ?? "—"}
                  </Chip>
                </td>
                <td className="py-2.5 tabular-nums text-ink-muted">{r.attempts ?? 0}</td>
                <td className="py-2.5 text-xs text-ink-muted">
                  {r.queued_at
                    ? new Date(r.queued_at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="py-2.5 text-xs text-ink-muted">
                  {r.sent_at
                    ? new Date(r.sent_at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
