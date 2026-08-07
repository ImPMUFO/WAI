-- WAIMA Supabase Schema + RLS
-- اجرا در SQL Editor سوپابیس

create extension if not exists "pgcrypto";

-- پروفایل
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text,
  username_changed_on date,
  username_change_count int not null default 0,
  avatar_url text,
  locale text not null default 'fa' check (locale in ('fa','en','ar')),
  theme text not null default 'main',
  interests jsonb not null default '[]'::jsonb,
  xp int not null default 0,
  level int not null default 1,
  streak int not null default 0,
  last_active_date date,
  game_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- گفتگوها
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

-- نقشه ذهن
create table if not exists public.mind_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  map_key text not null default 'unified',
  summary text,
  nodes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique(user_id, map_key)
);

-- فعالیت و بازی
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text,
  score int not null default 0,
  total int not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ایندکس
create index if not exists idx_messages_conv on public.messages(conversation_id, created_at);
create index if not exists idx_conversations_user on public.conversations(user_id, updated_at desc);
create index if not exists idx_activity_user on public.activity_log(user_id, created_at desc);

-- پروفایل خودکار بعد از signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.mind_maps enable row level security;
alter table public.activity_log enable row level security;
alter table public.quiz_runs enable row level security;

-- policies: فقط صاحب داده
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "conv_all_own" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "msg_all_own" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "maps_all_own" on public.mind_maps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "activity_all_own" on public.activity_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "quiz_all_own" on public.quiz_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- آیدی یکتا
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;
