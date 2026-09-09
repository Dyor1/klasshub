"use server";

import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/site-url";
import { parseEmails, looksLikeEmail } from "@/lib/bulk";
import type { Database } from "@/lib/supabase/database.types";

type Role = Database["public"]["Enums"]["user_role"];

export type InviteState = {
  error: string | null;
  inviteUrl?: string;
  email?: string;
  mailQueued?: boolean;
};

const INVITABLE_ROLES: Role[] = ["admin", "teacher", "student", "parent"];

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

  const inviteUrl = `${await siteOrigin()}/invite/${rawToken}`;

  // Queue the invite mail. The link is deliberately still returned to the
  // caller: the outbox is drained by a worker on a schedule, so if mail is not
  // configured yet, or Brevo is having a bad day, the admin can still copy the
  // link rather than being stuck waiting for an email that never comes.
  const { data: school } = await supabase.from("schools").select("name").single();
  const schoolName = school?.name ?? "your school";

  const { error: mailError } = await supabase.rpc("enqueue_email", {
    p_to: email,
    p_subject: `You have been invited to join ${schoolName}`,
    p_body:
      `${schoolName} has invited you to join their portal on KlassHub as a ${role}.\n\n` +
      `Open this link to set up your account:\n${inviteUrl}\n\n` +
      `The link expires in 7 days and can only be used once. ` +
      `If you were not expecting this, you can ignore it.`,
  });

  revalidatePath("/dashboard/team");

  return {
    error: null,
    inviteUrl,
    email,
    // Surfaced rather than swallowed: the invitation itself succeeded, so this
    // is not an error, but the admin needs to know to send the link by hand.
    mailQueued: !mailError,
  };
}

export async function revokeInvitation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("invitations").delete().eq("id", id);
  revalidatePath("/dashboard/team");
}

export type BulkInviteState = {
  error: string | null;
  /** One entry per address that got an invitation, with its one-time link. */
  invited?: { email: string; url: string }[];
  /** Addresses deliberately not invited, each with the reason. */
  skipped?: { email: string; reason: string }[];
  mailQueued?: number;
};

/** Invites a pasted list of people, all to the same role.
 *
 *  Onboarding a school means inviting its whole staff room, and doing that one
 *  address at a time is where an admin gives up and starts sharing a login —
 *  which is the thing that makes an audit trail worthless.
 *
 *  Every link is returned, for the same reason the single invite returns one:
 *  the outbox is drained by a scheduled worker, so if mail is not configured
 *  the admin can still copy the links out rather than waiting for email that
 *  never arrives. */
export async function inviteBulk(
  _prev: BulkInviteState,
  formData: FormData
): Promise<BulkInviteState> {
  const role = String(formData.get("role") ?? "") as Role;
  if (!INVITABLE_ROLES.includes(role)) {
    return { error: "Pick a role for these people." };
  }

  const candidates = parseEmails(String(formData.get("emails") ?? ""));
  if (candidates.length === 0) {
    return { error: "Paste at least one email address." };
  }
  if (candidates.length > 100) {
    return { error: `That is ${candidates.length} addresses. Invite at most 100 at a time.` };
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

  const skipped: { email: string; reason: string }[] = [];
  const wanted: string[] = [];

  for (const email of candidates) {
    if (!looksLikeEmail(email)) {
      skipped.push({ email, reason: "does not look like an address" });
      continue;
    }
    wanted.push(email);
  }

  // Existing members and pending invitations are found up front so each can be
  // named. Letting the unique index decide would abort the batch on the first
  // clash and invite nobody.
  const [{ data: members }, { data: pending }] = await Promise.all([
    supabase.from("profiles").select("email"),
    supabase.from("invitations").select("email").is("accepted_at", null),
  ]);

  const isMember = new Set(
    (members ?? []).map((m) => (m.email ?? "").toLowerCase()).filter(Boolean)
  );
  const isPending = new Set(
    (pending ?? []).map((i) => i.email.toLowerCase())
  );

  const fresh = wanted.filter((email) => {
    if (isMember.has(email)) {
      skipped.push({ email, reason: "already on the team" });
      return false;
    }
    if (isPending.has(email)) {
      skipped.push({ email, reason: "already invited" });
      return false;
    }
    return true;
  });

  if (fresh.length === 0) {
    return { error: null, invited: [], skipped };
  }

  const { data: school } = await supabase.from("schools").select("name").single();
  const schoolName = school?.name ?? "your school";
  const origin = await siteOrigin();

  // Tokens are minted here and only their hashes stored, so the rows are built
  // alongside the links rather than read back afterwards — a link cannot be
  // recovered from the database once this function returns.
  const rows: {
    school_id: string;
    email: string;
    role: Role;
    token_hash: string;
    invited_by: string;
  }[] = [];
  const links: { email: string; url: string }[] = [];

  for (const email of fresh) {
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest();
    rows.push({
      school_id: me.school_id,
      email,
      role,
      // Supabase encodes bytea as a hex string with a \x prefix.
      token_hash: `\\x${tokenHash.toString("hex")}` as unknown as string,
      invited_by: uid,
    });
    links.push({ email, url: `${origin}/invite/${rawToken}` });
  }

  const { data: created, error } = await supabase
    .from("invitations")
    .insert(rows)
    .select("email");

  if (error) return { error: error.message };

  // Only mail the invitations that actually landed. Matching on the returned
  // rows rather than assuming all of `rows` succeeded means a partial insert
  // cannot produce a link for an invitation that does not exist.
  const landed = new Set((created ?? []).map((c) => c.email.toLowerCase()));
  const invited = links.filter((l) => landed.has(l.email));

  let mailQueued = 0;
  for (const { email, url } of invited) {
    const { error: mailError } = await supabase.rpc("enqueue_email", {
      p_to: email,
      p_subject: `You have been invited to join ${schoolName}`,
      p_body:
        `${schoolName} has invited you to join their portal on KlassHub as a ${role}.\n\n` +
        `Open this link to set up your account:\n${url}\n\n` +
        `The link expires in 7 days and can only be used once. ` +
        `If you were not expecting this, you can ignore it.`,
    });
    if (!mailError) mailQueued++;
  }

  revalidatePath("/dashboard/team");
  return { error: null, invited, skipped, mailQueued };
}
