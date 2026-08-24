"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";

export type EventState = { error: string | null; ok?: boolean };

export async function createEvent(
  _prev: EventState,
  formData: FormData
): Promise<EventState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can add events." };

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("event_date") ?? "").trim();
  const time = String(formData.get("event_time") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !date) return { error: "An event needs a title and a date." };

  const supabase = await createClient();
  const { error } = await supabase.from("events").insert({
    school_id: viewer.schoolId,
    title,
    event_date: date,
    event_time: time || null,
    location: location || null,
    description: description || null,
    created_by: viewer.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/events");
  return { error: null, ok: true };
}

export async function deleteEvent(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/dashboard/events");
}
