-- FoodShare - initial Supabase schema
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query -> Run.

-- ============================================================
-- profiles: one row per auth.users row, holds app-specific fields
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  first_name text not null,
  last_name text not null,
  phone_prefix text,
  phone_number text,
  birth_year int,
  gender text,
  city text,
  is_admin boolean not null default false,
  login_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- everyone can read basic profile info (needed to show the poster's username on the board)
create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- a user can create their own profile row right after signing up
create policy "users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- a user can update their own row; an admin can update any row
-- (is_admin / login_count are locked down separately below - this only covers ordinary columns)
create policy "self or admin can update profile"
  on public.profiles for update
  using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- only an admin can delete a profile
create policy "admins can delete profiles"
  on public.profiles for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- Column-level lockdown: nobody can directly UPDATE is_admin or login_count through PostgREST,
-- even on their own row (RLS is row-level, not column-level, so this needs an explicit REVOKE).
-- Changing them only happens through the SECURITY DEFINER functions below.
-- IMPORTANT: revoke the table-level privilege first - Supabase grants table-level
-- UPDATE to `authenticated` by default on every new table, and that covers every
-- column regardless of any column-level revoke you layer on top of it.
revoke update on public.profiles from authenticated;
grant update (username, first_name, last_name, phone_prefix, phone_number, birth_year, gender, city)
  on public.profiles to authenticated;

-- Lets a signed-in user bump their own login_count without being able to edit anyone else's.
create or replace function public.increment_login_count()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set login_count = login_count + 1 where id = auth.uid();
$$;

grant execute on function public.increment_login_count() to authenticated;

-- Lets an existing admin promote/demote another user. Checks the caller is already an admin.
create or replace function public.set_admin_status(target_user uuid, new_value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'only an admin can change admin status';
  end if;
  update public.profiles set is_admin = new_value where id = target_user;
end;
$$;

grant execute on function public.set_admin_status(uuid, boolean) to authenticated;

-- ============================================================
-- food_items
-- ============================================================
create table public.food_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_name text not null,
  category text not null,
  pickup_city text not null,
  pickup_location text not null,
  expiry_date date not null,
  quantity int not null,
  post_date timestamptz not null default now()
);

alter table public.food_items enable row level security;

create policy "food items are viewable by everyone"
  on public.food_items for select
  using (true);

create policy "signed-in users can post food items as themselves"
  on public.food_items for insert
  with check (auth.uid() = user_id);

create policy "owner or admin can update food items"
  on public.food_items for update
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "owner or admin can delete food items"
  on public.food_items for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ============================================================
-- After running this: make yourself an admin once, manually, e.g.
--   update public.profiles set is_admin = true where username = 'YOUR_USERNAME';
-- (only needed the first time - after that, set_admin_status() works from the admin panel)
-- ============================================================
