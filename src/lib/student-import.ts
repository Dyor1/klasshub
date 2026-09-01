/** The rules for turning a spreadsheet row into a pupil.
 *
 *  Pure on purpose. These live outside the server action so they can be tested
 *  directly — a "use server" module cannot be imported by a test runner, and
 *  rules that decide whether a child's date of birth is read correctly should
 *  not be untestable by accident. */
import type { ImportRow } from "@/lib/csv";

export type RowError = { line: number; field: string; message: string };

export type Prepared = {
  admission_number: string;
  surname: string;
  first_name: string;
  other_names: string | null;
  gender: string | null;
  date_of_birth: string | null;
  class_id: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  address: string | null;
};

/** Nigerian formats in, E.164 out. Same rule as notification preferences — a
 *  guardian number that never receives an SMS is worse than a blank one. */
export function normalizePhone(raw: string): string | null {
  let v = raw.trim().replace(/[^0-9+]/g, "");
  if (!v) return null;
  if (v.startsWith("+")) v = "+" + v.slice(1).replace(/[^0-9]/g, "");
  else if (v.startsWith("234")) v = "+" + v;
  else if (v.startsWith("0")) v = "+234" + v.slice(1);
  else return null;
  return /^\+[1-9][0-9]{7,14}$/.test(v) ? v : null;
}

/** Accepts what schools actually type: 2014-03-21, 21/03/2014, 21-03-2014.
 *
 *  Day-first, because that is the Nigerian convention. Guessing month-first
 *  would not error on 03/04/2014 — it would silently record a birthday four
 *  months out, and nobody would ever find it. Anything ambiguous beyond that
 *  is refused rather than guessed. */
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return Number.isNaN(new Date(s).getTime()) ? null : s;
  }

  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m) return null;

  const [, d, mo, y] = m;
  const day = Number(d);
  const month = Number(mo);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const parsed = new Date(iso);
  // Rejects 31/02/2014, which Date would otherwise roll forward into March.
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCDate() !== day) return null;
  return iso;
}

export function normalizeGender(raw: string): string | null {
  const g = raw.trim().toLowerCase();
  if (["m", "male", "boy"].includes(g)) return "male";
  if (["f", "female", "girl"].includes(g)) return "female";
  return null;
}

export function validateRows(
  rows: ImportRow[],
  classByName: Map<string, string>,
  existingAdmissions: Set<string>
): { errors: RowError[]; prepared: Prepared[] } {
  const errors: RowError[] = [];
  const prepared: Prepared[] = [];
  const seen = new Map<string, number>();

  for (const r of rows) {
    const push = (field: string, message: string) =>
      errors.push({ line: r.line, field, message });

    if (!r.admission_number) push("admission_number", "Admission number is required");
    if (!r.surname) push("surname", "Surname is required");
    if (!r.first_name) push("first_name", "First name is required");

    if (r.admission_number) {
      const key = r.admission_number.toLowerCase();
      if (seen.has(key)) {
        push("admission_number", `Same admission number as line ${seen.get(key)}`);
      } else {
        seen.set(key, r.line);
      }
      if (existingAdmissions.has(key)) {
        push("admission_number", "A student with this admission number is already enrolled");
      }
    }

    let classId: string | null = null;
    if (r.class_name) {
      classId = classByName.get(r.class_name.toLowerCase().trim()) ?? null;
      if (!classId) push("class_name", `No class called "${r.class_name}"`);
    }

    let gender: string | null = null;
    if (r.gender) {
      gender = normalizeGender(r.gender);
      if (!gender) push("gender", `"${r.gender}" is not male or female`);
    }

    let dob: string | null = null;
    if (r.date_of_birth) {
      dob = normalizeDate(r.date_of_birth);
      if (!dob) push("date_of_birth", `"${r.date_of_birth}" is not a date we can read`);
    }

    let phone: string | null = null;
    if (r.guardian_phone) {
      phone = normalizePhone(r.guardian_phone);
      if (!phone) push("guardian_phone", `"${r.guardian_phone}" is not a valid phone number`);
    }

    if (r.guardian_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.guardian_email)) {
      push("guardian_email", `"${r.guardian_email}" is not a valid email`);
    }

    prepared.push({
      admission_number: r.admission_number,
      surname: r.surname,
      first_name: r.first_name,
      other_names: r.other_names || null,
      gender,
      date_of_birth: dob,
      class_id: classId,
      guardian_name: r.guardian_name || null,
      guardian_phone: phone,
      guardian_email: r.guardian_email || null,
      address: r.address || null,
    });
  }

  return { errors, prepared };
}

/** Checks the plan BEFORE any row is attempted.
 *
 *  The cap is enforced by a database trigger, so an over-limit import would
 *  otherwise fail on whichever row happened to cross the line, with a message
 *  about that one pupil rather than about the file. Saying "this file adds 400
 *  and your plan covers 150" up front is the difference between a fixable
 *  problem and a baffling one. */
export function capMessage(
  billing: { max_students: number | null; student_count: number | string | null; label: string | null } | null,
  incoming: number
): string | null {
  if (!billing || billing.max_students === null) return null;
  const current = Number(billing.student_count ?? 0);
  const total = current + incoming;
  if (total <= billing.max_students) return null;

  const room = billing.max_students - current;
  return (
    `This file adds ${incoming} student${incoming === 1 ? "" : "s"} to the ${current} ` +
    `already enrolled, which is ${total}. Your ${billing.label ?? "current"} plan covers ` +
    `${billing.max_students}. ` +
    (room > 0
      ? `Upgrade from Billing, or import ${room} or fewer.`
      : `You are already at the limit — upgrade from Billing to add anyone.`)
  );
}
