import React, { useEffect, useRef } from 'react';
import { ReaderSettings } from '../types';
import {
  calculateTxtKeyboardPageScrollStep,
  calculateTxtLineScrollStep,
  getTxtScrollbarClassName,
} from '../utils/readerLayout';
import { calculateTxtScrollProgress } from '../utils/readingProgress';

interface DocxReaderProps {
  html: string;
  settings: ReaderSettings;
  isBorderVisible?: boolean;
  initialScrollPercent?: number;
  initialScrollTop?: number;
  outlineTargetParagraphIndex?: number;
  onProgressChange: (progressPercent: number, scrollTop: number) => void;
}

export const DocxReader: React.FC<DocxReaderProps> = ({
  html,
  settings,
  isBorderVisible = false,
  initialScrollPercent = 0,
  initialScrollTop,
  outlineTargetParagraphIndex,
  onProgressChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestProgressRef = useRef<{ progress: number; scrollTop: number } | null>(null);
  const onProgressChangeRef = useRef(onProgressChange);
  const hasRestoredScrollRef = useRef(false);

  useEffect(() => {
    onProgressChangeRef.current = onProgressChange;
  }, [onProgressChange]);

  // mammoth 输出的是标准 h1-h6；这里补上稳定索引，供目录跳转定位使用。
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    content.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading, index) => {
      heading.setAttribute('data-docx-heading-index', String(index));
    });
  }, [html]);

  // 内容挂载后恢复上次阅读位置；图片加载可能改变高度，延迟一帧更接近真实布局。
  useEffect(() => {
    const container = containerRef.current;
    if (!container || hasRestoredScrollRef.current) return;

    const timer = setTimeout(() => {
      if (initialScrollTop !== undefined && initialScrollTop > 0) {
        container.scrollTop = initialScrollTop;
      } else if (initialScrollPercent > 0 && container.scrollHeight > container.clientHeight) {
        container.scrollTop =
          ((container.scrollHeight - container.clientHeight) * initialScrollPercent) / 100;
      }
      hasRestoredScrollRef.current = true;
    }, 80);

    return () => clearTimeout(timer);
  }, [html, initialScrollPercent, initialScrollTop]);

  // 退出阅读页时同步最后一次滚动位置，避免节流窗口内的进度丢失。
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      const latest = latestProgressRef.current;
      if (latest) onProgressChangeRef.current(latest.progress, latest.scrollTop);
    };
  }, []);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const latest = calculateTxtScrollProgress(
      container.scrollTop,
      container.scrollHeight,
      container.clientHeight,
    );
    latestProgressRef.current = latest;

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      onProgressChangeRef.current(latest.progress, latest.scrollTop);
    }, 150);
  };

  // 目录跳转按标题元素定位；paragraphIndex 在 DOCX 中表示第几个标题。
  useEffect(() => {
    if (outlineTargetParagraphIndex === undefined) return;

    const container = containerRef.current;
    const target = container?.querySelector<HTMLElement>(
      `[data-docx-heading-index="${outlineTargetParagraphIndex}"]`,
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
    latestProgressRef.current = latest;
    onProgressChangeRef.current(latest.progress, latest.scrollTop);
  }, [html, outlineTargetParagraphIndex]);

  // 与 TXT 保持一致：上下键按“视口高度少一行”滚动，避免出现半行文字。
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') ||
        document.getElementById('settings-modal-backdrop')
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select'))
      ) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const lineHeight = calculateTxtLineScrollStep(
        window.getComputedStyle(container).lineHeight,
        settings.fontSize,
        settings.lineHeight,
      );
      const step = calculateTxtKeyboardPageScrollStep(lineHeight, container.clientHeight);
      if (!Number.isFinite(step) || step <= 0) return;

      container.scrollBy({
        top: (event.key === 'ArrowUp' ? -1 : 1) * step,
        behavior: 'auto',
      });
      event.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.fontSize, settings.lineHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`w-full h-full overflow-y-auto overflow-x-hidden px-4 sm:px-8 ${getTxtScrollbarClassName(isBorderVisible)}`}
      style={{
        pointerEvents: 'auto',
        color: settings.fontColor,
        fontFamily: settings.fontFamily,
        fontSize: `${settings.fontSize}px`,
        lineHeight: settings.lineHeight,
        textAlign: settings.textAlign,
        // DOCX 的页面底色不参与渲染，保证透明模式只保留正文、图片和表格。
        backgroundColor: 'transparent',
      }}
    >
      <div
        ref={contentRef}
        className="docx-content max-w-3xl mx-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
