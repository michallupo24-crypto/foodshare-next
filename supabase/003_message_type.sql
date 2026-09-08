-- FoodShare - message types (for the "send address" chat button)
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query -> Run.
-- (Run after 002_messages.sql, which must already exist.)

alter table public.messages
  add column message_type text not null default 'text'
  check (message_type in ('text', 'address'));
