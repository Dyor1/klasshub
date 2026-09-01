#!/usr/bin/env bash
# Runs every RLS/enforcement suite against a database.
#
#   DATABASE_URL="postgresql://postgres:PASS@HOST:5432/postgres" ./supabase/tests/run.sh
#
# Each suite is one transaction ending in ROLLBACK, so this is safe to point at
# a database with real data in it — nothing survives the run. That is also why
# the suites can create whole schools: they are gone by the time psql exits.
#
# ON_ERROR_STOP is what makes this a test runner rather than a script that
# prints errors and reports success anyway.
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set." >&2
  echo "Supabase dashboard -> Project Settings -> Database -> Connection string." >&2
  exit 2
fi

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
failed=0

for file in "$dir"/[0-9][0-9]_*.sql; do
  name="$(basename "$file")"
  if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$file" >/dev/null 2>/tmp/kh_test_err; then
    echo "  PASS  $name"
  else
    echo "  FAIL  $name"
    sed 's/^/        /' /tmp/kh_test_err
    failed=1
  fi
done

if [[ $failed -eq 0 ]]; then
  echo "All suites passed."
else
  echo "Some suites failed." >&2
fi
exit $failed
