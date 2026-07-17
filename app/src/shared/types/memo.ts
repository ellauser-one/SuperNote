/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 MemoNodeType / MemoContent / MemoTreeNode 与 store 输入类型
 * [POS]: shared/types 备忘录领域模型唯一真相源；store / api / widgets 均消费此类型
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/* -------------------------------------------------------------------------- */
/* 节点类型                                                                     */
/* -------------------------------------------------------------------------- */

export type MemoNodeType = "folder" | "memo";

/* -------------------------------------------------------------------------- */
/* 备忘录正文                                                                   */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* 树节点                                                                       */
/* -------------------------------------------------------------------------- */

export type MemoTreeNode = {
  id: string;
  user_id: string;
  parent_id: string | null;
  node_type: MemoNodeType;
  title: string;
  sort_order: string;
  icon: string | null;
  color: string | null;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  children: MemoTreeNode[];
  memo: MemoContent | null;
};

/* -------------------------------------------------------------------------- */
/* API 输入                                                                     */
/* -------------------------------------------------------------------------- */

export type CreateMemoFolderInput = {
  parent_id: string | null;
  title: string;
};

export type CreateMemoInput = {
  parent_id: string | null;
  title: string;
  content_mdx?: string;
  sort_order?: string | number;
};

export type MoveMemoNodeInput = {
  parent_id: string | null;
  sort_order: string | number;
};

export type UpdateMemoNodeInput = {
  title?: string;
};

export type UpdateMemoContentInput = {
  content_mdx?: string;
  title?: string;
};

/* -------------------------------------------------------------------------- */
/* 拖拽落点                                                                     */
/* -------------------------------------------------------------------------- */

/** before / inside / after 语义见 MemoTree 与 memo-tree-helpers.resolveDropPlacement */
export type DropPosition = "before" | "inside" | "after";

/**
 * - nodeId != null + before：排在该节点前（同父）
 * - nodeId != null + after：排在该节点后（同父；folder 指整个子树之后）
 * - nodeId != null + inside：放入该 folder
 * - nodeId = null + parentId + before：该层最前
 * - nodeId = null + parentId + after：该层最后
 */
export type DropTarget = {
  nodeId: string | null;
  parentId: string | null;
  position: DropPosition;
};

/* -------------------------------------------------------------------------- */
/* API 信封（与后端 ApiResponse<T> 同构：code = "ok" | ERROR）                  */
/* -------------------------------------------------------------------------- */

export type ApiEnvelope<T> = {
  code: "ok" | string;
  message: string;
  data: T;
};
