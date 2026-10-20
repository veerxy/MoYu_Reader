import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ReaderSettings } from '../types';
import { TxtParagraph } from '../utils/outline';
import { calculateTxtLineScrollStep, getTxtScrollbarClassName } from '../utils/readerLayout';
import {
  createTxtChunks,
  estimateTxtChunkHeight,
  getTxtChunkIndexForParagraph,
  TXT_VIRTUAL_OBSERVER_MARGIN,
} from '../utils/txtVirtualization';
import {
  calculateTxtAnchoredScrollTop,
  calculateTxtBottomAnchoredScrollTop,
  calculateTxtBottomScrollAnchor,
  calculateTxtScrollAnchor,
  calculateTxtScrollProgress,
  createTxtProgressTracker,
  TxtProgressTracker,
  TxtScrollAnchor,
} from '../utils/readingProgress';

interface TxtReaderProps {
  paragraphs: TxtParagraph[];
  chapterTitleIndexes: ReadonlySet<number>;
  settings: ReaderSettings;
  initialScrollPercent?: number;
  initialScrollTop?: number;
  isBorderVisible?: boolean;
  outlineTargetParagraphIndex?: number;
  onProgressChange: (progressPercent: number, scrollTop: number) => void;
}

/**
 * 按视口边缘查找正文段落。
 *
 * 使用 elementsFromPoint 而不是遍历全部段落，避免大 TXT 在滚动时
 * 反复做 O(n) 查找；多个采样点用于跳过段落间距，保证边缘仍在间隙时也能取到段落。
 */
function findVisibleParagraphAtEdge(
  container: HTMLElement,
  edge: 'top' | 'bottom',
): HTMLElement | null {
  const rect = container.getBoundingClientRect();
  const x = Math.min(rect.right - 8, Math.max(rect.left + 8, rect.left + rect.width / 2));

  for (const offsetY of [1, 8, 16, 24]) {
    const y = edge === 'top' ? rect.top + offsetY : rect.bottom - offsetY;
    const elements = document.elementsFromPoint(x, y);
    const paragraph = elements
      .map((element) => (element instanceof HTMLElement ? element.closest<HTMLElement>('[data-toc-index]') : null))
      .find((item) => item !== null);
    if (paragraph) return paragraph;
  }

  return null;
}

function findTopVisibleParagraph(container: HTMLElement): HTMLElement | null {
  return findVisibleParagraphAtEdge(container, 'top');
}

function findBottomVisibleParagraph(container: HTMLElement): HTMLElement | null {
  return findVisibleParagraphAtEdge(container, 'bottom');
}

