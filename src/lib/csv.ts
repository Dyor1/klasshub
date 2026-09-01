/** A CSV reader that handles the things school rolls actually contain.
 *
 *  Not a split(','). Real exports carry quoted fields with commas inside them
 *  ("Okafor, Emeka"), doubled quotes for a literal quote, addresses with line
 *  breaks in them, CRLF from Excel, and a BOM from Excel on Windows. Each of
 *  those silently corrupts a naive parse — and a corrupted roll is worse than
 *  a rejected one, because nobody notices. */
export function parseCsv(input: string): string[][] {
  // Excel prepends a BOM; left in place it becomes part of the first header.
  const text = input.replace(/^﻿/, "");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    // A trailing newline should not produce a phantom final row.
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      quoted = true;
      i++;
      continue;
    }
    if (c === ",") {
      endField();
      i++;
      continue;
    }
    if (c === "\r") {
      // CRLF or a lone CR both end the row.
      if (text[i + 1] === "\n") i++;
      endRow();
      i++;
      continue;
    }
    if (c === "\n") {
      endRow();
      i++;
      continue;
    }

    field += c;
    i++;
  }

  // Whatever is left when the input runs out is still a row.
  if (field !== "" || row.length > 0) endRow();

  return rows;
}

/** Every column we understand, with the spellings a real school will use.
 *  Matching is case- and punctuation-insensitive so "Admission No." and
 *  "admission_number" both land. */
const COLUMNS: Record<string, string[]> = {
  admission_number: ["admission number", "admission no", "admno", "adm no", "reg number", "reg no"],
  surname: ["surname", "last name", "family name"],
  first_name: ["first name", "firstname", "given name"],
  other_names: ["other names", "middle name", "middle names", "other name"],
  gender: ["gender", "sex"],
  date_of_birth: ["date of birth", "dob", "birth date", "birthdate"],
  class_name: ["class", "class name", "current class"],
  guardian_name: ["guardian name", "parent name", "guardian"],
  guardian_phone: ["guardian phone", "parent phone", "phone", "phone number", "mobile"],
  guardian_email: ["guardian email", "parent email", "email"],
  address: ["address", "home address"],
};

const normalizeHeader = (h: string) =>
  h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Maps a header row onto our field names. Returns the field for each column
 *  position, or null where we do not recognise it — unknown columns are
 *  ignored rather than rejected, because school exports carry all sorts of
 *  extra baggage and refusing the file over a stray column helps nobody. */
export function mapHeaders(header: string[]): (string | null)[] {
  return header.map((raw) => {
    const h = normalizeHeader(raw);
    for (const [field, aliases] of Object.entries(COLUMNS)) {
      if (aliases.includes(h) || normalizeHeader(field) === h) return field;
    }
    return null;
  });
}

export type ImportRow = {
  line: number;
  admission_number: string;
  surname: string;
  first_name: string;
  other_names: string;
  gender: string;
  date_of_birth: string;
  class_name: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  address: string;
};

const EMPTY: Omit<ImportRow, "line"> = {
  admission_number: "", surname: "", first_name: "", other_names: "",
  gender: "", date_of_birth: "", class_name: "", guardian_name: "",
  guardian_phone: "", guardian_email: "", address: "",
};

/** Turns a parsed grid into typed rows. Blank lines are dropped rather than
 *  reported: a trailing empty row is a property of the file format, not a
 *  mistake the person made. */
export function toRows(grid: string[][]): { rows: ImportRow[]; unmapped: string[] } {
  if (grid.length === 0) return { rows: [], unmapped: [] };

  const [header, ...body] = grid;
  const fields = mapHeaders(header);
  const unmapped = header.filter((_, i) => fields[i] === null).filter((h) => h.trim() !== "");

  const rows: ImportRow[] = [];
  body.forEach((cells, idx) => {
    if (cells.every((c) => c.trim() === "")) return;

    const row: ImportRow = { line: idx + 2, ...EMPTY };
    fields.forEach((field, i) => {
      if (!field) return;
      (row as unknown as Record<string, string>)[field] = (cells[i] ?? "").trim();
    });
    rows.push(row);
  });

  return { rows, unmapped };
}

export const TEMPLATE_HEADERS = [
  "Admission Number", "Surname", "First Name", "Other Names", "Gender",
  "Date of Birth", "Class", "Guardian Name", "Guardian Phone", "Guardian Email", "Address",
];

export function templateCsv(classNames: string[]): string {
  const example = [
    "KH/26/001", "Okafor", "Emeka", "Chidi", "male",
    "2014-03-21", classNames[0] ?? "JSS 1A", "Mrs Okafor", "08012345678",
    "parent@example.com", "12 Awolowo Road, Ikeja",
  ];
  // Quote every cell: addresses contain commas, and a template that breaks on
  // its own example is not much of a template.
  const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return [TEMPLATE_HEADERS.map(quote).join(","), example.map(quote).join(",")].join("\r\n");
}
