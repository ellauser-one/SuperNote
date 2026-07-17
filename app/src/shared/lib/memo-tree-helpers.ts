/**
 * [INPUT]: 仅依赖 shared/types/memo 的 MemoTreeNode / DropTarget
 * [OUTPUT]: 对外提供 findNode / findSiblings / insertNode / removeNode / replaceNode /
 *           updateNode / moveNodeInTree / isDescendant / sortNodes / computeSortOrder /
 *           canDropTarget / resolveDropPlacement
 * [POS]: shared/lib 树操作纯函数集；store 与 MemoTree 拖拽均消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type {
  DropTarget,
  MemoTreeNode,
  MoveMemoNodeInput,
} from "../types/memo";

/* -------------------------------------------------------------------------- */
/* 排序                                                                         */
/* -------------------------------------------------------------------------- */

/** 按 Number(sort_order) 升序，平手按 id 字典序 */
export function sortNodes(nodes: MemoTreeNode[]): MemoTreeNode[] {
  return [...nodes].sort((a, b) => {
    const diff = Number(a.sort_order) - Number(b.sort_order);
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
}

/* -------------------------------------------------------------------------- */
/* 查找                                                                         */
/* -------------------------------------------------------------------------- */

/** 递归查找节点（含子树） */
export function findNode(
  nodes: MemoTreeNode[],
  nodeId: string,
): MemoTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const found = findNode(node.children, nodeId);
    if (found) return found;
  }
  return null;
}

/** 获取某个 parent 下的直接子节点列表（已排序） */
export function findSiblings(
  nodes: MemoTreeNode[],
  parentId: string | null,
): MemoTreeNode[] {
  if (parentId === null) return sortNodes(nodes);
  const parent = findNode(nodes, parentId);
  return parent ? sortNodes(parent.children) : [];
}

/* -------------------------------------------------------------------------- */
/* 插入                                                                         */
/* -------------------------------------------------------------------------- */

/** 在指定 parentId 下插入 node，可选 sort_order 定位 */
export function insertNode(
  nodes: MemoTreeNode[],
  node: MemoTreeNode,
  parentId: string | null,
  sortOrder?: string,
): MemoTreeNode[] {
  const toInsert = sortOrder != null ? { ...node, sort_order: sortOrder, parent_id: parentId } : { ...node, parent_id: parentId };

  if (parentId === null) {
    return sortNodes([...nodes, toInsert]);
  }

  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: sortNodes([...n.children, toInsert]) };
    }
    if (n.children.length > 0) {
      return { ...n, children: insertNode(n.children, toInsert, parentId, sortOrder) };
    }
    return n;
  });
}

/* -------------------------------------------------------------------------- */
/* 移除                                                                         */
/* -------------------------------------------------------------------------- */

/** 从树中移除指定节点，返回新树 */
export function removeNode(
  nodes: MemoTreeNode[],
  nodeId: string,
): MemoTreeNode[] {
  return nodes
    .filter((n) => n.id !== nodeId)
    .map((n) => ({
      ...n,
      children: removeNode(n.children, nodeId),
    }));
}

/* -------------------------------------------------------------------------- */
/* 替换                                                                         */
/* -------------------------------------------------------------------------- */

