"use server";

import { randomBytes, createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Role = Database["public"]["Enums"]["user_role"];

export type InviteState = {
  error: string | null;
  inviteUrl?: string;
  email?: string;
};

const INVITABLE_ROLES: Role[] = ["admin", "teacher", "student", "parent"];

/** Where invite links point. Derived from the incoming request so it is
 *  correct on any host without configuration — an unset env var used to make
 *  production quietly hand out http://localhost:3000 links. An explicit
 *  NEXT_PUBLIC_SITE_URL still wins, for custom domains behind a proxy. */
async function siteOrigin(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Creates an invitation and returns the one-time link.
 *
 *  The raw token is generated here and never stored — only its SHA-256 hash
 *  goes to the database, so the link cannot be recovered from a DB dump. This
 *  is also why the URL is returned to the caller exactly once. */
export async function inviteMember(
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as Role;

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (!INVITABLE_ROLES.includes(role)) {
    return { error: "Pick a role for this person." };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const uid = claimsData?.claims?.sub;
  if (!uid) return { error: "You are not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", uid)
    .single();

  if (!me) return { error: "Could not load your profile." };
  if (me.role !== "admin") {
    return { error: "Only administrators can invite people." };
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest();

  // Supabase encodes bytea as a hex string with a \x prefix.
  const tokenHashHex = `\\x${tokenHash.toString("hex")}`;

  const { error } = await supabase.from("invitations").insert({
    school_id: me.school_id,
    email,
    role,
    token_hash: tokenHashHex as unknown as string,
    invited_by: uid,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "There is already a pending invitation for that email." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/team");

  return { error: null, inviteUrl: `${await siteOrigin()}/invite/${rawToken}`, email };
}

export async function revokeInvitation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("invitations").delete().eq("id", id);
  revalidatePath("/dashboard/team");
}
