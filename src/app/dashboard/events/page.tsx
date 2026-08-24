import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Chip } from "@/components/ui";
import EventForm from "./EventForm";
import { deleteEvent } from "./actions";

export const metadata = { title: "Events — KlassHub" };

function formatDay(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function EventsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, title, description, event_date, event_time, location")
    .order("event_date");

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (events ?? []).filter((e) => e.event_date >= today);
  const past = (events ?? []).filter((e) => e.event_date < today).reverse();

  return (
    <>
      <PageHeader
        title="Events"
        subtitle="What's coming up at your school."
        action={viewer.isStaff ? <EventForm /> : undefined}
      />

      {(events ?? []).length === 0 ? (
        <EmptyState
          title="Nothing on the calendar"
          hint={
            viewer.isStaff
              ? "Add an event and everyone at the school will see it."
              : "Events added by your school will appear here."
          }
        />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <Card>
                <p className="text-sm text-slate-500">No upcoming events.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcoming.map((e) => (
                  <Card key={e.id}>
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <span className="text-lg font-extrabold leading-none">
                          {new Date(e.event_date + "T00:00:00").getDate()}
                        </span>
                        <span className="text-[10px] font-semibold uppercase">
                          {new Date(e.event_date + "T00:00:00").toLocaleDateString("en-GB", {
                            month: "short",
                          })}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-brand-900">{e.title}</h3>
                        <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                          <span>{formatDay(e.event_date)}</span>
                          {e.event_time && <span>{e.event_time.slice(0, 5)}</span>}
                          {e.location && <span>{e.location}</span>}
                        </p>
                        {e.description && (
                          <p className="mt-2 text-sm text-slate-600">{e.description}</p>
                        )}
                      </div>

                      {viewer.isStaff && (
                        <form action={deleteEvent}>
                          <input type="hidden" name="id" value={e.id} />
                          <button
                            type="submit"
                            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </form>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Past
              </h2>
              <Card>
                <ul className="divide-y divide-slate-100">
                  {past.slice(0, 10).map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0 truncate text-sm text-slate-600">{e.title}</span>
                      <Chip tone="slate">{formatDay(e.event_date)}</Chip>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}
        </div>
      )}
    </>
  );
}
