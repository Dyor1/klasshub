// Search-term handling.
//
// Exists because every failure here is silent. A comma in "Okafor, Emeka"
// does not throw — PostgREST reads it as the end of one condition and the
// start of another, and the page returns a confident list of the wrong
// students. Nobody reports that as a bug; they just conclude the search is
// unreliable and stop using it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ilikePattern, orIlike, displayTerm } from "../src/lib/search.ts";

test("ordinary terms become a contains pattern", () => {
  assert.equal(ilikePattern("okafor"), "%okafor%");
  assert.equal(ilikePattern("  Emeka  "), "%Emeka%");
});

test("nothing to search for yields null, not an everything-matcher", () => {
  // `ilike.%%` matches every row, which would silently disable the filter.
  assert.equal(ilikePattern(""), null);
  assert.equal(ilikePattern("   "), null);
  assert.equal(ilikePattern(null), null);
  assert.equal(ilikePattern(undefined), null);
  // Punctuation-only collapses to nothing rather than to a broken filter.
  assert.equal(ilikePattern(",,,"), null);
  assert.equal(ilikePattern("()"), null);
});

test("PostgREST filter syntax cannot escape the expression", () => {
  // The comma is the dangerous one: it splits an or=() into extra conditions.
  assert.equal(ilikePattern("Okafor, Emeka"), "%Okafor Emeka%");
  assert.equal(ilikePattern("a)b(c"), "%a b c%");
  assert.equal(ilikePattern('say "hi"'), "%say hi%");
  assert.equal(ilikePattern("KH.26.001"), "%KH 26 001%");

  for (const ch of [",", ".", "(", ")", '"', "'", "\\", ":"]) {
    assert.ok(
      !ilikePattern(`a${ch}b`).includes(ch),
      `pattern should not carry a literal ${ch}`
    );
  }
});

test("LIKE wildcards are escaped so they match themselves", () => {
  // Someone searching an admission number containing _ means the character,
  // not "any character".
  assert.equal(ilikePattern("KH_26"), "%KH\\_26%");
  assert.equal(ilikePattern("50%"), "%50\\%%");
});

test("collapses runs of whitespace", () => {
  assert.equal(ilikePattern("Okafor    Emeka"), "%Okafor Emeka%");
  assert.equal(ilikePattern("Okafor\n\tEmeka"), "%Okafor Emeka%");
});

test("orIlike builds one condition per column", () => {
  assert.equal(
    orIlike(["surname", "first_name"], "chidi"),
    "surname.ilike.%chidi%,first_name.ilike.%chidi%"
  );
});

test("orIlike returns null when there is nothing to apply", () => {
  // The caller must skip .or() entirely; passing an empty string to PostgREST
  // is a 400, and passing a match-everything filter is worse.
  assert.equal(orIlike(["surname"], ""), null);
  assert.equal(orIlike(["surname"], "  "), null);
  assert.equal(orIlike([], "chidi"), null);
});

test("displayTerm echoes what was typed, not the pattern", () => {
  assert.equal(displayTerm("  Okafor "), "Okafor");
  assert.equal(displayTerm(null), "");
});
