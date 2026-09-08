-- FoodShare - FIX a real privilege-escalation bug
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- What was wrong: schema.sql and 004_reviews.sql tried to lock down specific
-- columns with `revoke <privilege> (column) on table from role`. That only
-- removes a *column-level* grant. Supabase's default setup already grants
-- table-level SELECT/INSERT/UPDATE/DELETE to `anon`/`authenticated` on every
-- new table in the public schema - and a table-level grant covers every
-- column regardless of any column-level revoke. So the earlier "lockdown"
-- did nothing: any authenticated user could PATCH their own profile's
-- is_admin to true, and reviewer_id was fully readable by anyone.
--
-- The fix: revoke the *table-level* privilege entirely, then grant it back
-- only for the specific columns that should be writable/readable.

-- profiles: no one can UPDATE any column via the generic table-level grant
-- anymore; only the explicitly listed (safe) columns are writable.
-- is_admin/login_count are deliberately left out - they only change through
-- increment_login_count()/set_admin_status(), which run as SECURITY DEFINER
-- and bypass this entirely.
revoke update on public.profiles from authenticated;
grant update (username, first_name, last_name, phone_prefix, phone_number, birth_year, gender, city)
  on public.profiles to authenticated;

-- reviews: no one can SELECT every column via the generic table-level grant
-- anymore; reviewer_id is deliberately left out of the granted list, so it
-- is genuinely unreadable through the API by anyone, including the reviewer.
revoke select on public.reviews from authenticated, anon;
grant select (id, reviewee_id, item_id, rating, comment, created_at)
  on public.reviews to authenticated, anon;

-- sanity check after running this: try `select * from reviews` as an anon/authenticated
-- role (or PATCH is_admin on your own profile via the REST API) - both should now fail.
