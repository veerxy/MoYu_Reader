import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReaderSettings } from '../types';
import { TxtParagraph, parseTxtParagraphs } from '../utils/outline';
import { extractTxtHeadings } from '../utils/txtHeading';
import {
  calculateTxtScrollProgress,
  createTxtProgressTracker,
  TxtProgressTracker,
} from '../utils/readingProgress';

interface TxtReaderProps {
  content: string;
  settings: ReaderSettings;
  initialScrollPercent?: number;
  initialScrollTop?: number;
  isBorderVisible?: boolean;
  outlineTargetParagraphIndex?: number;
  onProgressChange: (progressPercent: number, scrollTop: number) => void;
}

export const TxtReader: React.FC<TxtReaderProps> = ({
  content,
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
  const onProgressChangeRef = useRef(onProgressChange);
  const progressTrackerRef = useRef<TxtProgressTracker | null>(null);

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

  // 退出阅读页时取消未触发的节流任务，并同步提交最后一次阅读位置。
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      progressTrackerRef.current?.flush((progress, scrollTop) => {
        onProgressChangeRef.current(progress, scrollTop);
      });
    };
  }, []);

  // Restore initial scroll position once content is mounted
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
    }, 80);

    return () => clearTimeout(timer);
  }, [initialScrollPercent, initialScrollTop, hasScrolledInitial]);

  // 目录跳转和正文渲染共用 parseTxtParagraphs，保证索引不会因空行处理不同而错位。
  const paragraphs = useMemo<TxtParagraph[]>(() => parseTxtParagraphs(content), [content]);

  // 标题样式也必须使用“全文过滤后”的结果；否则孤立编号目录会出现目录有项、正文不高亮的不一致。
  const chapterTitleIndexes = useMemo(
    () => new Set(extractTxtHeadings(content).map((heading) => heading.paragraphIndex)),
    [content],
  );

  // 滚动进度节流提交，减少 IndexedDB 高频写入。
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

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

    const latest = calculateTxtScrollProgress(
      container.scrollTop,
      container.scrollHeight,
      container.clientHeight,
    );
    reportProgress(latest.progress, latest.scrollTop);
  }, [outlineTargetParagraphIndex, reportProgress]);

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
      className={`w-full h-full overflow-y-auto px-4 py-2 sm:px-10 sm:py-6 md:px-16 select-text outline-hidden ${
        isBorderVisible ? '' : 'hide-scrollbar'
      }`}
      style={{
        pointerEvents: 'auto',
        color: settings.fontColor,
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
      }}
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph) => {
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
          })
        ) : (
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
