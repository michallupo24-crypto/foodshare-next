-- FoodShare - fixes the "already reviewed?" check broken by 005
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- After 005 revoked table-level SELECT on reviews (correctly, to protect
-- reviewer_id), the app's own "did I already review this encounter?" check
-- broke too - it filtered `WHERE reviewer_id = eq.<my id>`, and filtering on
-- a column requires SELECT privilege on that column, same as reading it
-- back. A SECURITY DEFINER function sidesteps this: it checks auth.uid()
-- internally and only returns a boolean, never reviewer_id itself.

create or replace function public.has_reviewed(target_reviewee uuid, target_item bigint)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from reviews
    where reviewer_id = auth.uid()
      and reviewee_id = target_reviewee
      and item_id = target_item
  );
$$;

grant execute on function public.has_reviewed(uuid, bigint) to authenticated;
