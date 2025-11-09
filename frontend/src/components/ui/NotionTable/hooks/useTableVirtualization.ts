import { useMemo, useRef, useState, useEffect } from 'react';

interface VirtualizationConfig {
  enabled: boolean;
  rowHeight: number;
  overscan?: number;
}

interface VirtualizationResult {
  startIndex: number;
  endIndex: number;
  paddingTop: number;
  paddingBottom: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useTableVirtualization(
  rowCount: number,
  config: VirtualizationConfig
): VirtualizationResult {
  const { enabled, rowHeight, overscan = 6 } = config;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => setScrollTop(el.scrollTop);
    const resizeObserver = new ResizeObserver(() => {
      setViewportHeight(el.clientHeight);
    });

    el.addEventListener('scroll', onScroll, { passive: true });
    resizeObserver.observe(el);

    setViewportHeight(el.clientHeight);
    setScrollTop(el.scrollTop);

    return () => {
      el.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
    };
  }, [enabled]);

  const virtualization = useMemo(() => {
    if (!enabled) {
      return {
        startIndex: 0,
        endIndex: rowCount - 1,
        paddingTop: 0,
        paddingBottom: 0,
      };
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
    const endIndex = Math.min(rowCount - 1, startIndex + visibleCount - 1);
    const paddingTop = startIndex * rowHeight;
    const renderedCount = Math.max(0, endIndex - startIndex + 1);
    const totalHeight = rowCount * rowHeight;
    const paddingBottom = Math.max(0, totalHeight - paddingTop - renderedCount * rowHeight);

    return { startIndex, endIndex, paddingTop, paddingBottom };
  }, [enabled, rowCount, scrollTop, viewportHeight, rowHeight, overscan]);

  return {
    ...virtualization,
    containerRef,
  };
}
