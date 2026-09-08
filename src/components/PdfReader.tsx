import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ReaderSettings } from '../types';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`;
  }
}

interface PdfReaderProps {
  data: ArrayBuffer | string; // ArrayBuffer or base64
  settings: ReaderSettings;
  initialPage?: number;
  isBorderVisible?: boolean;
  onProgressChange: (progressPercent: number, page: number, totalPages: number) => void;
}

export const PdfReader: React.FC<PdfReaderProps> = ({
  data,
  settings,
  initialPage = 1,
  isBorderVisible = false,
  onProgressChange,
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.25);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF document
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    async function loadPdf() {
      try {
        let loadingTask: any;
        if (typeof data === 'string') {
          // base64 or URL
          loadingTask = pdfjsLib.getDocument({ url: data });
        } else {
          // ArrayBuffer: make a slice to avoid detached buffer issues
          const bufferCopy = data.slice(0);
          loadingTask = pdfjsLib.getDocument({ data: bufferCopy });
        }

        const loadedDoc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(loadedDoc);
        setTotalPages(loadedDoc.numPages);

        const targetPage = Math.min(Math.max(1, initialPage), loadedDoc.numPages);
        setCurrentPage(targetPage);
        const percent = Math.round((targetPage / loadedDoc.numPages) * 100);
        onProgressChange(percent, targetPage, loadedDoc.numPages);
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error('PDF loading error', err);
          const msg = err instanceof Error ? err.message : '无法解析此 PDF 文档';
          setErrorMessage(msg);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [data]);

  // Render current page onto canvas
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Support High-DPI screens
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;

        const renderContext: any = {
          canvasContext: context,
          viewport: viewport,
          transform: transform,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('PDF page rendering error', err);
        }
      }
    },
    [pdfDoc, scale, rotation]
  );

  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, rotation, renderPage]);

  // Page navigation helpers
  const goToPage = (newPage: number) => {
    if (!pdfDoc) return;
    const clamped = Math.min(Math.max(1, newPage), totalPages);
    if (clamped !== currentPage) {
      setCurrentPage(clamped);
      const percent = Math.round((clamped / totalPages) * 100);
      onProgressChange(percent, clamped, totalPages);
    }
  };

  const handlePrevPage = () => goToPage(currentPage - 1);
  const handleNextPage = () => goToPage(currentPage + 1);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, pdfDoc]);

  // Click-through prevention or enable on transparent mode
  const isClickThrough =
    settings.bgColor === 'transparent' &&
    Boolean(settings.transparentClickThrough) &&
    !isBorderVisible;

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!isClickThrough) {
      e.stopPropagation();
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      onMouseDown={(e) => {
        if (!isClickThrough) e.stopPropagation();
      }}
      id="pdf-reader-container"
      className="w-full h-full flex flex-col items-center select-text outline-hidden overflow-hidden"
      style={{ pointerEvents: isClickThrough ? 'none' : 'auto' }}
    >
      {/* PDF Floating Control Bar */}
      <div
        id="pdf-floating-controls"
        onClick={(e) => e.stopPropagation()}
        className="my-2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-900 text-white backdrop-blur-md text-xs shadow-md border border-white/10 transition-all"
      >
        <button
          type="button"
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="上一页 (Left Arrow)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-2 font-mono text-[11px] select-none">
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="下一页 (Right Arrow / Space)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span className="w-px h-3.5 bg-white/20 mx-1" />

        <button
          type="button"
          onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
          title="缩小"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] font-mono select-none px-1">
          {Math.round(scale * 100)}%
        </span>

        <button
          type="button"
          onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
          title="放大"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setRotation((r) => (r + 90) % 360)}
          className="p-1 rounded-full hover:bg-white/20 transition-colors ml-0.5"
          title="顺时针旋转"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main PDF Canvas Scroll Viewport */}
      <div
        id="pdf-canvas-viewport"
        className={`flex-1 w-full overflow-auto flex items-start justify-center p-4 sm:p-8 ${
          isBorderVisible ? '' : 'hide-scrollbar'
        }`}
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-700" />
            <span className="text-sm font-medium">正在解析 PDF 页面...</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-rose-600 max-w-md text-center p-6 bg-rose-50/80 rounded-2xl border border-rose-200">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <div className="font-semibold text-sm">PDF 加载异常</div>
            <div className="text-xs text-rose-700">{errorMessage}</div>
          </div>
        )}

        <div
          className={`transition-all duration-200 ${
            isLoading ? 'hidden' : 'block'
          } ${
            settings.bgColor === 'dark' ? 'filter invert hue-rotate-180 brightness-95' : ''
          }`}
          style={{
            boxShadow:
              settings.bgColor === 'transparent'
                ? '0 8px 30px rgba(0,0,0,0.12)'
                : '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <canvas
            ref={canvasRef}
            className="rounded-sm block"
            style={{
              backgroundColor: '#ffffff',
            }}
          />
        </div>
      </div>
    </div>
  );
};
