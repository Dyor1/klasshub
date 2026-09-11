// Proves the redirect graph always terminates.
//
// This exists because of a real lockout: a founder account signed in fine and
// then could not reach any page at all. /dashboard and /platform both died with
// "redirected too many times". Neither rule was wrong alone. The proxy sent a
// valid token away from /login; requireViewer refused to render a dashboard for
// an account with no school. Together they formed a cycle:
//
//   /dashboard -> (no profile) -> /login -> (valid token) -> /dashboard -> ...
//
// Nothing threw, no test failed, and the server logs showed only a stream of
// 307s. The person was locked out with no way even to reach a sign-in box and
// try a different account — the escape hatch is outside the app, which is why
// /logout had to exist before this could be debugged at all.
//
// So the interesting property is not "does each rule return the right string".
// It is that composing them cannot cycle, for ANY account state. That is what
// is walked below, using the same functions the proxy and requireViewer call.
import { test } from "node:test";
import assert from "node:assert/strict";
import { proxyRedirect, missingProfileRedirect } from "../src/lib/routing.ts";

/** Every combination of the three facts the server can learn. Includes the
 *  incoherent ones on purpose: "operator with no session" should never happen,
 *  but a rule that only terminates on states we expect is a rule waiting to
 *  strand someone after a database change. */
const STATES = [];
for (const hasClaims of [false, true])
  for (const hasProfile of [false, true])
    for (const isOperator of [false, true])
      STATES.push({ hasClaims, hasProfile, isOperator });

const START_PATHS = ["/dashboard", "/platform", "/login", "/register", "/dashboard/results"];

/** Follows the redirects the app would actually perform, and returns the trail.
 *  Throws if it revisits a path, which is precisely the bug. */
function walk(state, start) {
  const trail = [start];
  let path = start;

  for (let hop = 0; hop < 12; hop++) {
    // /logout always clears the session and lands on /login as a signed-out
    // user, so it is terminal by construction. Modelled, not assumed.
    if (path.startsWith("/logout")) {
      trail.push("/login (signed out)");
      return trail;
    }

    const viaProxy = proxyRedirect(state, path);
    let next = viaProxy;

    // The page's own guard runs only if the proxy let the request through.
    if (next === null) {
      if (path.startsWith("/dashboard") && state.hasClaims && !state.hasProfile) {
        next = missingProfileRedirect(state.isOperator);
      } else if (path.startsWith("/platform") && state.hasClaims && !state.isOperator) {
        // requirePlatformOperator sends a non-operator to their own dashboard.
        next = "/dashboard";
      }
    }

    if (next === null) return trail; // rendered something
    if (trail.includes(next)) {
      throw new Error(`loop: ${[...trail, next].join(" -> ")}`);
    }
    trail.push(next);
    path = next;
  }
  throw new Error(`did not settle in 12 hops: ${trail.join(" -> ")}`);
}

test("no account state can loop, from any entry point", () => {
  for (const state of STATES) {
    for (const start of START_PATHS) {
      assert.doesNotThrow(
        () => walk(state, start),
        `state ${JSON.stringify(state)} from ${start}`
      );
    }
  }
});

test("the founder's exact state reaches the platform area", () => {
  // Signed in, on the operator roster, member of no school. This is the state
  // that was locked out.
  const founder = { hasClaims: true, hasProfile: false, isOperator: true };
  assert.deepEqual(walk(founder, "/dashboard"), ["/dashboard", "/platform"]);
  assert.deepEqual(walk(founder, "/platform"), ["/platform"]);
  assert.deepEqual(walk(founder, "/login"), ["/login", "/dashboard", "/platform"]);
});

test("a session with no school and no roster entry is signed out, not looped", () => {
  const orphan = { hasClaims: true, hasProfile: false, isOperator: false };
  const trail = walk(orphan, "/dashboard");
  assert.deepEqual(trail, ["/dashboard", "/logout?reason=no-profile", "/login (signed out)"]);
});

test("an ordinary school user still lands on the dashboard", () => {
  const teacher = { hasClaims: true, hasProfile: true, isOperator: false };
  assert.deepEqual(walk(teacher, "/dashboard"), ["/dashboard"]);
  assert.deepEqual(walk(teacher, "/login"), ["/login", "/dashboard"]);
  // Not an operator: bounced out of the platform area, and it settles there.
  assert.deepEqual(walk(teacher, "/platform"), ["/platform", "/dashboard"]);
});

test("a signed-out visitor is sent to log in", () => {
  const anon = { hasClaims: false, hasProfile: false, isOperator: false };
  assert.deepEqual(walk(anon, "/dashboard"), ["/dashboard", "/login"]);
  assert.deepEqual(walk(anon, "/platform"), ["/platform", "/login"]);
  assert.deepEqual(walk(anon, "/login"), ["/login"]);
});

// Control. The walker must actually be able to detect the bug it was written
// for, otherwise the suite above passes for the wrong reason. This restores the
// old behaviour — missing profile went to /login — and demands a loop.
test("the walker detects the original bug when it is put back", () => {
  const founder = { hasClaims: true, hasProfile: false, isOperator: true };
  const buggy = (state, start) => {
    const trail = [start];
    let path = start;
    for (let hop = 0; hop < 12; hop++) {
      let next = proxyRedirect(state, path);
      if (next === null && path.startsWith("/dashboard") && !state.hasProfile) {
        next = "/login"; // the bug
      }
      if (next === null) return trail;
      if (trail.includes(next)) throw new Error("loop");
      trail.push(next);
      path = next;
    }
    throw new Error("no settle");
  };
  assert.throws(() => buggy(founder, "/dashboard"), /loop/);
});
