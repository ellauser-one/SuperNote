/**
 * [INPUT]: 依赖 React useCallback/useRef
 * [OUTPUT]: 对外提供 useFlipAnimation hook
 * [POS]: widgets/MemoTree 动画层；拖拽后平滑过渡，不干预数据流
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useCallback, useRef } from "react";

type RectMap = Map<string, DOMRect>;

const FLIP_DURATION = 200;
const FLIP_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/**
 * FLIP 动画 hook：
 * 1. capture() 在 DOM 变更前记录所有可见节点位置
 * 2. animate() 在 DOM 更新后计算位移并执行 Web Animations API
 */
export function useFlipAnimation() {
  const previousRects = useRef<RectMap>(new Map());

  /** 记录当前所有可见节点的 getBoundingClientRect */
  const capture = useCallback((container: HTMLElement | null) => {
    if (!container) return;
    const map: RectMap = new Map();
    const elements = container.querySelectorAll<HTMLElement>("[data-flip-id]");
    elements.forEach((el) => {
      const id = el.dataset.flipId;
      if (id) map.set(id, el.getBoundingClientRect());
    });
    previousRects.current = map;
  }, []);

  /** DOM 变更后执行 FLIP 动画 */
  const animate = useCallback((container: HTMLElement | null) => {
    if (!container) return;
    const prev = previousRects.current;
    if (prev.size === 0) return;

    const elements = container.querySelectorAll<HTMLElement>("[data-flip-id]");
    elements.forEach((el) => {
      const id = el.dataset.flipId;
      if (!id) return;
      const first = prev.get(id);
      if (!first) return;

      const last = el.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;

      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: FLIP_DURATION, easing: FLIP_EASING },
      );
    });
  }, []);

  return { capture, animate };
}
