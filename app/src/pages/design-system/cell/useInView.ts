/**
 * [INPUT]: 依赖 React useEffect/useRef/useState 与 IntersectionObserver
 * [OUTPUT]: 对外提供 useInView，进入视口后 once 触发
 * [POS]: design-system 性能门闩；未入屏的 gallery cell 不挂载真实组件树
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from "react";

type UseInViewOptions = {
  rootMargin?: string;
  once?: boolean;
};

export function useInView<T extends Element>({
  rootMargin = "120px 0px",
  once = true,
}: UseInViewOptions = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node || (once && inView)) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setInView(true);

        if (once) {
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, once, rootMargin]);

  return { ref, inView } as const;
}
