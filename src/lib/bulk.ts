/** Parsing for the "paste a list" bulk-creation forms.
 *
 *  These take whatever someone copies out of a Word document or a spreadsheet
 *  column, which means CRLF line endings, stray blank lines, smart quotes,
 *  numbered lists and trailing commas. None of that should reach the database
 *  and none of it should produce an error — a bulk form that rejects a paste
 *  because line 14 had a trailing space is worse than typing the list by hand.
 *
 *  Kept free of Next and Supabase imports so it can be unit tested. */

/** Splits pasted text into clean, de-duplicated lines, preserving order.
 *
 *  Duplicates within the paste are dropped silently: pasting a column that
 *  happens to repeat a value is common, and refusing the whole paste over it
 *  would be pedantic. Clashes with rows that already exist are a different
 *  matter and are reported by the caller. */
export function parseLines(text: string | null | undefined): string[] {
  if (!text) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw
      // Numbered and bulleted lists: "1. Mathematics", "- Mathematics".
      .replace(/^\s*(?:\d+[.)]|[-*•])\s+/, "")
      .replace(/\s+/g, " ")
      .trim()
      // A trailing comma is what you get pasting from a code snippet or a
      // list where every line but the last ends in one.
      .replace(/,$/, "")
      .trim();

    if (!line) continue;

    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }

  return out;
}

/** A line of "Name, CODE" or "Name<tab>CODE" or just "Name".
 *
 *  Splitting on the LAST separator, not the first: "Christian Religious
 *  Studies, CRS" must not become name "Christian" with the rest as a code. */
export function parseNameAndCode(line: string): { name: string; code: string | null } {
  const match = line.match(/^(.*?)[\t,]\s*([^\t,]*)$/);
  if (!match) return { name: line.trim(), code: null };

  const name = match[1].trim();
  const code = match[2].trim();

  // Nothing before the separator (", CRS") is not a code with a missing name —
  // treat the whole line as the name and let the caller reject it if it wants.
  if (!name) return { name: line.trim(), code: null };
  return { name, code: code || null };
}

/** Turns "JSS 1" plus arms "A, B, C" into the class names to create.
 *
 *  Arms are optional: a school with one stream per year passes none and gets a
 *  single "JSS 1". */
export function expandArms(
  gradeLevel: string,
  armsInput: string | null | undefined
): { name: string; section: string | null }[] {
  const grade = (gradeLevel ?? "").replace(/\s+/g, " ").trim();
  if (!grade) return [];

  const arms = (armsInput ?? "")
    .split(/[,\s]+/)
    .map((a) => a.trim().toUpperCase())
    .filter(Boolean);

  const unique: string[] = [];
  for (const a of arms) if (!unique.includes(a)) unique.push(a);

  if (unique.length === 0) return [{ name: grade, section: null }];
  return unique.map((section) => ({ name: `${grade}${section}`, section }));
}

/** Splits pasted email addresses on any reasonable separator.
 *
 *  People paste from a mail client ("a@x.ng; b@y.ng"), from a spreadsheet
 *  column (newlines) or from a sentence (commas and spaces), so all three have
 *  to work. Lowercased, because an invitation keyed on Ade@x.ng and a sign-up
 *  as ade@x.ng are the same person. */
export function parseEmails(text: string | null | undefined): string[] {
  if (!text) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const piece of text.split(/[\s,;<>]+/)) {
    const email = piece.trim().toLowerCase().replace(/^mailto:/, "");
    if (!email) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }

  return out;
}

/** Deliberately loose, matching the contact form: anything stricter turns away
 *  real addresses, and the only proof an address works is sending to it. */
export function looksLikeEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value) && value.length <= 254;
}
