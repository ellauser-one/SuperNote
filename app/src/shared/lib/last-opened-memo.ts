/**
 * [INPUT]: 仅依赖 browser localStorage
 * [OUTPUT]: 对外提供 getLastOpenedMemo / setLastOpenedMemo（按 user id 隔离）
 * [POS]: shared/lib 最后打开备忘录持久化；NotesLayout bootstrap 与选中时写入
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const KEY_PREFIX = "supernote:last-opened-memo:";

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

/** 读取某用户最后打开的 memo node id */
export function getLastOpenedMemo(userId: string): string | null {
  if (!userId) return null;
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

/** 写入某用户最后打开的 memo node id */
export function setLastOpenedMemo(userId: string, nodeId: string): void {
  if (!userId || !nodeId) return;
  try {
    localStorage.setItem(storageKey(userId), nodeId);
  } catch {
    /* private mode / quota：静默 */
  }
}
