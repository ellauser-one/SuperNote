/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 MemoNode / MemoContent / MemoTreeNode 等领域类型
 * [POS]: model 层 memo 树领域形状；dto/repository/service 共享
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type MemoNodeType = "folder" | "memo";

/** public.memo_nodes 行 */
export type MemoNode = {
  id: string;
  user_id: string;
  parent_id: string | null;
  node_type: MemoNodeType;
  title: string;
  /** numeric(20,8) — 序列化为字符串，避免 JS 精度损失 */
  sort_order: string;
  icon: string | null;
  color: string | null;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

/** public.memos 行 */
export type MemoContent = {
  node_id: string;
  user_id: string;
  content_mdx: string;
  excerpt: string | null;
  word_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/** 组装后的树节点（sidebar 一次拉取） */
export type MemoTreeNode = MemoNode & {
  children: MemoTreeNode[];
  memo: MemoContent | null;
};

export type CreateFolderInput = {
  title: string;
  parent_id?: string | null;
};

export type CreateMemoInput = {
  title: string;
  parent_id?: string | null;
  content_mdx?: string;
  sort_order?: number | string;
};

export type UpdateMemoInput = {
  content_mdx?: string;
  title?: string;
};

export type RenameNodeInput = {
  title: string;
};

export type MoveNodeInput = {
  parent_id?: string | null;
  sort_order?: number | string;
};
