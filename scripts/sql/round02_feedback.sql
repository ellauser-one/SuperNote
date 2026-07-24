-- GEB round: 02 | scope: minimal feedback loop + memo classification field
-- tables: public.feedback (new), public.memos.category (add column if missing)
-- security: RLS owner-only for feedback (api writes via service_role, bypasses RLS)
-- index: feedback list (owner_id, created_at desc)

-- ============================================================================
-- public.feedback: 最小反馈闭环数据表
-- 由 api POST /api/feedback 写入（仅走 Supabase REST / service_role）
-- ============================================================================
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  page text not null default 'unknown',
  message text not null,
  screenshot_url text,
  created_at timestamptz not null default now()
);

comment on table public.feedback is 'Minimal user feedback loop; written only via api service_role; owner_id nullable for anonymous feedback';
comment on column public.feedback.owner_id is 'null when submitted by anonymous/unauthenticated user';
comment on column public.feedback.page is 'route or surface the feedback was submitted from';
comment on column public.feedback.message is 'free-text feedback, required';
comment on column public.feedback.screenshot_url is 'optional uploaded screenshot url';

-- 反馈列表索引
create index if not exists feedback_owner_created_idx
  on public.feedback (owner_id, created_at desc);

-- ============================================================================
-- public.memos.category: AI 自动分类结果落库字段
-- 由 api POST /agent/memos/classify 写入（agent 返回的 category 路径字符串）
-- ============================================================================
alter table public.memos
  add column if not exists category text;

comment on column public.memos.category is 'AI-suggested classification path (e.g. "work/project"); set by /agent/memos/classify';

-- ============================================================================
-- RLS: feedback owner-only（service_role 写入时绕过 RLS，此处约束直接访问）
-- ============================================================================
alter table public.feedback enable row level security;

create policy "feedback_select_own"
  on public.feedback
  for select
  to authenticated
  using ( (select auth.uid()) = owner_id );

create policy "feedback_insert_own"
  on public.feedback
  for insert
  to authenticated
  with check ( (select auth.uid()) = owner_id or owner_id is null );

create policy "feedback_update_own"
  on public.feedback
  for update
  to authenticated
  using ( (select auth.uid()) = owner_id )
  with check ( (select auth.uid()) = owner_id );

create policy "feedback_delete_own"
  on public.feedback
  for delete
  to authenticated
  using ( (select auth.uid()) = owner_id );

-- Data API: 显式授予角色（RLS 仍约束行）
grant select, insert, update, delete on table public.feedback to authenticated;
revoke all on table public.feedback from anon;
