-- Creates the Quick Chat phrases table used by the Store (`chat_presets`)
-- and seeds a small starter set of phrases.
--
-- NOTE:
-- - The client reads from `public.chat_presets` via `fetchChatPresets()`
-- - Purchasing uses `purchasePhrase()` which updates `profiles.unlocked_phrases`
-- - This table is NOT a generic "shop items" table; it is specific to quick chats.

-- Enable gen_random_uuid() if needed
create extension if not exists "pgcrypto";

create table if not exists public.chat_presets (
  id uuid primary key default gen_random_uuid(),
  phrase text not null,
  style text not null default 'standard' check (style in ('standard', 'gold', 'neon', 'wiggle')),
  bundle_id text null,
  price integer not null default 100 check (price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists chat_presets_bundle_id_idx on public.chat_presets(bundle_id);
create index if not exists chat_presets_created_at_idx on public.chat_presets(created_at);

alter table public.chat_presets enable row level security;

-- Allow anyone to read presets so the shop can display them.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_presets'
      and policyname = 'chat_presets_read'
  ) then
    create policy "chat_presets_read"
      on public.chat_presets
      for select
      using (true);
  end if;
end $$;

-- Seed phrases (stable UUIDs so ownership IDs remain consistent across envs)
insert into public.chat_presets (id, phrase, style, price)
values
  -- Standard phrases (60-100 gems)
  ('33333333-3333-3333-3333-333333333333', 'Chill Guy', 'standard', 80),
  ('44444444-4444-4444-4444-444444444444', 'No cap', 'standard', 80),
  ('66666666-6666-6666-6666-666666666666', 'L', 'standard', 60),
  ('88888888-8888-8888-8888-888888888888', 'Respect', 'standard', 70),
  ('99999999-9999-9999-9999-999999999999', 'GG', 'standard', 60),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nice!', 'standard', 60),
  
  -- Premium Bronze tier (100 gems) - Special styles
  ('11111111-1111-1111-1111-111111111111', 'Skibidi', 'wiggle', 100),
  ('22222222-2222-2222-2222-222222222222', 'Six 7', 'neon', 100),
  ('77777777-7777-7777-7777-777777777777', 'Sheesh', 'wiggle', 100),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Fire', 'neon', 100),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Savage', 'wiggle', 100),
  
  -- Premium Silver tier (300 gems) - High-end styles
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Absolute Legend', 'gold', 300),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Unstoppable', 'neon', 300),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'God Mode', 'gold', 300),
  ('10101010-1010-1010-1010-101010101010', 'Elite Player', 'neon', 300),
  ('20202020-2020-2020-2020-202020202020', 'Master Class', 'gold', 300),
  
  -- Premium Gold tier (500 gems) - Ultimate phrases
  ('30303030-3030-3030-3030-303030303030', 'Supreme Victory', 'gold', 500),
  ('40404040-4040-4040-4040-404040404040', 'Perfect Play', 'neon', 500),
  ('50505050-5050-5050-5050-505050505050', 'Flawless', 'gold', 500),
  ('60606060-6060-6060-6060-606060606060', 'Untouchable', 'neon', 500),
  ('70707070-7070-7070-7070-707070707070', 'Legendary', 'gold', 500)
on conflict (id) do update
set
  phrase = excluded.phrase,
  style = excluded.style,
  price = excluded.price;

