// Parser tests for the student-roll importer.
//
// Node's built-in test runner and assert — no dependency, matching the rest of
// the project. Run: npm run test:csv
//
// These exist because a CSV parser fails silently. A split(',') will happily
// turn "Okafor, Emeka" into two students and nobody notices until a report card
// comes out wrong.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, toRows, mapHeaders } from "../src/lib/csv.ts";

test("plain rows", () => {
  assert.deepEqual(parseCsv("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
});

test("quoted field containing a comma", () => {
  assert.deepEqual(parseCsv('name,class\n"Okafor, Emeka",JSS 1A'), [
    ["name", "class"],
    ["Okafor, Emeka", "JSS 1A"],
  ]);
});

test("doubled quotes are one literal quote", () => {
  assert.deepEqual(parseCsv('a\n"He said ""hi"""'), [["a"], ['He said "hi"']]);
});

test("newline inside a quoted address", () => {
  assert.deepEqual(parseCsv('name,address\nAda,"12 Awolowo Road\nIkeja"'), [
    ["name", "address"],
    ["Ada", "12 Awolowo Road\nIkeja"],
  ]);
});

test("CRLF from Excel", () => {
  assert.deepEqual(parseCsv("a,b\r\n1,2\r\n"), [["a", "b"], ["1", "2"]]);
});

test("BOM from Excel on Windows does not corrupt the first header", () => {
  const grid = parseCsv("﻿Admission Number,Surname\nKH/1,Okafor");
  assert.equal(grid[0][0], "Admission Number");
  assert.deepEqual(mapHeaders(grid[0]), ["admission_number", "surname"]);
});

test("trailing newline does not invent a row", () => {
  assert.equal(parseCsv("a\n1\n").length, 2);
});

test("empty field between commas is preserved", () => {
  assert.deepEqual(parseCsv("a,b,c\n1,,3"), [["a", "b", "c"], ["1", "", "3"]]);
});

test("header aliases map to canonical fields", () => {
  assert.deepEqual(
    mapHeaders(["Adm No.", "Last Name", "First Name", "Sex", "DOB", "Current Class"]),
    ["admission_number", "surname", "first_name", "gender", "date_of_birth", "class_name"]
  );
});

test("unrecognised columns map to null rather than failing", () => {
  assert.deepEqual(mapHeaders(["Surname", "House Colour"]), ["surname", null]);
});

test("toRows numbers lines as the file does, counting the header", () => {
  const { rows } = toRows(parseCsv("Surname,First Name\nOkafor,Emeka\nBello,Aisha"));
  assert.equal(rows[0].line, 2);
  assert.equal(rows[1].line, 3);
  assert.equal(rows[1].surname, "Bello");
});

test("blank lines are skipped, not reported as errors", () => {
  const { rows } = toRows(parseCsv("Surname\nOkafor\n\nBello\n"));
  assert.equal(rows.length, 2);
});

test("unmapped headers are reported so a mistyped column is visible", () => {
  const { unmapped } = toRows(parseCsv("Surname,Guardain Phone\nOkafor,0801"));
  assert.deepEqual(unmapped, ["Guardain Phone"]);
});
