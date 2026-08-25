-- The cbt_submit body already carries the enum cast; this migration exists
-- because the first version of the function used a bare CASE, which yields
-- text and cannot implicitly cast to an enum, so submitting failed at the
-- final UPDATE. Kept as a no-op re-apply so the local history matches the
-- database.
--
-- See 20260825015959_cbt_rpcs.sql for the corrected definition.
select 1;
