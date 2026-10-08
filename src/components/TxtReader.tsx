import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ReaderSettings } from '../types';
import { TxtParagraph, isTxtChapterTitle, parseTxtParagraphs } from '../utils/outline';

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

  useEffect(() => {
    onProgressChangeRef.current = onProgressChange;
  }, [onProgressChange]);

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

  // Handle scroll events and throttle progress updates
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = Math.max(1, scrollHeight - clientHeight);
    const percent = Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100)));

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      onProgressChangeRef.current(percent, scrollTop);
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

    const maxScroll = Math.max(1, container.scrollHeight - container.clientHeight);
    const percent = Math.min(
      100,
      Math.max(0, Math.round((container.scrollTop / maxScroll) * 100)),
    );
    onProgressChangeRef.current(percent, container.scrollTop);
  }, [outlineTargetParagraphIndex]);

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
            const isChapterTitle = isTxtChapterTitle(paragraph.text);

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
