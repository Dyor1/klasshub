-- The test helpers shipped without an explicit search_path, which put eight
-- warnings into the security advisor. The practical risk is nil — the tests
-- schema is revoked from every production role — but advisor noise is how a
-- real finding gets missed later, so they are pinned like everything else.
--
-- pg_catalog rather than '' because these call format(), set_config() and
-- json_build_object(). The fixture functions already use '' and qualify
-- everything, and are left alone.
alter function tests.fail(text)                              set search_path = pg_catalog;
alter function tests.assert(boolean, text)                   set search_path = pg_catalog;
alter function tests.assert_eq(anyelement, anyelement, text) set search_path = pg_catalog;
alter function tests.assert_denied(text, text, text)         set search_path = pg_catalog;
alter function tests.assert_allowed(text, text)              set search_path = pg_catalog;
alter function tests.authenticate_as(uuid)                   set search_path = pg_catalog;
alter function tests.authenticate_as_anon()                  set search_path = pg_catalog;
alter function tests.clear_auth()                            set search_path = pg_catalog;
