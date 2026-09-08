-- FoodShare - automatic GPS address-sharing in chat + pickup-time coordination
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query -> Run.
-- (Run after 008_precise_location.sql, which must already exist.)

-- ── Part 1: let an item's owner read back their own item's GPS coordinates ──
-- 008_precise_location.sql deliberately locks lat/lon out of the general
-- SELECT grant on food_items (anti-trilateration). But the owner already
-- knows their own item's coordinates - they typed them in via the browser's
-- geolocation API - so a narrow SECURITY DEFINER function that only ever
-- returns an item's coordinates to that item's own owner is safe, and lets
-- the chat page auto-share a precise map link instead of requiring a typed
-- address (which may not exist at all for GPS-only items).
create or replace function public.owner_item_location(target_item bigint)
returns table (lat double precision, lon double precision)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from food_items where id = target_item and user_id = auth.uid()) then
    raise exception 'אין הרשאה';
  end if;

  return query select f.lat, f.lon from food_items f where f.id = target_item;
end;
$$;

grant execute on function public.owner_item_location(bigint) to authenticated;

-- ── Part 2: pickup-time coordination between the item owner and one interested user ──
-- Each side can mark one or more free time ranges (per day, within the
-- item's remaining shelf life). The table itself is fully locked down -
-- every read/write goes through a SECURITY DEFINER function below - so a
-- user's marked availability is never exposed to anyone except the specific
-- other person in that item's conversation (owner <-> that one buyer).

create table public.pickup_slots (
  id bigint generated always as identity primary key,
  item_id bigint not null references public.food_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint valid_range check (start_time < end_time)
);

create index pickup_slots_lookup_idx on public.pickup_slots (item_id, user_id, slot_date);

alter table public.pickup_slots enable row level security;
revoke all on public.pickup_slots from authenticated, anon;
-- no policies defined on purpose - with RLS on and no permissive policy,
-- every direct table access is denied; the functions below (SECURITY
-- DEFINER, running as the table owner) are the only way in or out.

create or replace function public.add_pickup_slot(target_item bigint, target_date date, start_t time, end_t time)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expiry date;
  v_new_id bigint;
begin
  if start_t >= end_t then
    raise exception 'טווח שעות לא תקין';
  end if;

  select expiry_date into v_expiry from food_items where id = target_item;
  if v_expiry is null then
    raise exception 'המוצר לא נמצא';
  end if;

  if target_date < current_date or target_date > v_expiry then
    raise exception 'התאריך מחוץ לטווח התוקף של המוצר';
  end if;

  if exists (
    select 1 from pickup_slots
    where item_id = target_item and user_id = auth.uid() and slot_date = target_date
      and start_time < end_t and start_t < end_time
  ) then
    raise exception 'הטווח חופף לטווח קיים שכבר סימנת ביום הזה';
  end if;

  insert into pickup_slots (item_id, user_id, slot_date, start_time, end_time)
  values (target_item, auth.uid(), target_date, start_t, end_t)
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function public.add_pickup_slot(bigint, date, time, time) to authenticated;

create or replace function public.remove_pickup_slot(target_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  delete from pickup_slots where id = target_id and user_id = auth.uid();
$$;

grant execute on function public.remove_pickup_slot(bigint) to authenticated;

-- returns target_user's marked ranges for this item - allowed only if the
-- caller is target_user themself, is the item's owner (viewing a buyer's
-- marks), or target_user IS the item's owner (a buyer viewing the owner's
-- marks). Two arbitrary non-owner users can never see each other's marks.
create or replace function public.get_pickup_slots(target_item bigint, target_user uuid)
returns table (id bigint, slot_date date, start_time time, end_time time)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from food_items where id = target_item;
  if v_owner is null then
    raise exception 'המוצר לא נמצא';
  end if;

  if auth.uid() <> target_user and auth.uid() <> v_owner and target_user <> v_owner then
    raise exception 'אין הרשאה';
  end if;

  return query
    select p.id, p.slot_date, p.start_time, p.end_time
    from pickup_slots p
    where p.item_id = target_item and p.user_id = target_user
    order by p.slot_date, p.start_time;
end;
$$;

grant execute on function public.get_pickup_slots(bigint, uuid) to authenticated;
