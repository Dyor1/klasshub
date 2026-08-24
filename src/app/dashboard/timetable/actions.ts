"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";

type Weekday = Database["public"]["Enums"]["weekday"];

export type SlotState = { error: string | null; ok?: boolean };

const DAYS: Weekday[] = ["monday","tuesday","wednesday","thursday","friday","saturday"];

export async function addSlot(_prev: SlotState, formData: FormData): Promise<SlotState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can edit the timetable." };

  const classId = String(formData.get("class_id") ?? "");
  const day = String(formData.get("day_of_week") ?? "") as Weekday;
  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "").trim();
  const teacherId = String(formData.get("teacher_id") ?? "").trim();
  const room = String(formData.get("room") ?? "").trim();
  const label = String(formData.get("period_label") ?? "").trim();
  const year = String(formData.get("academic_year") ?? "").trim();

  if (!classId || !day || !start || !end || !year) {
    return { error: "Class, day, start, end and session are required." };
  }
  if (!DAYS.includes(day)) return { error: "Pick a valid day." };
  if (start >= end) return { error: "The end time must be after the start time." };

  const supabase = await createClient();
  const { error } = await supabase.from("timetable").insert({
    school_id: viewer.schoolId,
    class_id: classId,
    subject_id: subjectId || null,
    teacher_id: teacherId || null,
    day_of_week: day,
    start_time: start,
    end_time: end,
    room: room || null,
    period_label: label || null,
    academic_year: year,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/timetable");
  return { error: null, ok: true };
}

export async function deleteSlot(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("timetable").delete().eq("id", id);
  revalidatePath("/dashboard/timetable");
}
