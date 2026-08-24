"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";

type Audience = Database["public"]["Enums"]["announcement_audience"];

export type PostState = { error: string | null; ok?: boolean };

const AUDIENCES: Audience[] = ["everyone", "staff", "students", "parents"];

export async function postAnnouncement(
  _prev: PostState,
  formData: FormData
): Promise<PostState> {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return { error: "Only staff can post announcements." };

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "everyone") as Audience;
  const classId = String(formData.get("class_id") ?? "").trim();

  if (!title || !body) return { error: "Give the announcement a title and a message." };
  if (!AUDIENCES.includes(audience)) return { error: "Pick a valid audience." };
  if (classId && audience === "staff") {
    return { error: "Staff announcements can't be limited to a class." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    school_id: viewer.schoolId,
    title,
    body,
    audience,
    class_id: classId || null,
    created_by: viewer.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/announcements");
  return { error: null, ok: true };
}

export async function deleteAnnouncement(formData: FormData) {
  const viewer = await requireViewer();
  if (!viewer.isStaff) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id);
  revalidatePath("/dashboard/announcements");
}