/** 用 nextNode 替换 targetId 位置的节点；preserveChildren 为 true 时保留原 children */
export function replaceNode(
  nodes: MemoTreeNode[],
  targetId: string,
  nextNode: MemoTreeNode,
  preserveChildren = false,
): MemoTreeNode[] {
  return nodes.map((n) => {
    if (n.id === targetId) {
      return preserveChildren
        ? { ...nextNode, children: n.children }
        : nextNode;
    }
    return {
      ...n,
      children: replaceNode(n.children, targetId, nextNode, preserveChildren),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* 更新                                                                         */
/* -------------------------------------------------------------------------- */

/** 用 updater 函数局部更新指定节点 */
export function updateNode(
  nodes: MemoTreeNode[],
  targetId: string,
  updater: (node: MemoTreeNode) => MemoTreeNode,
): MemoTreeNode[] {
  return nodes.map((n) => {
    if (n.id === targetId) return updater(n);
    return { ...n, children: updateNode(n.children, targetId, updater) };
  });
}

/* -------------------------------------------------------------------------- */
/* 移动                                                                         */
/* -------------------------------------------------------------------------- */

/** 把节点从原位置移除，再插入目标 parent + sort_order */
export function moveNodeInTree(
  nodes: MemoTreeNode[],
  nodeId: string,
  parentId: string | null,
  sortOrder?: string,
): MemoTreeNode[] {
  const node = findNode(nodes, nodeId);
  if (!node) return nodes;

  const withoutNode = removeNode(nodes, nodeId);
  return insertNode(withoutNode, node, parentId, sortOrder);
}

/* -------------------------------------------------------------------------- */
/* 祖先检查                                                                     */
/* -------------------------------------------------------------------------- */

/** candidateId 是否为 ancestorId 的后代（或自身） */
export function isDescendant(
  nodes: MemoTreeNode[],
  ancestorId: string,
  candidateId: string,
): boolean {
  if (ancestorId === candidateId) return true;
  const ancestor = findNode(nodes, ancestorId);
  if (!ancestor) return false;
  return findNode(ancestor.children, candidateId) !== null;
}

/* -------------------------------------------------------------------------- */
/* sort_order 计算                                                              */
/* -------------------------------------------------------------------------- */

/** 步长常量 */
const SORT_STEP = 1000;

/**
 * 计算目标 sort_order：
 * - 追加到末尾：max + SORT_STEP
 * - 插到最前：first / 2 或 first - SORT_STEP
 * - 插到两节点之间：(prev + next) / 2
 */
export function computeSortOrder(
  siblings: MemoTreeNode[],
  position: "append" | "prepend" | { afterIndex: number },
): string {
  const sorted = sortNodes(siblings);

  if (sorted.length === 0) {
    return String(SORT_STEP);
  }

  if (position === "append") {
    const maxOrder = Number(sorted[sorted.length - 1]!.sort_order);
    return String(maxOrder + SORT_STEP);
  }

  if (position === "prepend") {
    const firstOrder = Number(sorted[0]!.sort_order);
    const candidate = firstOrder / 2;
    return String(candidate < 1 ? firstOrder - SORT_STEP : candidate);
  }

  const idx = position.afterIndex;
  if (idx < 0) return computeSortOrder(sorted, "prepend");
  if (idx >= sorted.length - 1) return computeSortOrder(sorted, "append");

  const prev = Number(sorted[idx]!.sort_order);
  const next = Number(sorted[idx + 1]!.sort_order);
  return String((prev + next) / 2);
}

/* -------------------------------------------------------------------------- */
/* 拖拽落点 → move payload                                                      */
/* -------------------------------------------------------------------------- */

/**
 * 是否允许将 dragId 放到 target。
 * 禁止：拖进自己、拖进自己的任意后代、inside 非 folder。
 */
export function canDropTarget(
  nodes: MemoTreeNode[],
  dragId: string,
  target: DropTarget,
): boolean {
  if (!dragId) return false;

  if (target.position === "inside") {
    if (!target.nodeId) return false;
    const folder = findNode(nodes, target.nodeId);
    if (!folder || folder.node_type !== "folder") return false;
    // 自己或后代
    return !isDescendant(nodes, dragId, target.nodeId);
  }

  // 层级边界：parentId 不能是 drag 自身或其后代
  if (target.nodeId == null) {
    if (target.parentId == null) return true;
    if (target.parentId === dragId) return false;
    return !isDescendant(nodes, dragId, target.parentId);
  }

  // before / after 某节点
  if (target.nodeId === dragId) return false;
  const targetNode = findNode(nodes, target.nodeId);
  if (!targetNode) return false;

  // 新 parent 不能是 drag 自身或其后代
  const newParent = targetNode.parent_id;
  if (newParent === dragId) return false;
  if (newParent && isDescendant(nodes, dragId, newParent)) return false;

  return true;
}

/**
 * 将 DropTarget 解析为后端 move 所需的 parent_id + sort_order。
 * 调用方应先 canDropTarget。
 */
export function resolveDropPlacement(
  nodes: MemoTreeNode[],
  dragId: string,
  target: DropTarget,
): MoveMemoNodeInput {
  // 放入 folder 本体（含未展开）：作为该 folder 第一个子节点
  if (target.position === "inside" && target.nodeId) {
    const siblings = findSiblings(nodes, target.nodeId).filter(
      (n) => n.id !== dragId,
    );
    return {
      parent_id: target.nodeId,
      sort_order: computeSortOrder(siblings, "prepend"),
    };
  }

  // 层级边界（开头 / 末尾）
  if (target.nodeId == null) {
    const siblings = findSiblings(nodes, target.parentId).filter(
      (n) => n.id !== dragId,
    );
    if (target.position === "before") {
      return {
        parent_id: target.parentId,
        sort_order: computeSortOrder(siblings, "prepend"),
      };
    }
    return {
      parent_id: target.parentId,
      sort_order: computeSortOrder(siblings, "append"),
    };
  }

  // before / after 指定节点（folder 的 after = 整个子树之后的同级位置）
  const targetNode = findNode(nodes, target.nodeId);
  if (!targetNode) {
    return { parent_id: null, sort_order: 1000 };
  }

  const siblings = findSiblings(nodes, targetNode.parent_id).filter(
    (n) => n.id !== dragId,
  );
  const idx = siblings.findIndex((n) => n.id === target.nodeId);

  if (target.position === "before") {
    return {
      parent_id: targetNode.parent_id,
      sort_order: computeSortOrder(
        siblings,
        idx <= 0 ? "prepend" : { afterIndex: idx - 1 },
      ),
    };
  }

  // after
  return {
    parent_id: targetNode.parent_id,
    sort_order: computeSortOrder(
      siblings,
      idx < 0 ? "append" : { afterIndex: idx },
    ),
  };
}
