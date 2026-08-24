"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";

type BoardStatus = Database["public"]["Enums"]["board_status"];

export type RouteState = { error: string | null; ok?: boolean };

export async function createRoute(
  _prev: RouteState,
  formData: FormData
): Promise<RouteState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can manage transport." };

  const name = String(formData.get("name") ?? "").trim();
  const vehicle = String(formData.get("vehicle_number") ?? "").trim();
  const driver = String(formData.get("driver_name") ?? "").trim();
  const phone = String(formData.get("driver_phone") ?? "").trim();
  const capRaw = String(formData.get("capacity") ?? "").trim();
  const points = String(formData.get("pickup_points") ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (!name) return { error: "Give the route a name." };

  const capacity = capRaw ? Number(capRaw) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
    return { error: "Capacity must be a positive whole number." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("transport_routes").insert({
    school_id: viewer.schoolId,
    name,
    vehicle_number: vehicle || null,
    driver_name: driver || null,
    driver_phone: phone || null,
    capacity,
    pickup_points: points,
  });

  if (error) {
    if (error.code === "23505") return { error: `“${name}” already exists.` };
    return { error: error.message };
  }

  revalidatePath("/dashboard/transport");
  return { error: null, ok: true };
}

export async function deleteRoute(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("transport_routes").delete().eq("id", id);
  revalidatePath("/dashboard/transport");
}

export type AssignState = { error: string | null; ok?: boolean };

export async function assignRider(
  _prev: AssignState,
  formData: FormData
): Promise<AssignState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can assign riders." };

  const studentId = String(formData.get("student_id") ?? "");
  const routeId = String(formData.get("route_id") ?? "");
  const pickup = String(formData.get("pickup_point") ?? "").trim();

  if (!studentId || !routeId) return { error: "Pick a student and a route." };

  const supabase = await createClient();

  // A student rides one route, so re-assigning replaces rather than adds.
  const { error } = await supabase.from("student_transport").upsert(
    {
      school_id: viewer.schoolId,
      student_id: studentId,
      route_id: routeId,
      pickup_point: pickup || null,
    },
    { onConflict: "student_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/transport");
  return { error: null, ok: true };
}

export async function removeRider(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("student_transport").delete().eq("id", id);
  revalidatePath("/dashboard/transport");
}

/** Boarding state. The trigger stamps board_updated_at whenever this changes. */
export async function setBoardStatus(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("board_status") ?? "") as BoardStatus;
  if (!id || !["not_boarded", "boarded", "dropped_off"].includes(status)) return;

  const supabase = await createClient();
  await supabase.from("student_transport").update({ board_status: status }).eq("id", id);
  revalidatePath("/dashboard/transport");
}
