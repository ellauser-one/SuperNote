-- [INPUT]: auth.users（id FK）；roles: authenticated / service_role / anon
-- [OUTPUT]: public.profiles 表 + RLS owner-only policies + Data API grants
-- [POS]: api/supabase 契约 SQL；远程由 Supabase MCP execute_sql 执行；本文件为版本留底
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
--
-- 目标形态：
--   id uuid PK → auth.users(id) ON DELETE CASCADE
--   email / nickname(not null) / username / avatar_url / age / bio / headline /
--   location / website_url / company / role / honor_title /
--   reputation_score / badges / social_links / metadata / created_at / updated_at
-- 安全：RLS on；select/insert/update 仅 authenticated 且 (select auth.uid()) = id
-- 幂等：可对已有 profiles 表升级（兼容 display_name → nickname）

-- ---------------------------------------------------------------------------
-- 1) 表（不存在则建；存在则补列）
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nickname text not null,
  username text,
  avatar_url text,
  age integer,
  bio text,
  headline text,
  location text,
  website_url text,
  company text,
  role text,
  honor_title text,
  reputation_score integer default 0,
  badges jsonb default '[]'::jsonb,
  social_links jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 既有表升级：按需加列（IF NOT EXISTS）
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists nickname text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists age integer;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists website_url text;
alter table public.profiles add column if not exists company text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists honor_title text;
alter table public.profiles add column if not exists reputation_score integer default 0;
alter table public.profiles add column if not exists badges jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists social_links jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- display_name → nickname 迁移（若旧列存在）
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'display_name'
  ) then
    update public.profiles
    set nickname = coalesce(
      nullif(btrim(nickname), ''),
      nullif(btrim(display_name), ''),
      nullif(btrim(username), ''),
      nullif(split_part(coalesce(email, ''), '@', 1), ''),
      'user'
    )
    where nickname is null
       or btrim(nickname) = '';
  else
    update public.profiles
    set nickname = coalesce(
      nullif(btrim(nickname), ''),
      nullif(btrim(username), ''),
      nullif(split_part(coalesce(email, ''), '@', 1), ''),
      'user'
    )
    where nickname is null
       or btrim(nickname) = '';
  end if;
end $$;

-- nickname 非空约束
alter table public.profiles
  alter column nickname set not null;

-- 默认值加固（对既有列）
alter table public.profiles
  alter column reputation_score set default 0;
alter table public.profiles
  alter column badges set default '[]'::jsonb;
alter table public.profiles
  alter column social_links set default '{}'::jsonb;
alter table public.profiles
  alter column metadata set default '{}'::jsonb;
alter table public.profiles
  alter column created_at set default now();
alter table public.profiles
  alter column updated_at set default now();

comment on table public.profiles is
  'User profile (1:1 auth.users); owner-only via RLS; service_role for server API';
comment on column public.profiles.id is 'Same as auth.users.id';
comment on column public.profiles.nickname is 'Required display nickname';
comment on column public.profiles.username is 'Optional unique handle';
comment on column public.profiles.reputation_score is 'Server-managed reputation; default 0';
comment on column public.profiles.badges is 'JSON array of badge objects';
comment on column public.profiles.social_links is 'JSON map of social network URLs';
comment on column public.profiles.metadata is 'Extensible JSON bag';

-- updated_at 触发器
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

-- ---------------------------------------------------------------------------
-- 2) RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ( (select auth.uid()) = id );

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- ---------------------------------------------------------------------------
-- 3) Data API grants
-- ---------------------------------------------------------------------------

revoke all privileges on table public.profiles from anon, authenticated, service_role;
grant usage on schema public to authenticated, service_role;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;
