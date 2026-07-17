/**
 * [INPUT]: 依赖 repository/memo、service/profile、model/memo、common/app-error
 * [OUTPUT]: 对外提供 getMemoTree / createFolder / createMemo / getMemo / updateMemo /
 *           renameNode / moveNode
 * [POS]: service 层 memo 树编排与归属校验；不依赖 Hono Context
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 安全：
 * - user id 只能来自 AuthUser（JWT），禁止 body
 * - service_role 绕过 RLS → 所有查询带 userId，并二次校验归属
 * - 禁止将节点移动到自身或后代下
 */
import { HttpError } from "../common/app-error";
import type { AuthUser } from "../model/profile.model";
import type {
  CreateFolderInput,
  CreateMemoInput,
  MemoContent,
  MemoNode,
  MemoTreeNode,
  MoveNodeInput,
  RenameNodeInput,
  UpdateMemoInput,
} from "../model/memo.model";
import * as memoRepo from "../repository/memo.repository";
import { getOrCreateProfile } from "./profile.service";

const SORT_STEP = 1000;

// ---------------------------------------------------------------------------
// 公共：树拉取
// ---------------------------------------------------------------------------

/** GET /memo-tree */
export async function getMemoTree(authUser: AuthUser): Promise<MemoTreeNode[]> {
  await ensureProfile(authUser);

  const [nodes, memos] = await Promise.all([
    memoRepo.listActiveNodesByUser(authUser.id),
    memoRepo.listMemosByUser(authUser.id),
  ]);

  return assembleTree(nodes, memos, authUser.id);
}

// ---------------------------------------------------------------------------
// 创建
// ---------------------------------------------------------------------------

/** POST /memo-folders */
export async function createFolder(
  authUser: AuthUser,
  input: CreateFolderInput,
): Promise<MemoTreeNode> {
  await ensureProfile(authUser);
  const parentId = normalizeParentId(input.parent_id);
  await assertParentFolder(authUser.id, parentId);

  const sortOrder = await nextSortOrder(authUser.id, parentId);
  const node = await memoRepo.insertNode({
    user_id: authUser.id,
    parent_id: parentId,
    node_type: "folder",
    title: input.title.trim(),
    sort_order: sortOrder,
  });
  assertOwned(node, authUser.id);

  return toTreeNode(node, [], null);
}

/** POST /memos */
export async function createMemo(
  authUser: AuthUser,
  input: CreateMemoInput,
): Promise<MemoTreeNode> {
  await ensureProfile(authUser);
  const parentId = normalizeParentId(input.parent_id);
  await assertParentFolder(authUser.id, parentId);

  const sortOrder =
    input.sort_order !== undefined && input.sort_order !== null
      ? Number(input.sort_order)
      : await nextSortOrder(authUser.id, parentId);

  if (!Number.isFinite(sortOrder)) {
    throw new HttpError(400, "VALIDATION_ERROR", "sort_order 无效");
  }

  const content = input.content_mdx ?? "";
  const { excerpt, word_count } = deriveContentStats(content);

  const node = await memoRepo.insertNode({
    user_id: authUser.id,
    parent_id: parentId,
    node_type: "memo",
    title: input.title.trim(),
    sort_order: sortOrder,
  });
  assertOwned(node, authUser.id);

  const memo = await memoRepo.insertMemo({
    node_id: node.id,
    user_id: authUser.id,
    content_mdx: content,
    excerpt,
    word_count,
  });
  assertMemoOwned(memo, authUser.id);

  return toTreeNode(node, [], memo);
}

// ---------------------------------------------------------------------------
// 读 / 改 memo
// ---------------------------------------------------------------------------

/** GET /memos/:nodeId */
export async function getMemo(
  authUser: AuthUser,
  nodeId: string,
): Promise<MemoTreeNode> {
  const node = await requireMemoNode(authUser.id, nodeId);
  const memo = await memoRepo.findMemoByNodeIdForUser(authUser.id, nodeId);
  if (!memo) {
    throw new HttpError(404, "NOT_FOUND", "备忘录正文不存在");
  }
  return toTreeNode(node, [], memo);
}

