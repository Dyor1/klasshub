import Link from "next/link";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import AcceptForm from "./AcceptForm";

export const metadata = { title: "Accept invitation — KlassHub" };

const roleBlurb: Record<string, string> = {
  admin: "as an administrator",
  teacher: "as a teacher",
  student: "as a student",
  parent: "as a parent",
};

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Validated before signup, because Supabase Auth collapses trigger errors
  // into a generic "Database error saving new user".
  const { data } = await supabase.rpc("invitation_preview", { p_token: token });
  const invite = data?.[0];

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex" aria-label="KlassHub home">
          <Logo />
        </Link>

        {!invite ? (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
              This invitation isn&apos;t valid
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              The link may have expired, already been used, or been typed
              incorrectly. Ask your school administrator to send you a fresh
              invitation.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to KlassHub
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
              Join {invite.school_name}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              You&apos;ve been invited{" "}
              <span className="font-medium text-slate-700">
                {roleBlurb[invite.invited_role] ?? "to join"}
              </span>
              . Set a password to finish setting up your account.
            </p>

            <AcceptForm token={token} invitedEmail={invite.invited_email} />

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-brand-600 hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
