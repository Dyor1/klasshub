// Parsing for the bulk-creation forms.
//
// These exist because the input is a paste, and a paste carries whatever the
// source had in it — CRLF, numbering, trailing commas, smart separators. Every
// failure here is silent in the same way the CSV importer's are: nothing
// throws, a subject just gets created called "1. Mathematics" and nobody
// notices until it appears on a report card.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLines,
  parseNameAndCode,
  expandArms,
  parseEmails,
  looksLikeEmail,
} from "../src/lib/bulk.ts";

test("splits on either line ending", () => {
  assert.deepEqual(parseLines("Maths\nEnglish"), ["Maths", "English"]);
  // Windows clipboards produce CRLF; a naive split leaves a trailing \r that
  // becomes part of the name.
  assert.deepEqual(parseLines("Maths\r\nEnglish"), ["Maths", "English"]);
});

test("drops blank lines and surrounding space", () => {
  assert.deepEqual(parseLines("\n Maths \n\n\nEnglish\n\n"), ["Maths", "English"]);
});

test("strips list numbering and bullets", () => {
  assert.deepEqual(parseLines("1. Maths\n2) English\n- Civic\n• Basic Science"), [
    "Maths",
    "English",
    "Civic",
    "Basic Science",
  ]);
});

test("strips a trailing comma", () => {
  assert.deepEqual(parseLines("Maths,\nEnglish,"), ["Maths", "English"]);
});

test("collapses internal whitespace", () => {
  assert.deepEqual(parseLines("Basic    Science"), ["Basic Science"]);
});

test("drops duplicates case-insensitively, keeping the first", () => {
  assert.deepEqual(parseLines("Maths\nMATHS\n maths \nEnglish"), ["Maths", "English"]);
});

test("empty input is not an error", () => {
  assert.deepEqual(parseLines(""), []);
  assert.deepEqual(parseLines(null), []);
  assert.deepEqual(parseLines("   \n  \n"), []);
});

test("name and code split on the LAST separator", () => {
  // The bug this guards: splitting on the first comma turns a long subject
  // name into a one-word name and a nonsense code.
  assert.deepEqual(parseNameAndCode("Christian Religious Studies, CRS"), {
    name: "Christian Religious Studies",
    code: "CRS",
  });
  assert.deepEqual(parseNameAndCode("Mathematics\tMTH"), {
    name: "Mathematics",
    code: "MTH",
  });
});

test("a bare name has no code", () => {
  assert.deepEqual(parseNameAndCode("Mathematics"), { name: "Mathematics", code: null });
  // A trailing comma with nothing after it is punctuation, not an empty code.
  assert.deepEqual(parseNameAndCode("Mathematics,"), {
    name: "Mathematics",
    code: null,
  });
  // Nothing before the separator: the whole line is the name.
  assert.deepEqual(parseNameAndCode(", CRS"), { name: ", CRS", code: null });
});

test("arms expand into one class each", () => {
  assert.deepEqual(expandArms("JSS 1", "A, B, C"), [
    { name: "JSS 1A", section: "A" },
    { name: "JSS 1B", section: "B" },
    { name: "JSS 1C", section: "C" },
  ]);
  // Spaces alone are a valid separator — people type "A B C".
  assert.deepEqual(expandArms("JSS 1", "a b"), [
    { name: "JSS 1A", section: "A" },
    { name: "JSS 1B", section: "B" },
  ]);
});

test("no arms means a single class", () => {
  assert.deepEqual(expandArms("Primary 6", ""), [{ name: "Primary 6", section: null }]);
  assert.deepEqual(expandArms("Primary 6", null), [
    { name: "Primary 6", section: null },
  ]);
});

test("repeated arms are collapsed, order kept", () => {
  assert.deepEqual(expandArms("JSS 1", "B, A, B"), [
    { name: "JSS 1B", section: "B" },
    { name: "JSS 1A", section: "A" },
  ]);
});

test("no grade level means nothing to create", () => {
  assert.deepEqual(expandArms("", "A"), []);
  assert.deepEqual(expandArms("   ", "A"), []);
});

test("emails split on whatever the source used", () => {
  assert.deepEqual(parseEmails("a@x.ng, b@y.ng"), ["a@x.ng", "b@y.ng"]);
  assert.deepEqual(parseEmails("a@x.ng; b@y.ng"), ["a@x.ng", "b@y.ng"]);
  assert.deepEqual(parseEmails("a@x.ng\nb@y.ng"), ["a@x.ng", "b@y.ng"]);
  // Mail clients paste "Name <addr>" — the angle brackets are separators.
  assert.deepEqual(parseEmails("Ade <ade@x.ng>"), ["ade", "ade@x.ng"]);
});

test("emails are lowercased and de-duplicated", () => {
  // An invitation to Ade@x.ng and a sign-up as ade@x.ng are one person.
  assert.deepEqual(parseEmails("Ade@X.ng, ade@x.ng"), ["ade@x.ng"]);
});

test("email shape check accepts awkward but real addresses", () => {
  assert.ok(looksLikeEmail("head.teacher+enquiries@numamu.edu.ng"));
  assert.ok(looksLikeEmail("o'brien@school.ie"));
  assert.ok(!looksLikeEmail("nope"));
  assert.ok(!looksLikeEmail("no@domain"));
  assert.ok(!looksLikeEmail(""));
});
