// Validation rules for the student-roll importer.
//
// The date rules are the reason this file exists. A month-first reading of
// 03/04/2014 does not error — it records a birthday four months out, and
// nothing downstream ever notices.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDate,
  normalizePhone,
  normalizeGender,
  validateRows,
  capMessage,
} from "../src/lib/student-import.ts";

const row = (over = {}) => ({
  line: 2, admission_number: "KH/1", surname: "Okafor", first_name: "Emeka",
  other_names: "", gender: "", date_of_birth: "", class_name: "",
  guardian_name: "", guardian_phone: "", guardian_email: "", address: "",
  ...over,
});
const noClasses = new Map();
const noExisting = new Set();

test("dates are read day-first, the Nigerian convention", () => {
  assert.equal(normalizeDate("21/03/2014"), "2014-03-21");
  assert.equal(normalizeDate("21-03-2014"), "2014-03-21");
  // Ambiguous to a human, unambiguous to us: 3 April, not 4 March.
  assert.equal(normalizeDate("03/04/2014"), "2014-04-03");
  assert.equal(normalizeDate("2014-03-21"), "2014-03-21");
});

test("impossible dates are refused, not rolled forward", () => {
  // Date() would happily turn this into 3 March.
  assert.equal(normalizeDate("31/02/2014"), null);
  assert.equal(normalizeDate("00/01/2014"), null);
  assert.equal(normalizeDate("21/13/2014"), null);
  assert.equal(normalizeDate("not a date"), null);
  assert.equal(normalizeDate("21/03/14"), null);
});

test("phones normalise to E.164 or fail", () => {
  assert.equal(normalizePhone("08012345678"), "+2348012345678");
  assert.equal(normalizePhone("0801 234 5678"), "+2348012345678");
  assert.equal(normalizePhone("+234-801-234-5678"), "+2348012345678");
  assert.equal(normalizePhone("2348012345678"), "+2348012345678");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("phone"), null);
});

test("gender accepts what registers actually contain", () => {
  assert.equal(normalizeGender("M"), "male");
  assert.equal(normalizeGender("female"), "female");
  assert.equal(normalizeGender("Boy"), "male");
  assert.equal(normalizeGender("other"), null);
});

test("required fields are reported per line and column", () => {
  const { errors } = validateRows(
    [row({ line: 5, admission_number: "", surname: "", first_name: "Ada" })],
    noClasses, noExisting
  );
  assert.equal(errors.length, 2);
  assert.deepEqual(errors.map((e) => e.field).sort(), ["admission_number", "surname"]);
  assert.equal(errors[0].line, 5);
});

test("a duplicate inside the file names the line it clashes with", () => {
  const { errors } = validateRows(
    [row({ line: 2, admission_number: "KH/1" }), row({ line: 7, admission_number: "kh/1" })],
    noClasses, noExisting
  );
  assert.equal(errors.length, 1);
  assert.equal(errors[0].line, 7);
  assert.match(errors[0].message, /line 2/);
});

test("a clash with an already-enrolled pupil is caught", () => {
  const { errors } = validateRows([row()], noClasses, new Set(["kh/1"]));
  assert.match(errors[0].message, /already enrolled/);
});

test("an unknown class is named rather than silently dropped", () => {
  const { errors } = validateRows(
    [row({ class_name: "JSS 9Z" })],
    new Map([["jss 1a", "class-uuid"]]), noExisting
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /JSS 9Z/);
});

test("a known class resolves, case and spacing insensitively", () => {
  const { errors, prepared } = validateRows(
    [row({ class_name: "  jss 1A " })],
    new Map([["jss 1a", "class-uuid"]]), noExisting
  );
  assert.equal(errors.length, 0);
  assert.equal(prepared[0].class_id, "class-uuid");
});

test("blank optional fields become null, not empty strings", () => {
  const { prepared } = validateRows([row()], noClasses, noExisting);
  assert.equal(prepared[0].other_names, null);
  assert.equal(prepared[0].guardian_phone, null);
  assert.equal(prepared[0].class_id, null);
});

test("the plan cap is described in terms of the file, not one row", () => {
  const msg = capMessage(
    { max_students: 150, student_count: 120, label: "Starter" }, 400
  );
  assert.match(msg, /adds 400/);
  assert.match(msg, /120/);
  assert.match(msg, /which is 520/);
  assert.match(msg, /covers 150/);
  assert.match(msg, /import 30 or fewer/);
});

test("a file that fits raises nothing", () => {
  assert.equal(capMessage({ max_students: 150, student_count: 120, label: "Starter" }, 30), null);
});

test("an unlimited plan never caps", () => {
  assert.equal(capMessage({ max_students: null, student_count: 5000, label: "Group" }, 900), null);
});

test("a school already at its limit is told to upgrade, not to import 0", () => {
  const msg = capMessage({ max_students: 150, student_count: 150, label: "Starter" }, 1);
  assert.match(msg, /already at the limit/);
  assert.doesNotMatch(msg, /import 0 or fewer/);
});
