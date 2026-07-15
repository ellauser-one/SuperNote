-- public.profiles: app/auth 契约 (id, email, username) + 时间戳
-- 安全: RLS 开启；仅本人读写；username 大小写不敏感唯一
-- Remote applied via Supabase MCP apply_migration create_profiles (version 20260711031854)

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (
    username is null
    or (char_length(username) >= 3 and char_length(username) <= 24)
  ),
  constraint profiles_username_format check (
    username is null
    or username ~ '^[a-zA-Z0-9_]+$'
  )
);

comment on table public.profiles is 'User profile mirror of auth.users; username for display and api username login';
comment on column public.profiles.id is 'Same as auth.users.id';
comment on column public.profiles.username is 'Unique display name; 3-24 [A-Za-z0-9_]';

-- 大小写不敏感唯一（允许多个 null）
create unique index profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

create index profiles_email_idx on public.profiles (email);

-- updated_at 维护
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

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

-- RLS
alter table public.profiles enable row level security;

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

-- Data API: 显式授予角色（RLS 仍约束行）
grant select, insert, update on table public.profiles to authenticated;
revoke all on table public.profiles from anon;
