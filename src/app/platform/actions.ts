"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformOperator } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";

type Plan = Database["public"]["Enums"]["school_plan"];

export type PlatformState = { error: string | null; ok?: string };

const PLANS: Plan[] = ["trial", "starter", "standard", "group"];

/** Both actions call requirePlatformOperator first and then hand off to a
 *  function that checks membership again in SQL. The duplication is the point:
 *  the server action decides what to render, the database decides what is
 *  allowed, and only the second one is load-bearing. */
export async function extendTrial(
  _prev: PlatformState,
  formData: FormData
): Promise<PlatformState> {
  await requirePlatformOperator();

  const school = String(formData.get("school_id") ?? "");
  const days = Number(formData.get("days"));
  if (!school) return { error: "No school given." };
  if (!Number.isFinite(days) || days < 1 || days > 180) {
    return { error: "Extend by between 1 and 180 days." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_extend_trial", {
    p_school: school,
    p_days: days,
  });

  if (error) return { error: error.message };

  revalidatePath("/platform");
  return {
    error: null,
    ok: `Trial now ends ${new Date(data as string).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}.`,
  };
}

export async function setPlan(
  _prev: PlatformState,
  formData: FormData
): Promise<PlatformState> {
  await requirePlatformOperator();

  const school = String(formData.get("school_id") ?? "");
  const plan = String(formData.get("plan") ?? "") as Plan;
  if (!school) return { error: "No school given." };
  if (!PLANS.includes(plan)) return { error: "Unknown plan." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_set_plan", {
    p_school: school,
    p_plan: plan,
  });

  // The refusal for "roll exceeds the plan's cap" is raised in SQL and carries
  // the numbers, so it is surfaced as-is rather than replaced with something
  // vaguer.
  if (error) return { error: error.message };

  revalidatePath("/platform");
  return { error: null, ok: `Plan changed to ${plan}.` };
}
