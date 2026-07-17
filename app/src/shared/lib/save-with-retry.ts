/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 saveWithRetry
 * [POS]: shared/lib 失败退避重试；备忘录自动保存消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const DEFAULT_RETRY_DELAYS_MS = [400, 800, 1600] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * 执行 async 操作；失败后按退避间隔重试。
 * retryCount = 3 → 共 1 次首试 + 3 次重试（间隔 400/800/1600ms）。
 */
export async function saveWithRetry<T>(
  operation: () => Promise<T>,
  options?: {
    retryCount?: number;
    delaysMs?: readonly number[];
  },
): Promise<T> {
  const retryCount = options?.retryCount ?? 3;
  const delays = options?.delaysMs ?? DEFAULT_RETRY_DELAYS_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= retryCount) break;
      const delay = delays[attempt] ?? delays[delays.length - 1] ?? 1600;
      await sleep(delay);
    }
  }

  throw lastError;
}