/** PATCH /memos/:nodeId */
export async function updateMemo(
  authUser: AuthUser,
  nodeId: string,
  input: UpdateMemoInput,
): Promise<MemoTreeNode> {
  let node = await requireMemoNode(authUser.id, nodeId);

  if (input.title !== undefined) {
    node = await memoRepo.updateNodeForUser(authUser.id, nodeId, {
      title: input.title.trim(),
    });
    assertOwned(node, authUser.id);
  }

  let memo = await memoRepo.findMemoByNodeIdForUser(authUser.id, nodeId);
  if (!memo) {
    throw new HttpError(404, "NOT_FOUND", "备忘录正文不存在");
  }

  // content_mdx 原样落库：不 trim、不压缩空白；空字符串合法
  if (input.content_mdx !== undefined) {
    const { excerpt, word_count } = deriveContentStats(input.content_mdx);
    memo = await memoRepo.updateMemoForUser(authUser.id, nodeId, {
      content_mdx: input.content_mdx,
      excerpt,
      word_count,
    });
    assertMemoOwned(memo, authUser.id);
  }

  return toTreeNode(node, [], memo);
}

// ---------------------------------------------------------------------------
// 重命名 / 移动
// ---------------------------------------------------------------------------

/** PATCH /memo-nodes/:nodeId */
export async function renameNode(
  authUser: AuthUser,
  nodeId: string,
  input: RenameNodeInput,
): Promise<MemoTreeNode> {
  const existing = await requireAnyNode(authUser.id, nodeId);
  const node = await memoRepo.updateNodeForUser(authUser.id, nodeId, {
    title: input.title.trim(),
  });
  assertOwned(node, authUser.id);

  const memo =
    node.node_type === "memo"
      ? await memoRepo.findMemoByNodeIdForUser(authUser.id, nodeId)
      : null;

  // 重命名不带 children 全量子树；返回叶子形态，前端用 replace preserveChildren
  void existing;
  return toTreeNode(node, [], memo);
}

/** PATCH /memo-nodes/:nodeId/move */
export async function moveNode(
  authUser: AuthUser,
  nodeId: string,
  input: MoveNodeInput,
): Promise<MemoTreeNode> {
  const node = await requireAnyNode(authUser.id, nodeId);
  const newParentId =
    input.parent_id === undefined ? node.parent_id : normalizeParentId(input.parent_id);

  if (newParentId === nodeId) {
    throw new HttpError(400, "VALIDATION_ERROR", "不能将节点移动到自身下");
  }

  await assertParentFolder(authUser.id, newParentId);
  await assertNotMovingIntoDescendant(authUser.id, nodeId, newParentId);

  const sortOrder =
    input.sort_order !== undefined && input.sort_order !== null
      ? Number(input.sort_order)
      : await nextSortOrder(authUser.id, newParentId);

  if (!Number.isFinite(sortOrder)) {
    throw new HttpError(400, "VALIDATION_ERROR", "sort_order 无效");
  }

  const updated = await memoRepo.updateNodeForUser(authUser.id, nodeId, {
    parent_id: newParentId,
    sort_order: sortOrder,
  });
  assertOwned(updated, authUser.id);

  const memo =
    updated.node_type === "memo"
      ? await memoRepo.findMemoByNodeIdForUser(authUser.id, nodeId)
      : null;

  return toTreeNode(updated, [], memo);
}

// ---------------------------------------------------------------------------
// 内部：归属 / 父校验 / 环 / 组装
// ---------------------------------------------------------------------------

async function ensureProfile(authUser: AuthUser): Promise<void> {
  // memo_nodes.user_id → profiles.id；首次写树前 ensure profile
  await getOrCreateProfile(authUser);
}

function normalizeParentId(
  parentId: string | null | undefined,
): string | null {
  if (parentId === undefined || parentId === null || parentId === "") {
    return null;
  }
  return parentId;
}

async function assertParentFolder(
  userId: string,
  parentId: string | null,
): Promise<void> {
  if (parentId == null) return;

  const parent = await memoRepo.findNodeByIdForUser(userId, parentId);
  if (!parent || parent.deleted_at) {
    throw new HttpError(404, "NOT_FOUND", "父文件夹不存在");
  }
  if (parent.node_type !== "folder") {
    throw new HttpError(400, "VALIDATION_ERROR", "父节点必须是文件夹");
  }
}

