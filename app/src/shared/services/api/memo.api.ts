/**
 * [INPUT]: 依赖 shared/services/api/client 的 apiJson，依赖 shared/types/memo 的领域类型
 * [OUTPUT]: 对外提供 getMemoTree / createMemoFolder / createMemo / updateMemo /
 *           updateMemoNode / moveMemoNode
 * [POS]: shared/services/api 备忘录业务端点；禁止组件直接 fetch
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 路径对齐 api 路由：
 *   GET  /memo-tree
 *   POST /memo-folders · /memos
 *   GET|PATCH /memos/:nodeId
 *   PATCH /memo-nodes/:nodeId · /memo-nodes/:nodeId/move
 */
import type {
  ApiEnvelope,
  CreateMemoFolderInput,
  CreateMemoInput,
  MemoTreeNode,
  MoveMemoNodeInput,
  UpdateMemoContentInput,
  UpdateMemoNodeInput,
} from "../../types/memo";
import { ApiClientError, apiJson } from "./client";

/* -------------------------------------------------------------------------- */
/* 解包信封                                                                     */
/* -------------------------------------------------------------------------- */

function unwrap<T>(envelope: ApiEnvelope<T>): T {
  if (envelope.code !== "ok") {
    throw new ApiClientError(
      envelope.message || `API error ${String(envelope.code)}`,
      0,
      envelope,
    );
  }
  return envelope.data;
}

async function call<T>(
  path: string,
  options?: Parameters<typeof apiJson>[1],
): Promise<T> {
  try {
    const envelope = await apiJson<ApiEnvelope<T>>(path, options);
    return unwrap(envelope);
  } catch (err) {
    // 统一把后端信封 message 提到 Error 上
    if (err instanceof ApiClientError && err.body && typeof err.body === "object") {
      const body = err.body as { message?: unknown; code?: unknown };
      if (typeof body.message === "string" && body.message.trim()) {
        throw new ApiClientError(body.message, err.status, err.body);
      }
    }
    throw err;
  }
}

/* -------------------------------------------------------------------------- */
/* 端点                                                                         */
/* -------------------------------------------------------------------------- */

/** GET /memo-tree — 拉取完整树 */
export function getMemoTree(signal?: AbortSignal): Promise<MemoTreeNode[]> {
  return call<MemoTreeNode[]>("/memo-tree", { signal });
}

/** POST /memo-folders — 创建文件夹 */
export function createMemoFolder(
  input: CreateMemoFolderInput,
): Promise<MemoTreeNode> {
  return call<MemoTreeNode>("/memo-folders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** POST /memos — 创建备忘录 */
export function createMemo(input: CreateMemoInput): Promise<MemoTreeNode> {
  return call<MemoTreeNode>("/memos", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** GET /memos/:nodeId */
export function getMemo(nodeId: string): Promise<MemoTreeNode> {
  return call<MemoTreeNode>(`/memos/${nodeId}`);
}

/** PATCH /memos/:nodeId — 更新备忘录正文/标题 */
export function updateMemo(
  nodeId: string,
  input: UpdateMemoContentInput,
): Promise<MemoTreeNode> {
  return call<MemoTreeNode>(`/memos/${nodeId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** PATCH /memo-nodes/:nodeId — 重命名 */
export function updateMemoNode(
  nodeId: string,
  input: UpdateMemoNodeInput,
): Promise<MemoTreeNode> {
  return call<MemoTreeNode>(`/memo-nodes/${nodeId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** PATCH /memo-nodes/:nodeId/move — 移动/排序 */
export function moveMemoNode(
  nodeId: string,
  input: MoveMemoNodeInput,
): Promise<MemoTreeNode> {
  return call<MemoTreeNode>(`/memo-nodes/${nodeId}/move`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
