"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveNotificationPreferences, type PrefState } from "./delivery-actions";
import { ErrorNote, SuccessNote, inputClass } from "@/components/ui";

const initial: PrefState = { error: null };

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-white shadow-brand transition-all hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save preferences"}
    </button>
  );
}

function Toggle({
  name,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
        disabled
          ? "border-line bg-sunken"
          : "cursor-pointer border-line hover:bg-hover"
      }`}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong text-brand-600 dark:text-brand-300 focus:ring-brand-500"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}

export default function PreferencesForm({
  phone,
  emailEnabled,
  smsEnabled,
  email,
}: {
  phone: string | null;
  emailEnabled: boolean;
  smsEnabled: boolean;
  email: string | null;
}) {
  const [state, formAction] = useActionState(saveNotificationPreferences, initial);
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [emailOn, setEmailOn] = useState(emailEnabled);
  const [smsOn, setSmsOn] = useState(smsEnabled);

  // The server rejects this combination too; disabling it here just stops
  // someone reaching for a setting that cannot do anything.
  const noPhone = phoneValue.trim() === "";

  return (
    <form action={formAction} className="space-y-4">
      <ErrorNote message={state.error} />
      {state.ok && state.message && <SuccessNote>{state.message}</SuccessNote>}

      <label className="block max-w-xs">
        <span className="mb-1.5 block text-xs font-medium text-ink-muted">
          Mobile number
        </span>
        <input
          name="phone"
          value={phoneValue}
          onChange={(e) => setPhoneValue(e.target.value)}
          placeholder="08012345678"
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-ink-subtle">
          Nigerian or international. Saved as +234… either way.
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle
          name="email_enabled"
          label="Email"
          hint={email ? `Sent to ${email}` : "No email address on your account"}
          checked={emailOn}
          onChange={setEmailOn}
        />
        <Toggle
          name="sms_enabled"
          label="SMS"
          hint={
            noPhone
              ? "Add a phone number first"
              : "Only for the alerts your school sends by text"
          }
          checked={smsOn && !noPhone}
          onChange={setSmsOn}
          disabled={noPhone}
        />
      </div>

      <Save />
    </form>
  );
}