async function assertNotMovingIntoDescendant(
  userId: string,
  nodeId: string,
  newParentId: string | null,
): Promise<void> {
  if (newParentId == null) return;

  // 沿新父祖先链上行；若遇到 nodeId 则成环
  let walk: string | null = newParentId;
  const seen = new Set<string>();
  while (walk) {
    if (walk === nodeId) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "不能将节点移动到自己的后代内部",
      );
    }
    if (seen.has(walk)) {
      throw new HttpError(400, "VALIDATION_ERROR", "检测到非法父链");
    }
    seen.add(walk);
    const row = await memoRepo.findNodeByIdForUser(userId, walk);
    if (!row) break;
    walk = row.parent_id;
  }
}

async function requireAnyNode(
  userId: string,
  nodeId: string,
): Promise<MemoNode> {
  const node = await memoRepo.findNodeByIdForUser(userId, nodeId);
  if (!node || node.deleted_at) {
    throw new HttpError(404, "NOT_FOUND", "节点不存在");
  }
  assertOwned(node, userId);
  return node;
}

async function requireMemoNode(
  userId: string,
  nodeId: string,
): Promise<MemoNode> {
  const node = await requireAnyNode(userId, nodeId);
  if (node.node_type !== "memo") {
    throw new HttpError(400, "VALIDATION_ERROR", "目标节点不是备忘录");
  }
  return node;
}

async function nextSortOrder(
  userId: string,
  parentId: string | null,
): Promise<number> {
  const max = await memoRepo.findMaxSortOrder(userId, parentId);
  if (max == null) return SORT_STEP;
  return max + SORT_STEP;
}

function assertOwned(node: MemoNode, userId: string): void {
  if (node.user_id !== userId) {
    throw new HttpError(403, "FORBIDDEN", "无权访问该节点");
  }
}

function assertMemoOwned(memo: MemoContent, userId: string): void {
  if (memo.user_id !== userId) {
    throw new HttpError(403, "FORBIDDEN", "无权访问该备忘录");
  }
}

function toTreeNode(
  node: MemoNode,
  children: MemoTreeNode[],
  memo: MemoContent | null,
): MemoTreeNode {
  return { ...node, children, memo };
}

/** 内存组装森林：根 = parent_id null */
export function assembleTree(
  nodes: MemoNode[],
  memos: MemoContent[],
  userId: string,
): MemoTreeNode[] {
  const memoByNode = new Map<string, MemoContent>();
  for (const m of memos) {
    if (m.user_id === userId) memoByNode.set(m.node_id, m);
  }

  const byId = new Map<string, MemoTreeNode>();
  for (const n of nodes) {
    if (n.user_id !== userId) continue;
    byId.set(
      n.id,
      toTreeNode(
        n,
        [],
        n.node_type === "memo" ? (memoByNode.get(n.id) ?? null) : null,
      ),
    );
  }

  const roots: MemoTreeNode[] = [];
  for (const treeNode of byId.values()) {
    if (treeNode.parent_id && byId.has(treeNode.parent_id)) {
      byId.get(treeNode.parent_id)!.children.push(treeNode);
    } else if (treeNode.parent_id == null) {
      roots.push(treeNode);
    } else {
      // 父缺失或已删：退化为根，避免丢数据
      roots.push(treeNode);
    }
  }

  const sortRec = (list: MemoTreeNode[]) => {
    list.sort((a, b) => {
      const d = Number(a.sort_order) - Number(b.sort_order);
      return d !== 0 ? d : a.id.localeCompare(b.id);
    });
    for (const c of list) sortRec(c.children);
  };
  sortRec(roots);
  return roots;
}

/** 正文摘要与字数 */
export function deriveContentStats(contentMdx: string): {
  excerpt: string | null;
  word_count: number;
} {
  const plain = contentMdx
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_~\[\](){}|\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const excerpt = plain ? plain.slice(0, 200) : null;
  if (!plain) {
    return { excerpt: null, word_count: 0 };
  }

  const cjk = plain.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g)?.length ?? 0;
  const latin = plain
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return { excerpt, word_count: cjk + latin };
}
