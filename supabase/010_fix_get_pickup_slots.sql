-- FoodShare - fix ambiguous column reference in get_pickup_slots()
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query -> Run.
-- (Run after 009_pickup_coordination.sql, which must already exist.)
--
-- Bug: `returns table (id bigint, ...)` makes `id` an OUT parameter in scope
-- for the whole function body. The unqualified `where id = target_item` on
-- food_items was ambiguous between that OUT parameter and food_items.id,
-- so every call failed with "column reference id is ambiguous" (42702) -
-- confirmed live: add_pickup_slot worked (no such name collision there),
-- but every get_pickup_slots call errored, so the UI could never display
-- a slot that was actually saved. Fix: qualify the column explicitly.

create or replace function public.get_pickup_slots(target_item bigint, target_user uuid)
returns table (id bigint, slot_date date, start_time time, end_time time)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select food_items.user_id into v_owner from food_items where food_items.id = target_item;
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
