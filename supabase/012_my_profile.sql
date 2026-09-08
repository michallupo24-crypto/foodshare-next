-- FoodShare - let a signed-in user read back their own full profile
-- (including address, which is deliberately excluded from the general
-- SELECT grant for privacy - see 011_profile_address.sql) so an
-- "edit my profile" screen can prefill a form with their real data.
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- Same pattern as owner_item_location(): a narrow SECURITY DEFINER
-- function scoped to auth.uid(), not a general grant - so nobody can read
-- anyone else's address through this.

create or replace function public.my_profile()
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  phone_prefix text,
  phone_number text,
  birth_year int,
  gender text,
  city text,
  address text,
  trust_points int,
  is_blocked boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.username, p.first_name, p.last_name, p.phone_prefix, p.phone_number,
         p.birth_year, p.gender, p.city, p.address, p.trust_points, p.is_blocked, p.created_at
  from profiles p
  where p.id = auth.uid();
$$;

grant execute on function public.my_profile() to authenticated;
