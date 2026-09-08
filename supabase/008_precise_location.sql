-- FoodShare - optional GPS location for a real (not just city-level) distance
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- Design: the browser's own navigator.geolocation API supplies lat/lon
-- directly - no external geocoding service, no API key, no cost. A typed
-- address alone can't be turned into coordinates without such a service, so
-- this is "share location" only, exactly as scoped.
--
-- Privacy: raw lat/lon are never exposed through the general REST API to
-- anyone (not even the profiles/food_items owner's own other data) - only
-- item_distance_km() can read them, and it only ever returns a number of
-- kilometers, never the coordinates themselves. It also only trusts the
-- caller's *own* stored profile location (via auth.uid()), not a
-- caller-supplied lat/lon, specifically so a bad actor can't probe an
-- item's exact location by querying from many different fake points
-- (trilateration) - the only way in is to actually be a real signed-in
-- user with a real shared location on your own account.

alter table public.profiles add column lat double precision;
alter table public.profiles add column lon double precision;

alter table public.food_items add column lat double precision;
alter table public.food_items add column lon double precision;

-- lock down SELECT on both tables to exclude lat/lon from the general
-- grant (table-level revoke first, then re-grant every other column -
-- see the 005 lesson for why a column-only revoke alone doesn't work)
revoke select on public.profiles from authenticated, anon;
grant select (id, username, first_name, last_name, phone_prefix, phone_number, birth_year, gender, city, is_admin, login_count, trust_points, is_blocked, created_at)
  on public.profiles to authenticated, anon;

revoke select on public.food_items from authenticated, anon;
grant select (id, user_id, item_name, category, pickup_city, pickup_location, expiry_date, quantity, post_date, photo_url, photo_disabled)
  on public.food_items to authenticated, anon;

create or replace function public.item_distance_km(target_item bigint)
returns double precision
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_lat double precision;
  v_viewer_lon double precision;
  v_item_lat double precision;
  v_item_lon double precision;
begin
  select lat, lon into v_viewer_lat, v_viewer_lon from profiles where id = auth.uid();
  select lat, lon into v_item_lat, v_item_lon from food_items where id = target_item;

  if v_viewer_lat is null or v_viewer_lon is null or v_item_lat is null or v_item_lon is null then
    return null;
  end if;

  return 6371 * 2 * asin(sqrt(
    power(sin(radians(v_item_lat - v_viewer_lat) / 2), 2) +
    cos(radians(v_viewer_lat)) * cos(radians(v_item_lat)) * power(sin(radians(v_item_lon - v_viewer_lon) / 2), 2)
  ));
end;
$$;

grant execute on function public.item_distance_km(bigint) to authenticated;
