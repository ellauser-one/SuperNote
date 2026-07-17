-- [INPUT]: public.profiles(id)；roles: authenticated / service_role / anon
-- [OUTPUT]: public.memo_nodes + public.memos + 触发器 + RLS owner-only + Data API grants
-- [POS]: api/supabase 契约 SQL；远程由 Supabase MCP execute_sql 执行；本文件为版本留底
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
--
-- 树模型：folder / memo 同表 memo_nodes；parent_id null = 根；memos 仅 memo 节点正文
-- 安全：RLS on；authenticated 仅本人行；service_role 供 api service_role REST

-- ---------------------------------------------------------------------------
-- 1) memo_nodes（gen_random_uuid 依赖项目已启用 pgcrypto / 内建 uuid）
-- ---------------------------------------------------------------------------
create table if not exists public.memo_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid null,
  node_type text not null check (node_type in ('folder', 'memo')),
  title text not null check (length(btrim(title)) > 0),
  sort_order numeric(20, 8) not null default 1000,
  icon text,
  color text,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memo_nodes_user_id_id_unique unique (user_id, id),
  constraint memo_nodes_not_self_parent check (id is distinct from parent_id),
  constraint memo_nodes_parent_same_user
    foreign key (user_id, parent_id)
    references public.memo_nodes (user_id, id)
    on delete cascade
);

comment on table public.memo_nodes is
  'File-tree nodes (folder|memo); parent_id null = root; owner via user_id';
comment on column public.memo_nodes.node_type is 'folder | memo';
comment on column public.memo_nodes.sort_order is 'Sibling order; fractional inserts allowed';
comment on column public.memo_nodes.deleted_at is 'Soft delete; null = active';

create index if not exists memo_nodes_user_parent_sort_idx
  on public.memo_nodes (user_id, parent_id, sort_order, id)
  where deleted_at is null;

create index if not exists memo_nodes_user_root_sort_idx
  on public.memo_nodes (user_id, sort_order, id)
  where parent_id is null and deleted_at is null;

create index if not exists memo_nodes_user_type_idx
  on public.memo_nodes (user_id, node_type);

create index if not exists memo_nodes_parent_id_idx
  on public.memo_nodes (parent_id);

-- ---------------------------------------------------------------------------
-- 2) memos（正文，1:1 memo 节点）
-- ---------------------------------------------------------------------------
create table if not exists public.memos (
  node_id uuid primary key references public.memo_nodes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_mdx text not null default '',
  excerpt text,
  word_count integer not null default 0 check (word_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memos_user_node_unique unique (user_id, node_id),
  constraint memos_user_node_fk
    foreign key (user_id, node_id)
    references public.memo_nodes (user_id, id)
    on delete cascade
);

comment on table public.memos is
  'Memo body (MDX); only for memo_nodes.node_type = memo';

create index if not exists memos_user_updated_idx
  on public.memos (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- 3) 触发器函数
-- ---------------------------------------------------------------------------

-- 通用 updated_at
create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists memo_nodes_set_updated_at on public.memo_nodes;
create trigger memo_nodes_set_updated_at
  before update on public.memo_nodes
  for each row
  execute function public.set_current_timestamp_updated_at();

drop trigger if exists memos_set_updated_at on public.memos;
create trigger memos_set_updated_at
  before update on public.memos
  for each row
  execute function public.set_current_timestamp_updated_at();

-- 树约束：父必须是 folder；禁止环
create or replace function public.validate_memo_node_tree()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_row public.memo_nodes%rowtype;
  walk_id uuid;
  guard int := 0;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'memo_nodes: node cannot be its own parent'
      using errcode = '23514';
  end if;

  select * into parent_row
  from public.memo_nodes
  where id = new.parent_id
    and user_id = new.user_id;

  if not found then
    raise exception 'memo_nodes: parent % not found for user', new.parent_id
      using errcode = '23503';
  end if;

  if parent_row.node_type <> 'folder' then
    raise exception 'memo_nodes: parent must be a folder'
      using errcode = '23514';
  end if;

  -- 祖先链不得包含 new.id（防环；update 时尤为关键）
  walk_id := new.parent_id;
  while walk_id is not null loop
    guard := guard + 1;
    if guard > 10000 then
      raise exception 'memo_nodes: parent chain too deep or cyclic'
        using errcode = '23514';
    end if;
    if walk_id = new.id then
      raise exception 'memo_nodes: moving node under its own descendant is forbidden'
        using errcode = '23514';
    end if;
    select parent_id into walk_id
    from public.memo_nodes
    where id = walk_id
      and user_id = new.user_id;
  end loop;

  return new;
end;
$$;

drop trigger if exists memo_nodes_validate_tree on public.memo_nodes;
create trigger memo_nodes_validate_tree
  before insert or update of parent_id, user_id, id on public.memo_nodes
  for each row
  execute function public.validate_memo_node_tree();

-- memos 只能挂在 memo 类型节点上
create or replace function public.validate_memo_content_node()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  ntype text;
begin
  select node_type into ntype
  from public.memo_nodes
  where id = new.node_id
    and user_id = new.user_id;

  if ntype is null then
    raise exception 'memos: node % not found for user', new.node_id
      using errcode = '23503';
  end if;

  if ntype <> 'memo' then
    raise exception 'memos: node_id must reference a memo node, not %', ntype
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists memos_validate_node_type on public.memos;
create trigger memos_validate_node_type
  before insert or update of node_id, user_id on public.memos
  for each row
  execute function public.validate_memo_content_node();

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
alter table public.memo_nodes enable row level security;
alter table public.memos enable row level security;

drop policy if exists "memo_nodes_select_own" on public.memo_nodes;
drop policy if exists "memo_nodes_insert_own" on public.memo_nodes;
drop policy if exists "memo_nodes_update_own" on public.memo_nodes;
drop policy if exists "memo_nodes_delete_own" on public.memo_nodes;

create policy "memo_nodes_select_own"
  on public.memo_nodes for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "memo_nodes_insert_own"
  on public.memo_nodes for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "memo_nodes_update_own"
  on public.memo_nodes for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "memo_nodes_delete_own"
  on public.memo_nodes for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

drop policy if exists "memos_select_own" on public.memos;
drop policy if exists "memos_insert_own" on public.memos;
drop policy if exists "memos_update_own" on public.memos;
drop policy if exists "memos_delete_own" on public.memos;

create policy "memos_select_own"
  on public.memos for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "memos_insert_own"
  on public.memos for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "memos_update_own"
  on public.memos for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "memos_delete_own"
  on public.memos for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- 5) Data API grants
-- ---------------------------------------------------------------------------
revoke all privileges on table public.memo_nodes from anon, authenticated, service_role;
revoke all privileges on table public.memos from anon, authenticated, service_role;

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on public.memo_nodes to authenticated;
grant select, insert, update, delete on public.memos to authenticated;

grant select, insert, update, delete on public.memo_nodes to service_role;
grant select, insert, update, delete on public.memos to service_role;
