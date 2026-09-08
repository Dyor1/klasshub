/** Turns a person's typing into something safe to hand PostgREST.
 *
 *  Two separate hazards, both of which look like nothing until someone types a
 *  punctuation mark into a search box:
 *
 *  1. PostgREST's `or=(a.ilike.*x*,b.ilike.*x*)` filter is a *string* grammar.
 *     A comma in the search term ends one condition and starts another, and a
 *     parenthesis closes the group — so searching for "Okafor, Emeka" does not
 *     return nothing, it returns whatever the mangled filter happens to mean.
 *     RLS still bounds the result to the caller's school, so this cannot leak
 *     another tenant's rows; it silently returns the wrong ones.
 *
 *  2. `%` and `_` are LIKE wildcards. Someone searching for a literal
 *     underscore in an admission number should not match every character.
 *
 *  Kept free of Next and Supabase imports so it can be unit tested. */

/** Characters that terminate or restructure a PostgREST filter expression. */
const POSTGREST_SYNTAX = /[,.()"'\\:]/g;

/** Escapes LIKE wildcards so they match themselves. Backslash is the default
 *  escape character in Postgres LIKE. */
function escapeLikeWildcards(value: string): string {
  return value.replace(/[%_]/g, (c) => `\\${c}`);
}

/**
 * Normalises a raw search box value into an `ilike` pattern, or null when
 * there is nothing worth filtering on.
 *
 * Returns null rather than an empty pattern so callers can skip the filter
 * entirely — `ilike.%%` matches every row and would quietly disable any
 * intended narrowing.
 */
export function ilikePattern(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const cleaned = raw
    .replace(POSTGREST_SYNTAX, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length === 0) return null;

  return `%${escapeLikeWildcards(cleaned)}%`;
}

/**
 * Builds the `or=(...)` argument for a case-insensitive search across several
 * columns. Returns null when there is nothing to search for.
 *
 * Callers pass the result straight to `query.or(...)`, and must skip the call
 * when it is null.
 */
export function orIlike(columns: string[], raw: string | null | undefined): string | null {
  const pattern = ilikePattern(raw);
  if (!pattern) return null;
  if (columns.length === 0) return null;

  return columns.map((c) => `${c}.ilike.${pattern}`).join(",");
}

/**
 * One `or=(...)` expression per word in the term.
 *
 * A single expression cannot match a name split across columns: surname holds
 * "Okafor" and first_name holds "Emeka", so `%Okafor Emeka%` matches neither
 * and typing somebody's actual name returns nothing. That is the most natural
 * thing a user does, so it has to work.
 *
 * Applying each expression as its own `.or()` ANDs them in PostgREST, giving
 * "every word appears in some column" — which finds Okafor Emeka whichever
 * order the name is typed in, and still narrows as more words are added.
 */
export function searchClauses(columns: string[], raw: string | null | undefined): string[] {
  if (columns.length === 0) return [];

  const cleaned = (raw ?? "")
    .replace(POSTGREST_SYNTAX, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];

  return cleaned
    .split(" ")
    .map((word) => `%${escapeLikeWildcards(word)}%`)
    .map((pattern) => columns.map((c) => `${c}.ilike.${pattern}`).join(","));
}

/** The trimmed term to echo back in the UI ("3 results for …"). Not the
 *  pattern — showing someone `%Okafor%` is noise. */
export function displayTerm(raw: string | null | undefined): string {
  return (raw ?? "").trim();
}
