// Rules for the public contact form. Run: deno test supabase/functions/contact/
//
// Worth testing because this is the only gate in front of a database insert
// and an outbound email, and because two of the rules fail in opposite
// directions: an email regex that is too strict silently rejects real
// customers, and a honeypot that answers honestly teaches a bot which field to
// skip next time.
import { assertEquals } from "jsr:@std/assert@1";
import { validate, escapeHtml } from "./validate.ts";

const good = {
  name: "Folake Adebayo",
  email: "folake@numamu.edu.ng",
  topic: "sales",
  message: "We are a 300-pupil secondary school and would like a demo.",
};

Deno.test("accepts a well-formed message", () => {
  const r = validate(good);
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.value.topic, "sales");
    assertEquals(r.value.email, "folake@numamu.edu.ng");
  }
});

Deno.test("trims, and lowercases the address", () => {
  const r = validate({ ...good, name: "  Folake  ", email: "  Folake@Numamu.EDU.NG " });
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.value.name, "Folake");
    assertEquals(r.value.email, "folake@numamu.edu.ng");
  }
});

Deno.test("honeypot is accepted silently, not rejected", () => {
  const r = validate({ ...good, website: "http://spam.example" });
  assertEquals(r.ok, false);
  // The distinction that matters: no error message goes back, so a bot author
  // cannot tell this field is the one being watched.
  assertEquals("silent" in r, true);
  assertEquals("error" in r, false);
});

Deno.test("an empty honeypot is normal and passes", () => {
  assertEquals(validate({ ...good, website: "" }).ok, true);
  assertEquals(validate({ ...good, website: "   " }).ok, true);
});

Deno.test("rejects a missing or too-short name", () => {
  assertEquals(validate({ ...good, name: "" }).ok, false);
  assertEquals(validate({ ...good, name: "A" }).ok, false);
  assertEquals(validate({ ...good, name: "x".repeat(101) }).ok, false);
});

Deno.test("rejects addresses that cannot be real", () => {
  for (const email of ["", "nope", "no@domain", "a b@c.ng", "@numamu.ng", "x@.ng"]) {
    assertEquals(validate({ ...good, email }).ok, false, `should reject ${email}`);
  }
});

Deno.test("accepts awkward but legitimate addresses", () => {
  // Over-strict validation here rejects paying customers and looks like a bug
  // in their mail, not ours.
  for (const email of [
    "head.teacher+enquiries@numamu.edu.ng",
    "o'brien@school.ie",
    "a@b.co",
    "school_admin@my-school.sch.ng",
  ]) {
    assertEquals(validate({ ...good, email }).ok, true, `should accept ${email}`);
  }
});

Deno.test("topic must be one we handle", () => {
  assertEquals(validate({ ...good, topic: "" }).ok, false);
  assertEquals(validate({ ...good, topic: "billing" }).ok, false);
  for (const topic of ["sales", "support", "privacy", "security", "other"]) {
    assertEquals(validate({ ...good, topic }).ok, true, topic);
  }
});

Deno.test("message length matches the database constraint", () => {
  assertEquals(validate({ ...good, message: "too short" }).ok, false);
  assertEquals(validate({ ...good, message: "x".repeat(10) }).ok, true);
  assertEquals(validate({ ...good, message: "x".repeat(5000) }).ok, true);
  assertEquals(validate({ ...good, message: "x".repeat(5001) }).ok, false);
});

Deno.test("missing fields do not throw", () => {
  assertEquals(validate({}).ok, false);
  assertEquals(validate({ name: null, email: undefined }).ok, false);
});

Deno.test("escapes HTML before it reaches the notification email", () => {
  assertEquals(
    escapeHtml('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
  );
  assertEquals(escapeHtml("Fish & Chips"), "Fish &amp; Chips");
});
