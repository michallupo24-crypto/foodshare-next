-- FoodShare - optional free-text address at registration
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- Mirrors AddItem's "כתובת / מיקום מדויק" text field, but for a user's own
-- profile instead of an item. Like everywhere else in this app, this is
-- never geocoded - it's just a free-text note, separate from lat/lon
-- (which come only from the browser's own GPS, per the no-external-API
-- design already used for items and precise distance).
--
-- Privacy: unlike an item's pickup location (already redacted/partial on
-- the public board, and the full text only ever shared voluntarily via
-- chat), a person's own registration address is more sensitive - it's
-- where they live, not a one-off pickup spot. So this column is
-- deliberately left OUT of the general SELECT grant below: nobody,
-- including the profile's own owner, can read it back through the plain
-- REST API. If a future "edit my profile" screen needs to show it back to
-- its owner, that needs a narrow SECURITY DEFINER function scoped to
-- auth.uid() (same pattern as owner_item_location()) - not a general
-- grant, which would let anyone read anyone's home address.

alter table public.profiles add column address text;

-- INSERT already has Supabase's original full-table grant (never revoked
-- for this table), so the new column is insertable with no changes there.
-- UPDATE was locked down to a specific column list in 005 - extend it to
-- include address too, for a future "edit my profile" feature.
revoke update on public.profiles from authenticated;
grant update (username, first_name, last_name, phone_prefix, phone_number, birth_year, gender, city, address)
  on public.profiles to authenticated;
