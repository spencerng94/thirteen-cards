-- Add created_at column to chat_presets table if it doesn't exist
-- This migration fixes the issue where the table exists but is missing the created_at column

-- Add created_at column if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chat_presets'
      and column_name = 'created_at'
  ) then
    alter table public.chat_presets
    add column created_at timestamptz not null default now();
  end if;
end $$;