export const TxtReader: React.FC<TxtReaderProps> = ({
  paragraphs,
  chapterTitleIndexes,
  settings,
  initialScrollPercent = 0,
  initialScrollTop,
  isBorderVisible = false,
  outlineTargetParagraphIndex,
  onProgressChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasScrolledInitial, setHasScrolledInitial] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportAdjustTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onProgressChangeRef = useRef(onProgressChange);
  const progressTrackerRef = useRef<TxtProgressTracker | null>(null);
  const scrollAnchorRef = useRef<TxtScrollAnchor | null>(null);
  const bottomScrollAnchorRef = useRef<TxtScrollAnchor | null>(null);
  // 工具栏显隐前记录上一次状态，用于识别“只改变视口高度”的布局切换。
  const lastBorderVisibleRef = useRef(isBorderVisible);
  // 工具栏切换产生的 ResizeObserver 回调已经由布局阶段处理，不能再按顶部锚点恢复。
  const suppressNextViewportRestoreRef = useRef(false);
  // 窗口缩放期间浏览器可能自动调整 scrollTop；此时不能把漂移位置写回锚点。
  const isViewportAdjustingRef = useRef(false);
  // TXT 使用分块虚拟化：先渲染占位块，靠近视口时才渲染真实段落。
  const txtChunks = useMemo(() => createTxtChunks(paragraphs), [paragraphs]);
  const [renderedChunkIndexes, setRenderedChunkIndexes] = useState<ReadonlySet<number>>(
    () => new Set<number>(),
  );
  const chunkElementsRef = useRef(new Map<number, HTMLDivElement>());
  const [contentWidth, setContentWidth] = useState(440);

  if (!progressTrackerRef.current) {
    progressTrackerRef.current = createTxtProgressTracker();
  }

  useEffect(() => {
    onProgressChangeRef.current = onProgressChange;
  }, [onProgressChange]);

  // 立即提交进度前先记录到 tracker，保证退出阅读页时能补交最后一次位置。
  const reportProgress = useCallback((progress: number, scrollTop: number) => {
    progressTrackerRef.current?.update(progress, scrollTop);
    onProgressChangeRef.current(progress, scrollTop);
  }, []);

  // max-w-3xl 限制正文最大 768px；小窗口下按 sm 断点左右 padding 估算可用宽度。
  const updateContentWidth = useCallback((element: HTMLElement) => {
    const nextWidth = Math.min(768, Math.max(240, element.clientWidth - 80));
    setContentWidth((previous) => (Math.abs(previous - nextWidth) >= 1 ? nextWidth : previous));
  }, []);

  const chunkHeights = useMemo(
    () => txtChunks.map((chunk) => estimateTxtChunkHeight(chunk, chapterTitleIndexes, settings, contentWidth)),
    [txtChunks, chapterTitleIndexes, settings.fontSize, settings.lineHeight, contentWidth],
  );

  const ensureChunkIndexes = useCallback((indexes: number[]) => {
    setRenderedChunkIndexes((previous) => {
      let changed = false;
      const next = new Set(previous);

      for (const index of indexes) {
        if (index < 0 || index >= txtChunks.length || next.has(index)) continue;
        next.add(index);
        changed = true;
      }

      return changed ? next : previous;
    });
  }, [txtChunks.length]);

  // 首次进入时优先渲染恢复位置附近的分块，避免先看到空白再等 Observer 补内容。
  useEffect(() => {
    if (txtChunks.length === 0) return;

    let targetChunkIndex = 0;
    if (initialScrollTop !== undefined && initialScrollTop > 0) {
      const totalHeight = chunkHeights.reduce((sum, height) => sum + height, 0);
      const ratio = Math.min(1, initialScrollTop / Math.max(1, totalHeight));
      targetChunkIndex = Math.floor((txtChunks.length - 1) * ratio);
    } else if (initialScrollPercent > 0) {
      targetChunkIndex = Math.floor(((txtChunks.length - 1) * initialScrollPercent) / 100);
    }

    ensureChunkIndexes([
      Math.max(0, targetChunkIndex - 1),
      targetChunkIndex,
      Math.min(txtChunks.length - 1, targetChunkIndex + 1),
    ]);
  }, [txtChunks.length, chunkHeights, initialScrollPercent, initialScrollTop, ensureChunkIndexes]);

  // 用一个 Observer 管理所有分块，靠近视口的块才提交真实 DOM。
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const indexes = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => Number((entry.target as HTMLElement).dataset.virtualChunkIndex))
          .filter((index) => Number.isInteger(index));
        ensureChunkIndexes(indexes);
      },
      { root: container, rootMargin: `${TXT_VIRTUAL_OBSERVER_MARGIN}px 0px` },
    );

    for (const element of chunkElementsRef.current.values()) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [txtChunks, ensureChunkIndexes]);

  const setChunkElementRef = useCallback((index: number) => {
    return (element: HTMLDivElement | null) => {
      if (element) chunkElementsRef.current.set(index, element);
      else chunkElementsRef.current.delete(index);
    };
  }, []);

  const updateScrollAnchor = useCallback((container: HTMLElement) => {
    const paragraph = findTopVisibleParagraph(container);
    const paragraphIndex = Number(paragraph?.dataset.tocIndex);
    if (!paragraph || !Number.isInteger(paragraphIndex)) return;

    const containerTop = container.getBoundingClientRect().top;
    const paragraphRect = paragraph.getBoundingClientRect();
    scrollAnchorRef.current = calculateTxtScrollAnchor(
      paragraphIndex,
      containerTop,
      paragraphRect.top,
      paragraphRect.height,
    );
  }, []);

  const updateBottomScrollAnchor = useCallback((container: HTMLElement) => {
    const paragraph = findBottomVisibleParagraph(container);
    const paragraphIndex = Number(paragraph?.dataset.tocIndex);
    if (!paragraph || !Number.isInteger(paragraphIndex)) return;

    const containerRect = container.getBoundingClientRect();
    const paragraphRect = paragraph.getBoundingClientRect();
    bottomScrollAnchorRef.current = calculateTxtBottomScrollAnchor(
      paragraphIndex,
      containerRect.bottom,
      paragraphRect.top,
      paragraphRect.height,
    );
  }, []);

  const restoreScrollAnchor = useCallback(
    (container: HTMLElement, preferBottomAnchor = false) => {
      const bottomAnchor = bottomScrollAnchorRef.current;
      const anchor = preferBottomAnchor && bottomAnchor ? bottomAnchor : scrollAnchorRef.current;
      if (!anchor) return;

      const target = container.querySelector<HTMLElement>(
        `[data-toc-index="${anchor.paragraphIndex}"]`,
      );
      if (!target) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextScrollTop = preferBottomAnchor && bottomAnchor
        ? calculateTxtBottomAnchoredScrollTop(anchor, {
            containerScrollTop: container.scrollTop,
            containerTop: containerRect.top,
            containerClientHeight: container.clientHeight,
            paragraphTop: targetRect.top,
            paragraphHeight: targetRect.height,
          })
        : calculateTxtAnchoredScrollTop(anchor, {
            containerTop: containerRect.top,
            containerScrollTop: container.scrollTop,
            paragraphTop: targetRect.top,
            paragraphHeight: targetRect.height,
          });

      // 浏览器缩放后的像素 scrollTop 可能对应到别的段落；这里按语义段落重新对齐。
      if (Math.abs(container.scrollTop - nextScrollTop) >= 1) {
        container.scrollTop = nextScrollTop;
      }

      updateScrollAnchor(container);
      updateBottomScrollAnchor(container);
      const latest = calculateTxtScrollProgress(
        container.scrollTop,
        container.scrollHeight,
        container.clientHeight,
      );
      reportProgress(latest.progress, latest.scrollTop);
    },
    [reportProgress, updateBottomScrollAnchor, updateScrollAnchor],
  );

  // 工具栏显隐只改变视口高度；用户关注底部最后一行，所以必须在绘制前
  // 用底部锚点修正滚动位置，避免先跳到下一行再被 ResizeObserver 拉回来。
  useLayoutEffect(() => {
    if (lastBorderVisibleRef.current === isBorderVisible) return;
    lastBorderVisibleRef.current = isBorderVisible;
    suppressNextViewportRestoreRef.current = true;

    const container = containerRef.current;
    if (container && bottomScrollAnchorRef.current) {
      restoreScrollAnchor(container, true);
    }
  }, [isBorderVisible, restoreScrollAnchor]);

  // 退出阅读页时取消未触发的节流任务，并同步提交最后一次阅读位置。
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      if (viewportAdjustTimeoutRef.current) {
        clearTimeout(viewportAdjustTimeoutRef.current);
        viewportAdjustTimeoutRef.current = null;
      }
      progressTrackerRef.current?.flush((progress, scrollTop) => {
        onProgressChangeRef.current(progress, scrollTop);
      });
    };
  }, []);

  // 内容挂载后恢复上次阅读位置，并立即建立本次会话的语义锚点。
  useEffect(() => {
    const el = containerRef.current;
    if (!el || hasScrolledInitial) return;

    const timer = setTimeout(() => {
      if (initialScrollTop !== undefined && initialScrollTop > 0) {
        el.scrollTop = initialScrollTop;
      } else if (initialScrollPercent > 0 && el.scrollHeight > el.clientHeight) {
        el.scrollTop = ((el.scrollHeight - el.clientHeight) * initialScrollPercent) / 100;
      }
      setHasScrolledInitial(true);
      updateScrollAnchor(el);
      updateBottomScrollAnchor(el);
    }, 80);

    return () => clearTimeout(timer);
  }, [initialScrollPercent, initialScrollTop, hasScrolledInitial, updateScrollAnchor]);

  // 窗口尺寸变化后按“段落 + 段内偏移”恢复位置，避免换行变化导致阅读点漂移。
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const scheduleRestore = () => {
      updateContentWidth(container);
      // 工具栏显隐已在 useLayoutEffect 中按底部锚点处理；这里必须跳过，
      // 否则 80ms 后又按顶部锚点恢复，用户会看到底部行来回跳动。
      if (suppressNextViewportRestoreRef.current) {
        suppressNextViewportRestoreRef.current = false;
        return;
      }

      isViewportAdjustingRef.current = true;
      if (viewportAdjustTimeoutRef.current) {
        clearTimeout(viewportAdjustTimeoutRef.current);
      }
      viewportAdjustTimeoutRef.current = setTimeout(() => {
        viewportAdjustTimeoutRef.current = null;
        isViewportAdjustingRef.current = false;
        restoreScrollAnchor(container);
      }, 80);
    };

    const observer = new ResizeObserver(scheduleRestore);
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (viewportAdjustTimeoutRef.current) {
        clearTimeout(viewportAdjustTimeoutRef.current);
        viewportAdjustTimeoutRef.current = null;
      }
    };
  }, [restoreScrollAnchor, updateContentWidth]);

  // 滚动进度节流提交，减少 IndexedDB 高频写入。
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    if (!isViewportAdjustingRef.current) {
      updateScrollAnchor(el);
      updateBottomScrollAnchor(el);
    }

    const latest = calculateTxtScrollProgress(
      el.scrollTop,
      el.scrollHeight,
      el.clientHeight,
    );
    progressTrackerRef.current?.update(latest.progress, latest.scrollTop);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      onProgressChangeRef.current(latest.progress, latest.scrollTop);
    }, 150);
  };

  // 键盘上下键按“一行文字”滚动；跳过输入控件，避免影响设置弹窗的键盘操作。
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;

      const container = containerRef.current;
      if (!container) return;

      // 设置弹窗打开时允许其内部滚动，不滚动背后的正文。
      if (document.getElementById('settings-modal-backdrop')) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select'))
      ) {
        return;
      }

      // 优先取视口顶边实际段落的行高；未渲染或落在间隙时回退到容器行高。
      const lineElement = findTopVisibleParagraph(container) ?? container;
      const step = calculateTxtLineScrollStep(
        window.getComputedStyle(lineElement).lineHeight,
        settings.fontSize,
        settings.lineHeight,
      );
      if (!Number.isFinite(step) || step <= 0) return;

      const direction = event.key === 'ArrowUp' ? -1 : 1;
      container.scrollBy({ top: direction * step, behavior: 'auto' });
      // 阻止浏览器默认按键滚动，避免一次按键产生两倍滚动量。
      event.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.fontSize, settings.lineHeight]);

  // 先保证目录目标所在分块已渲染；滚动定位必须等真实 DOM 存在后才能执行。
  useEffect(() => {
    if (outlineTargetParagraphIndex === undefined) return;

    const targetChunkIndex = getTxtChunkIndexForParagraph(outlineTargetParagraphIndex);
    ensureChunkIndexes([
      Math.max(0, targetChunkIndex - 1),
      targetChunkIndex,
      Math.min(txtChunks.length - 1, targetChunkIndex + 1),
    ]);
  }, [outlineTargetParagraphIndex, txtChunks.length, ensureChunkIndexes]);

  // 点击目录后按段落序号定位；使用容器相对坐标，避免窗口位置变化影响跳转精度。
  useEffect(() => {
    if (outlineTargetParagraphIndex === undefined) return;

    const container = containerRef.current;
    const target = container?.querySelector<HTMLElement>(
      `[data-toc-index="${outlineTargetParagraphIndex}"]`,
    );
    if (!container || !target) return;

    const targetTop =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      16;
    container.scrollTop = Math.max(0, targetTop);

    // 目录跳转的语义位置就是目标章节顶部；缩放窗口后必须回到这个章节，而不是像素位置。
    scrollAnchorRef.current = {
      paragraphIndex: outlineTargetParagraphIndex,
      offsetRatio: 0,
    };
    updateBottomScrollAnchor(container);

    const latest = calculateTxtScrollProgress(
      container.scrollTop,
      container.scrollHeight,
      container.clientHeight,
    );
    reportProgress(latest.progress, latest.scrollTop);
  }, [outlineTargetParagraphIndex, renderedChunkIndexes, reportProgress, updateBottomScrollAnchor]);

  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onClick={handleContainerClick}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      id="txt-reader-scroll-container"
      className={`w-full h-full overflow-y-auto px-4 py-2 sm:px-10 sm:py-6 md:px-16 select-text outline-hidden ${getTxtScrollbarClassName(
        isBorderVisible,
      )}`}
      style={{
        pointerEvents: 'auto',
        color: settings.fontColor,
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
      }}
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {txtChunks.map((chunk, chunkIndex) => {
          const isChunkRendered = renderedChunkIndexes.has(chunkIndex);

          return (
            <div
              key={`txt-chunk-${chunk.startIndex}`}
              ref={setChunkElementRef(chunkIndex)}
              data-virtual-chunk-index={chunkIndex}
              aria-hidden={!isChunkRendered}
              className="space-y-4"
              style={isChunkRendered ? undefined : { height: `${chunkHeights[chunkIndex]}px` }}
            >
              {isChunkRendered &&
                chunk.paragraphs.map((paragraph) => {
                  const isChapterTitle = chapterTitleIndexes.has(paragraph.index);

                  return (
                    <p
                      key={paragraph.index}
                      data-toc-index={paragraph.index}
                      className={`${
                        isChapterTitle
                          ? 'font-bold text-lg pt-6 pb-2 text-center opacity-95 tracking-wide'
                          : 'indent-8 text-justify'
                      }`}
                      style={{
                        textIndent: isChapterTitle ? '0' : '2em',
                      }}
                    >
                      {paragraph.text}
                    </p>
                  );
                })}
            </div>
          );
        })}

        {paragraphs.length === 0 && (
          <div className="text-center py-20 opacity-60">
            <p>文档内容为空或格式异常</p>
          </div>
        )}

        <div className="py-24 text-center text-xs opacity-40 select-none">
          —— 已至文末 ——
        </div>
      </div>
    </div>
  );
};
