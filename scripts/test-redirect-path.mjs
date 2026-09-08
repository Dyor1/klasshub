// Redirect-target rules.
//
// This exists because an open redirect fails silently in exactly the way this
// project cares about: nothing throws, the page loads, and the only symptom is
// that the user ends up somewhere else. `?next=` reaches the login action from
// the query string, so it is attacker-controlled on any link that can be
// mailed to a teacher.
//
// The subtle one is `//evil.example`. It passes a naive startsWith("/") check
// and is a protocol-relative URL, so the browser leaves the site entirely —
// which is how a real login page becomes a convincing phishing hop.
import { test } from "node:test";
import assert from "node:assert/strict";
import { internalPath } from "../src/lib/redirect-path.ts";

test("keeps an ordinary in-app path", () => {
  assert.equal(internalPath("/dashboard/results"), "/dashboard/results");
  assert.equal(internalPath("/dashboard?class=1&term=third"), "/dashboard?class=1&term=third");
});

test("falls back when there is nothing to use", () => {
  assert.equal(internalPath(null), "/dashboard");
  assert.equal(internalPath(undefined), "/dashboard");
  assert.equal(internalPath(""), "/dashboard");
  assert.equal(internalPath("/inbox", "/home"), "/inbox");
  assert.equal(internalPath(null, "/home"), "/home");
});

test("rejects an absolute URL to another site", () => {
  assert.equal(internalPath("https://evil.example"), "/dashboard");
  assert.equal(internalPath("http://evil.example/dashboard"), "/dashboard");
});

test("rejects a protocol-relative URL", () => {
  // Starts with "/" and would pass a naive check.
  assert.equal(internalPath("//evil.example"), "/dashboard");
  assert.equal(internalPath("//evil.example/dashboard"), "/dashboard");
});

test("rejects backslashes, which some browsers normalise to slashes", () => {
  assert.equal(internalPath("/\\evil.example"), "/dashboard");
  assert.equal(internalPath("\\\\evil.example"), "/dashboard");
});

test("does not mistake a path that merely mentions a host", () => {
  // Legitimate: stays on this site.
  assert.equal(internalPath("/dashboard?to=https://x.example"), "/dashboard?to=https://x.example");
});
