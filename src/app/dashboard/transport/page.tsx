import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, Card, EmptyState, Chip, Avatar } from "@/components/ui";
import RouteForm from "./RouteForm";
import AssignForm from "./AssignForm";
import { deleteRoute, removeRider, setBoardStatus } from "./actions";

export const metadata = { title: "Transport — KlassHub" };

const boardTone = {
  not_boarded: "slate",
  boarded: "green",
  dropped_off: "brand",
} as const;

const boardLabel = {
  not_boarded: "Not boarded",
  boarded: "On board",
  dropped_off: "Dropped off",
} as const;

function timeOf(ts: string | null) {
  if (!ts) return null;
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default async function TransportPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  // RLS: staff see every rider, a student or parent only their own.
  const [{ data: routes }, { data: riders }, { data: students }] = await Promise.all([
    supabase
      .from("transport_routes")
      .select("id, name, vehicle_number, driver_name, driver_phone, capacity, pickup_points, status")
      .order("name"),
    supabase
      .from("student_transport")
      .select("id, student_id, route_id, pickup_point, board_status, board_updated_at"),
    supabase
      .from("students")
      .select("id, surname, first_name, other_names, admission_number, class_id")
      .order("surname"),
  ]);

  const studentById = new Map(
    (students ?? []).map((s) => [
      s.id,
      {
        name: [s.surname, s.first_name, s.other_names].filter(Boolean).join(" "),
        admission: s.admission_number,
      },
    ])
  );
  const routeById = new Map((routes ?? []).map((r) => [r.id, r]));

  const ridersByRoute = new Map<string, NonNullable<typeof riders>>();
  for (const r of riders ?? []) {
    const list = ridersByRoute.get(r.route_id) ?? [];
    list.push(r);
    ridersByRoute.set(r.route_id, list);
  }

  // ------------------------------------------------------ student / parent
  if (!viewer.isStaff) {
    const mine = riders ?? [];
    return (
      <>
        <PageHeader
          title="Transport"
          subtitle={
            viewer.role === "parent"
              ? "Your children's bus route and today's status."
              : "Your bus route."
          }
        />

        {mine.length === 0 ? (
          <EmptyState
            title="No transport assigned"
            hint="If your school runs a bus for you, it will appear here once assigned."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {mine.map((r) => {
              const route = routeById.get(r.route_id);
              const s = studentById.get(r.student_id);
              return (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{s?.name ?? "Student"}</p>
                      <p className="text-xs text-ink-muted">{route?.name ?? "Route"}</p>
                    </div>
                    <Chip tone={boardTone[r.board_status]}>{boardLabel[r.board_status]}</Chip>
                  </div>

                  <dl className="mt-4 space-y-2 text-sm">
                    {[
                      ["Pickup point", r.pickup_point ?? "—"],
                      ["Vehicle", route?.vehicle_number ?? "—"],
                      ["Driver", route?.driver_name ?? "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <dt className="text-ink-muted">{k}</dt>
                        <dd className="font-medium text-ink">{v}</dd>
                      </div>
                    ))}
                    {route?.driver_phone && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-muted">Driver phone</dt>
                        <dd>
                          <a
                            href={`tel:${route.driver_phone}`}
                            className="font-semibold text-brand-600 dark:text-brand-300 hover:underline"
                          >
                            {route.driver_phone}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>

                  {r.board_updated_at && (
                    <p className="mt-3 text-xs text-ink-subtle">
                      Updated {timeOf(r.board_updated_at)}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ------------------------------------------------------------------ staff
  const assigned = new Set((riders ?? []).map((r) => r.student_id));
  const unassigned = (students ?? []).filter((s) => !assigned.has(s.id));

  return (
    <>
      <PageHeader
        title="Transport"
        subtitle="Routes, riders and today's boarding."
        action={<RouteForm />}
      />

      {!routes || routes.length === 0 ? (
        <EmptyState
          title="No routes yet"
          hint="Add a route, then assign the students who ride it."
        />
      ) : (
        <>
          <Card
            title="Assign a rider"
            description="A student rides one route — assigning again moves them."
            className="mb-6"
          >
            {students && students.length > 0 ? (
              <AssignForm
                students={(students ?? []).map((s) => ({
                  id: s.id,
                  label: `${studentById.get(s.id)?.name ?? ""} (${s.admission_number})`,
                }))}
                routes={routes.map((r) => ({
                  id: r.id,
                  name: r.name,
                  pickup_points: r.pickup_points ?? [],
                }))}
              />
            ) : (
              <p className="text-sm text-ink-muted">Enrol students first.</p>
            )}
          </Card>

          <div className="space-y-5">
            {routes.map((route) => {
              const list = ridersByRoute.get(route.id) ?? [];
              const full = route.capacity != null && list.length >= route.capacity;
              return (
                <section key={route.id}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-ink">{route.name}</h2>
                      {route.vehicle_number && <Chip tone="slate">{route.vehicle_number}</Chip>}
                      <Chip tone={full ? "amber" : "slate"}>
                        {list.length}
                        {route.capacity != null ? ` / ${route.capacity}` : ""} riders
                      </Chip>
                      {route.driver_name && (
                        <span className="text-xs text-ink-muted">
                          {route.driver_name}
                          {route.driver_phone ? ` · ${route.driver_phone}` : ""}
                        </span>
                      )}
                    </div>
                    <form action={deleteRoute}>
                      <input type="hidden" name="id" value={route.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                      >
                        Delete route
                      </button>
                    </form>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-line bg-card">
                    {list.length === 0 ? (
                      <p className="px-4 py-5 text-sm text-ink-muted">
                        No riders on this route yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-line-soft">
                        {list.map((r) => {
                          const s = studentById.get(r.student_id);
                          return (
                            <li
                              key={r.id}
                              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar name={s?.name ?? "?"} />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-ink">
                                    {s?.name ?? "Student"}
                                  </p>
                                  <p className="text-xs text-ink-subtle">
                                    {r.pickup_point ?? "No pickup point"}
                                    {r.board_updated_at ? ` · ${timeOf(r.board_updated_at)}` : ""}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {(["not_boarded", "boarded", "dropped_off"] as const).map((st) => (
                                  <form key={st} action={setBoardStatus}>
                                    <input type="hidden" name="id" value={r.id} />
                                    <input type="hidden" name="board_status" value={st} />
                                    <button
                                      type="submit"
                                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        r.board_status === st
                                          ? "bg-brand-gradient text-white"
                                          : "border border-line text-ink-muted hover:bg-hover"
                                      }`}
                                    >
                                      {boardLabel[st]}
                                    </button>
                                  </form>
                                ))}
                                <form action={removeRider}>
                                  <input type="hidden" name="id" value={r.id} />
                                  <button
                                    type="submit"
                                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                  >
                                    Remove
                                  </button>
                                </form>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {unassigned.length > 0 && (
            <p className="mt-6 rounded-lg border border-line bg-card px-4 py-3 text-sm text-ink-muted">
              {unassigned.length} student{unassigned.length === 1 ? "" : "s"} not on any route.
            </p>
          )}
        </>
      )}
    </>
  );
}
