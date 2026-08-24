import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Role = Database["public"]["Enums"]["user_role"];

export type Viewer = {
  id: string;
  schoolId: string;
  role: Role;
  fullName: string | null;
  isStaff: boolean;
  isAdmin: boolean;
};

/** Resolves the signed-in user's profile. Redirects to /login if there is no
 *  session, and to /dashboard if the account has no profile yet (which happens
 *  only if a signup somehow skipped provisioning). */
export async function requireViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id, role, full_name")
    .eq("id", uid)
    .single();

  if (!profile) redirect("/login");

  return {
    id: profile.id,
    schoolId: profile.school_id,
    role: profile.role,
    fullName: profile.full_name,
    isStaff: profile.role === "admin" || profile.role === "teacher",
    isAdmin: profile.role === "admin",
  };
}

/** Current Nigerian-style session label, e.g. "2026/2027". Sessions roll over
 *  in September. */
export function currentAcademicYear(date = new Date()): string {
  const year = date.getFullYear();
  const start = date.getMonth() >= 8 ? year : year - 1;
  return `${start}/${start + 1}`;
}

export const TERMS = [
  { value: "first", label: "First Term" },
  { value: "second", label: "Second Term" },
  { value: "third", label: "Third Term" },
] as const;
