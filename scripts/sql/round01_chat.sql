-- GEB round: 01 | scope: chat session persistence
-- tables: public.chat_sessions, public.chat_messages
-- security: RLS owner-only (user_id = auth.uid())
-- index: chat_sessions list (user_id, updated_at desc) where deleted_at is null

-- ============================================================================
-- chat_sessions: 会话主表
-- ============================================================================
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '新对话',
  title_source text not null default 'default'
    constraint chat_sessions_title_source_check check (title_source in ('user', 'auto', 'default')),
  model text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.chat_sessions is 'Chat conversation sessions; soft-delete via deleted_at; owner-only via RLS';
comment on column public.chat_sessions.title_source is 'user=renamed, auto=AI-generated, default=untitled';

-- updated_at 维护
create or replace function public.set_chat_sessions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger chat_sessions_set_updated_at
  before update on public.chat_sessions
  for each row
  execute function public.set_chat_sessions_updated_at();

-- 会话列表索引：按 user_id + updated_at desc，过滤软删
create index chat_sessions_user_updated_idx
  on public.chat_sessions (user_id, updated_at desc)
  where deleted_at is null;

-- ============================================================================
-- chat_messages: 消息明细表
-- ============================================================================
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id text not null,
  role text not null
    constraint chat_messages_role_check check (role in ('user', 'assistant')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_session_client_unique unique (session_id, client_id)
);

comment on table public.chat_messages is 'Chat messages within sessions; client_id for idempotent upsert; content stores UIMessage v5 parts';
comment on column public.chat_messages.client_id is 'Frontend-generated stable id; used as idempotency key';
comment on column public.chat_messages.content is 'UIMessage v5 parts array (jsonb); direct storage without transformation';

-- 消息查询索引：按 session + created_at
create index chat_messages_session_created_idx
  on public.chat_messages (session_id, created_at desc);

-- ============================================================================
-- RLS: owner-only (双保险：应用层也强制 user_id 过滤)
-- ============================================================================
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- chat_sessions policies
create policy "chat_sessions_select_own"
  on public.chat_sessions
  for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "chat_sessions_insert_own"
  on public.chat_sessions
  for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "chat_sessions_update_own"
  on public.chat_sessions
  for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "chat_sessions_delete_own"
  on public.chat_sessions
  for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- chat_messages policies
create policy "chat_messages_select_own"
  on public.chat_messages
  for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "chat_messages_insert_own"
  on public.chat_messages
  for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "chat_messages_update_own"
  on public.chat_messages
  for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "chat_messages_delete_own"
  on public.chat_messages
  for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- Data API: 显式授予角色（RLS 仍约束行）
grant select, insert, update, delete on table public.chat_sessions to authenticated;
grant select, insert, update, delete on table public.chat_messages to authenticated;
revoke all on table public.chat_sessions from anon;
revoke all on table public.chat_messages from anon;
