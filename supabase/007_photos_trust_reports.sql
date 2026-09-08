-- FoodShare - item photos, reporting, trust points, manual blocking
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query -> Run.
-- (Run after 004_reviews.sql and 006_has_reviewed_function.sql, which must already exist.)

-- ============================================================
-- storage bucket for item photos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

create policy "anyone can view item photos"
  on storage.objects for select
  using (bucket_id = 'item-photos');

create policy "users can upload their own item photos"
  on storage.objects for insert
  with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own item photos"
  on storage.objects for delete
  using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- profiles: trust points + manual block flag
-- ============================================================
alter table public.profiles add column trust_points int not null default 100;
alter table public.profiles add column is_blocked boolean not null default false;

-- ============================================================
-- food_items: photo + auto-disable flag
-- ============================================================
alter table public.food_items add column photo_url text;
alter table public.food_items add column photo_disabled boolean not null default false;

-- column-level lockdown, done correctly this time (table-level revoke first,
-- see 005's lesson): owner/admin can edit the ordinary fields + set a photo,
-- but nobody can touch photo_disabled directly through the generic API -
-- only the auto-disable trigger and resolve_photo_report() below can change it.
revoke update on public.food_items from authenticated;
grant update (item_name, category, pickup_city, pickup_location, expiry_date, quantity, photo_url)
  on public.food_items to authenticated;

-- gate: only a user with 2+ reviews received may set a photo - enforced in the
-- database, not just hidden in the UI, so a direct API call can't bypass it
create or replace function public.enforce_photo_eligibility()
returns trigger
language plpgsql
as $$
begin
  if new.photo_url is not null and (tg_op = 'INSERT' or old.photo_url is distinct from new.photo_url) then
    if (select count(*) from public.reviews where reviewee_id = new.user_id) < 2 then
      raise exception 'photo upload requires at least 2 reviews received';
    end if;
  end if;
  return new;
end;
$$;

create trigger food_items_photo_eligibility
  before insert or update on public.food_items
  for each row execute function public.enforce_photo_eligibility();

-- ============================================================
-- photo_reports
-- ============================================================
create table public.photo_reports (
  id bigint generated always as identity primary key,
  item_id bigint not null references public.food_items (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'upheld', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id)
);

alter table public.photo_reports enable row level security;

create policy "signed-in users can report a photo that isn't their own item"
  on public.photo_reports for insert
  with check (
    auth.uid() = reporter_id
    and exists (select 1 from public.food_items f where f.id = item_id and f.user_id <> reporter_id)
  );

create policy "reporter or admin can view a report"
  on public.photo_reports for select
  using (
    auth.uid() = reporter_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- lock down which columns a report can be inserted with - status/resolved_at/
-- resolved_by must never be settable by the reporter, only by resolve_photo_report()
revoke insert on public.photo_reports from authenticated;
grant insert (item_id, reporter_id, reason) on public.photo_reports to authenticated;

-- auto-disable the photo the instant it's reported (this is why it needs to be
-- a trigger and not app code: the reporter has no UPDATE rights on someone
-- else's food_items row at all, by design)
create or replace function public.disable_reported_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update food_items set photo_disabled = true where id = new.item_id;
  return new;
end;
$$;

create trigger photo_reports_auto_disable
  after insert on public.photo_reports
  for each row execute function public.disable_reported_photo();

-- admin resolves a report:
--   upheld    -> photo owner loses trust points, photo stays disabled
--   dismissed -> reporter loses trust points (frivolous report), photo re-enabled
create or replace function public.resolve_photo_report(report_id bigint, upheld boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id bigint;
  v_reporter_id uuid;
  v_owner_id uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'only an admin can resolve a report';
  end if;

  select item_id, reporter_id into v_item_id, v_reporter_id
    from photo_reports where id = report_id and status = 'pending';

  if v_item_id is null then
    raise exception 'report not found or already resolved';
  end if;

  select user_id into v_owner_id from food_items where id = v_item_id;

  if upheld then
    update photo_reports set status = 'upheld', resolved_at = now(), resolved_by = auth.uid() where id = report_id;
    update profiles set trust_points = trust_points - 15 where id = v_owner_id;
  else
    update photo_reports set status = 'dismissed', resolved_at = now(), resolved_by = auth.uid() where id = report_id;
    update profiles set trust_points = trust_points - 10 where id = v_reporter_id;
    update food_items set photo_disabled = false where id = v_item_id;
  end if;
end;
$$;

grant execute on function public.resolve_photo_report(bigint, boolean) to authenticated;

-- admin manually blocks/unblocks a user - always a deliberate admin decision,
-- never automatic, per how this was scoped
create or replace function public.set_user_blocked(target_user uuid, blocked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'only an admin can block/unblock a user';
  end if;
  update profiles set is_blocked = blocked where id = target_user;
end;
$$;

grant execute on function public.set_user_blocked(uuid, boolean) to authenticated;

-- how many 1-star reviews each user has received - lets the admin panel flag
-- candidates for manual blocking (>2 one-star reviews) without a manual query
create or replace view public.one_star_counts as
select reviewee_id, count(*) as one_star_count
from public.reviews
where rating = 1
group by reviewee_id;

grant select on public.one_star_counts to authenticated;
