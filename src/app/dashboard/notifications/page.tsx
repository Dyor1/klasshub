import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer, currentAcademicYear } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Chip, btnGhost } from "@/components/ui";
import ReminderForm from "./ReminderForm";
import PreferencesForm from "./PreferencesForm";
import { markAllRead, markRead, dismiss } from "./actions";

export const metadata = { title: "Notifications — KlassHub" };

const kindTone = {
  announcement: "brand",
  result: "green",
  attendance: "amber",
  fees: "amber",
  lesson_note: "slate",
  general: "slate",
} as const;

function ago(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function NotificationsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  // RLS restricts this to the caller's own inbox — even an admin cannot read
  // anyone else's.
  const [{ data: items }, { data: profile }, { data: prefs }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("email, phone").eq("id", viewer.id).single(),
    supabase
      .from("notification_preferences")
      .select("email_enabled, sms_enabled")
      .eq("profile_id", viewer.id)
      .maybeSingle(),
  ]);

  const unread = (items ?? []).filter((n) => !n.read_at).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up."}
        action={
          unread > 0 ? (
            <form action={markAllRead}>
              <button type="submit" className={btnGhost}>
                Mark all read
              </button>
            </form>
          ) : undefined
        }
      />

      {viewer.isAdmin && (
        <Card
          title="Chase outstanding fees"
          description="Sends an in-app reminder to everyone with a balance."
          className="mb-6"
        >
          <ReminderForm defaultYear={currentAcademicYear()} />
        </Card>
      )}

      <Card
        title="How you hear from us"
        description="These notices always appear here. Email and SMS are extra — and no school setting can switch a channel back on once you turn it off."
        className="mb-6"
      >
        <PreferencesForm
          email={profile?.email ?? null}
          phone={profile?.phone ?? null}
          // No preference row means nothing has been opted out of yet.
          emailEnabled={prefs?.email_enabled ?? true}
          smsEnabled={prefs?.sms_enabled ?? true}
        />
      </Card>

      {!items || items.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          hint="Announcements, published results, attendance alerts and fee reminders will show up here."
        />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
                n.read_at
                  ? "border-slate-200 bg-white"
                  : "border-brand-200 bg-brand-50/40"
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  n.read_at ? "bg-transparent" : "bg-brand-500"
                }`}
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-brand-900">{n.title}</p>
                  <Chip tone={kindTone[n.kind] ?? "slate"}>{n.kind.replace("_", " ")}</Chip>
                  <span className="text-xs text-slate-400">{ago(n.created_at)}</span>
                </div>
                {n.body && (
                  <p className="text-sm leading-relaxed text-slate-600">{n.body}</p>
                )}
                {n.link && (
                  <Link
                    href={n.link}
                    className="mt-1.5 inline-block text-xs font-semibold text-brand-600 hover:underline"
                  >
                    Open
                  </Link>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {!n.read_at && (
                  <form action={markRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                    >
                      Mark read
                    </button>
                  </form>
                )}
                <form action={dismiss}>
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    aria-label="Dismiss"
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
