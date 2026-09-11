import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ResetForm from "./ResetForm";

export const metadata = { title: "Set a new password — KlassHub" };

export default async function ResetPasswordPage() {
  // Reached with the session the reset link created. Checked here so an
  // expired or hand-typed URL says so up front, rather than presenting a form
  // that can only fail on submit. The action re-checks before writing — this
  // is the courtesy, that is the control.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return (
      <>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          This link has expired
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Reset links last an hour and can only be used once. Ask for a fresh
          one and it will work.
        </p>
        <div className="mt-8">
          <Link
            href="/forgot-password"
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-brand-gradient text-[15px] font-semibold text-white kh-clay-brand kh-clay-press transition-all hover:brightness-110"
          >
            Request a new link
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        Set a new password
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Choose something you have not used here before. You will be signed out
        everywhere else once it is saved.
      </p>

      <div className="mt-8">
        <ResetForm />
      </div>
    </>
  );
}
