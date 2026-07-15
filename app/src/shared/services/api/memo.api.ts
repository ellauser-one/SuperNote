/**
 * [INPUT]: 依赖 shared/services/api/client 的 apiJson，依赖 shared/types/memo 的领域类型
 * [OUTPUT]: 对外提供 getMemoTree / createMemoFolder / createMemo / updateMemo / updateMemoNode / moveMemoNode
 * [POS]: shared/services/api 备忘录业务端点；禁止组件直接 fetch
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
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
import { apiJson } from "./client";

/* -------------------------------------------------------------------------- */
/* 解包信封                                                                     */
/* -------------------------------------------------------------------------- */

function unwrap<T>(envelope: ApiEnvelope<T>): T {
  if (envelope.code !== 0) {
    throw new Error(envelope.message || `API error ${envelope.code}`);
  }
  return envelope.data;
}

/* -------------------------------------------------------------------------- */
/* 端点                                                                         */
/* -------------------------------------------------------------------------- */

/** GET /v1/memo/tree — 拉取完整树 */
export function getMemoTree(signal?: AbortSignal): Promise<MemoTreeNode[]> {
  return apiJson<ApiEnvelope<MemoTreeNode[]>>("/v1/memo/tree", { signal }).then(
    unwrap,
  );
}

/** POST /v1/memo/folder — 创建文件夹 */
export function createMemoFolder(
  input: CreateMemoFolderInput,
): Promise<MemoTreeNode> {
  return apiJson<ApiEnvelope<MemoTreeNode>>("/v1/memo/folder", {
    method: "POST",
    body: JSON.stringify(input),
  }).then(unwrap);
}

/** POST /v1/memo — 创建备忘录 */
export function createMemo(input: CreateMemoInput): Promise<MemoTreeNode> {
  return apiJson<ApiEnvelope<MemoTreeNode>>("/v1/memo", {
    method: "POST",
    body: JSON.stringify(input),
  }).then(unwrap);
}

/** PATCH /v1/memo/:nodeId — 更新备忘录正文 */
export function updateMemo(
  nodeId: string,
  input: UpdateMemoContentInput,
): Promise<MemoTreeNode> {
  return apiJson<ApiEnvelope<MemoTreeNode>>(`/v1/memo/${nodeId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then(unwrap);
}

/** PATCH /v1/memo/nodes/:nodeId — 更新节点元信息（标题等） */
export function updateMemoNode(
  nodeId: string,
  input: UpdateMemoNodeInput,
): Promise<MemoTreeNode> {
  return apiJson<ApiEnvelope<MemoTreeNode>>(`/v1/memo/nodes/${nodeId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }).then(unwrap);
}

/** PATCH /v1/memo/nodes/:nodeId/move — 移动/排序节点 */
export function moveMemoNode(
  nodeId: string,
  input: MoveMemoNodeInput,
): Promise<MemoTreeNode> {
  return apiJson<ApiEnvelope<MemoTreeNode>>(
    `/v1/memo/nodes/${nodeId}/move`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  ).then(unwrap);
}
