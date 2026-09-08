-- FoodShare - anonymous reviews
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query -> Run.
-- (Run after 002_messages.sql, which must already exist.)

create table public.reviews (
  id bigint generated always as identity primary key,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  item_id bigint not null references public.food_items (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (reviewer_id, reviewee_id, item_id)
);

alter table public.reviews enable row level security;

-- everyone can read reviews (they're how trust gets built) - but see the
-- column-level revoke below: reviewer_id itself is never readable, which is
-- what makes this genuinely anonymous rather than just hidden in the UI
create policy "reviews are viewable by everyone"
  on public.reviews for select
  using (true);

-- you can only review someone you actually exchanged messages with about
-- that specific item - not yourself, not a stranger, not a made-up item
create policy "can review after messaging about the item"
  on public.reviews for insert
  with check (
    auth.uid() = reviews.reviewer_id
    and reviews.reviewer_id <> reviews.reviewee_id
    and exists (
      select 1 from messages m
      where m.item_id = reviews.item_id
        and ((m.sender_id = reviews.reviewer_id and m.receiver_id = reviews.reviewee_id)
          or (m.sender_id = reviews.reviewee_id and m.receiver_id = reviews.reviewer_id))
    )
  );

-- true anonymity, not just a UI choice: nobody (any role, any query) can ever
-- select reviewer_id back out through the API, including the reviewer themself.
-- IMPORTANT: revoke the table-level privilege first - Supabase grants table-level
-- SELECT to `anon`/`authenticated` by default on every new table, and that covers
-- every column regardless of any column-level revoke layered on top of it.
revoke select on public.reviews from authenticated, anon;
grant select (id, reviewee_id, item_id, rating, comment, created_at)
  on public.reviews to authenticated, anon;

-- one row per reviewee with their average rating and review count - lets the
-- app avoid computing this per-page-load with a manual aggregate query
create or replace view public.review_summaries as
select
  reviewee_id,
  round(avg(rating)::numeric, 1) as average_rating,
  count(*) as review_count
from public.reviews
group by reviewee_id;

grant select on public.review_summaries to authenticated, anon;
