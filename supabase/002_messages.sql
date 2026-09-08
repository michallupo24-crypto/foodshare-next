-- FoodShare - in-app chat
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query -> Run.
-- (Run after schema.sql, which must already exist.)

create table public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  item_id bigint references public.food_items (id) on delete set null,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_conversation_idx on public.messages (sender_id, receiver_id, created_at);

alter table public.messages enable row level security;

-- only the two participants can see a message
create policy "participants can view their messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- you can only send a message as yourself
create policy "users can send messages as themselves"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- only the receiver can mark a message read
create policy "receiver can mark messages read"
  on public.messages for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- needed for Supabase Realtime to deliver postgres_changes events under RLS
alter publication supabase_realtime add table public.messages;

-- one row per conversation partner, with the last message and unread count -
-- avoids needing complex GROUP BY logic over PostgREST from the app
create or replace function public.list_conversations()
returns table (
  other_user_id uuid,
  other_username text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    other.id,
    other.username,
    lm.body,
    lm.created_at,
    (select count(*) from messages um
       where um.receiver_id = auth.uid() and um.sender_id = other.id and um.read_at is null)
  from (
    select distinct
      case when sender_id = auth.uid() then receiver_id else sender_id end as other_id
    from messages
    where sender_id = auth.uid() or receiver_id = auth.uid()
  ) c
  join profiles other on other.id = c.other_id
  join lateral (
    select body, created_at
    from messages
    where (sender_id = auth.uid() and receiver_id = other.id)
       or (sender_id = other.id and receiver_id = auth.uid())
    order by created_at desc
    limit 1
  ) lm on true
  order by lm.created_at desc;
$$;

grant execute on function public.list_conversations() to authenticated;

-- marks every message from other_user to me as read
create or replace function public.mark_conversation_read(other_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update messages set read_at = now()
  where receiver_id = auth.uid() and sender_id = other_user and read_at is null;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- cheap total-unread count for the nav bar badge (avoids fetching all conversations every page load)
create or replace function public.unread_message_count()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from messages where receiver_id = auth.uid() and read_at is null;
$$;

grant execute on function public.unread_message_count() to authenticated;
