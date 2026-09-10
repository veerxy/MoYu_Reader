import React, { useEffect, useRef, useState } from 'react';
import { ReaderSettings } from '../types';

interface TxtReaderProps {
  content: string;
  settings: ReaderSettings;
  initialScrollPercent?: number;
  initialScrollTop?: number;
  isBorderVisible?: boolean;
  onProgressChange: (progressPercent: number, scrollTop: number) => void;
}

export const TxtReader: React.FC<TxtReaderProps> = ({
  content,
  settings,
  initialScrollPercent = 0,
  initialScrollTop,
  isBorderVisible = false,
  onProgressChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasScrolledInitial, setHasScrolledInitial] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      onProgressChange(percent, scrollTop);
    }, 150);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Split content into clean paragraphs
  const paragraphs = React.useMemo(() => {
    if (!content) return [];
    return content
      .split(/\r?\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }, [content]);

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
          paragraphs.map((p, idx) => {
            const isChapterTitle =
              /^第[一二三四五六七八九十百0-9]+[章节卷回篇部]/.test(p) ||
              /^Chapter\s+\d+/i.test(p) ||
              (p.length < 30 && p.includes('章'));

            return (
              <p
                key={idx}
                className={`${
                  isChapterTitle
                    ? 'font-bold text-lg pt-6 pb-2 text-center opacity-95 tracking-wide'
                    : 'indent-8 text-justify'
                }`}
                style={{
                  textIndent: isChapterTitle ? '0' : '2em',
                }}
              >
                {p}
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
