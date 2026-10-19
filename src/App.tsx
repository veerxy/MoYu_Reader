import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentItem, ReaderSettings } from './types';
import {
  getAllDocuments,
  saveDocument,
  updateDocumentProgress,
  deleteDocument,
  loadSettings,
  saveSettings,
} from './utils/storage';
import { getInitialSampleDocuments } from './utils/sampleDocs';
import { DesktopHeader } from './components/DesktopHeader';
import { RecentFileList } from './components/RecentFileList';
import { ReaderView } from './components/ReaderView';
import { MinimizedWidget } from './components/MinimizedWidget';
import { SettingsModal } from './components/SettingsModal';
import { useWindowDrag } from './utils/useWindowDrag';
import { desktop } from './utils/desktop';
import { getWindowBorderStyle } from './utils/readerLayout';

/** 等待下一帧，让 WebView 先完成原生窗口尺寸变化后的布局，再挂载重内容。 */
function waitForNextFrame(): Promise<void> {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export default function App() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [settings, setSettings] = useState<ReaderSettings>(() => loadSettings());
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isReaderToolbarVisible, setIsReaderToolbarVisible] = useState<boolean>(false);
  // 快速连点多个文档时，只允许最后一次打开请求真正挂载阅读页。
  const openDocumentRequestRef = useRef(0);

  // 全局支持长按/按住鼠标左键拖动窗口
  useWindowDrag(isMaximized);

  // 分别持久化记忆：首页窗口尺寸 & 阅读器窗口尺寸
  const isReadingRef = useRef<boolean>(isReading);
  isReadingRef.current = isReading;

  // 辅助函数：根据模式应用保存的尺寸
  const applyWindowSizeForMode = useCallback(async (readingMode: boolean) => {
    try {
      const storageKey = readingMode
        ? 'desktop_reader_window_size_reading'
        : 'desktop_reader_window_size_home';
      const defaultSize = readingMode
        ? { width: 520, height: 260 } // 阅读模式默认尺寸：更加小巧便携、贴合屏幕一隅摸鱼
        : { width: 880, height: 600 }; // 首页默认尺寸：舒适开阔的文档管理面板

      let targetW = defaultSize.width;
      let targetH = defaultSize.height;

      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          targetW = Math.max(260, Math.min(window.screen?.availWidth || 3840, parsed.width));
          targetH = Math.max(60, Math.min(window.screen?.availHeight || 2160, parsed.height));
        }
      }

      if (desktop.isDesktop()) {
        await desktop.setSize(targetW, targetH);
      }
    } catch (e) {
      console.warn('Failed to apply window size for mode', readingMode, e);
    }
  }, []);

  // 启动时初始化首页窗口尺寸
  useEffect(() => {
    applyWindowSizeForMode(false);

    // 防抖监听窗口手动拉伸并保存到对应模式的 key 中
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          let w = window.innerWidth;
          let h = window.innerHeight;
          if (desktop.isDesktop()) {
            const tauriSize = await desktop.getSize();
            if (tauriSize && tauriSize.width > 0 && tauriSize.height > 0) {
              w = tauriSize.width;
              h = tauriSize.height;
            }
          }
          if (w > 100 && h > 40) {
            const currentMode = isReadingRef.current;
            const storageKey = currentMode
              ? 'desktop_reader_window_size_reading'
              : 'desktop_reader_window_size_home';
            localStorage.setItem(storageKey, JSON.stringify({ width: w, height: h }));
          }
        } catch (e) {
          // ignore
        }
      }, 250);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [applyWindowSizeForMode]);

  // Initialize documents from IndexedDB or seed
  useEffect(() => {
    async function initDocs() {
      try {
        const stored = await getAllDocuments();
        if (stored.length > 0) {
          setDocuments(stored);
        } else {
          const samples = getInitialSampleDocuments();
          for (const sample of samples) {
            await saveDocument(sample);
          }
          setDocuments(samples);
        }
      } catch (e) {
        console.error('Failed to init docs', e);
        setDocuments(getInitialSampleDocuments());
      } finally {
        setIsLoaded(true);
      }
    }

    initDocs();
  }, []);

  // Update settings and persist
  const handleUpdateSettings = (newSettings: ReaderSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Open document in reader
  const handleOpenDocument = async (doc: DocumentItem) => {
    const requestId = ++openDocumentRequestRef.current;
    const updatedDoc = {
      ...doc,
      lastOpened: Date.now(),
    };

    setDocuments((prev) => [
      updatedDoc,
      ...prev.filter((d) => (d.id !== doc.id)),
    ]);
    await saveDocument(updatedDoc);

    // 先切换原生窗口尺寸，再挂载阅读内容，避免阅读页经历“大窗口布局 -> 小窗口重排”。
    await applyWindowSizeForMode(true);
    await waitForNextFrame();
    if (openDocumentRequestRef.current !== requestId) return;

    setActiveDoc(updatedDoc);
    setIsReading(true);
    setIsMinimized(false);
  };
  // Update reading progress
  const handleProgressUpdate = async (progress: number, extra?: any) => {
    if (!activeDoc) return;

    const updated = {
      ...activeDoc,
      progress,
      lastOpened: Date.now(),
      ...extra,
    };
    setActiveDoc(updated);

    setDocuments((prev) =>
      prev.map((d) => (d.id === activeDoc.id ? updated : d))
    );

    await updateDocumentProgress(activeDoc.id, progress, extra);
  };

  // Delete document
  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeDoc?.id === id) {
      setActiveDoc(null);
      setIsReading(false);
      setIsMinimized(false);
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    await deleteDocument(id);
  };

  // Handle document newly imported via Importer
  const handleDocumentImported = async (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
    handleOpenDocument(newDoc);
  };

  // Close reading view
  const handleCloseReading = () => {
    setIsReading(false);
    setIsMinimized(false);
    // 切换回首页专属窗口长宽尺寸
    applyWindowSizeForMode(false);
  };

  // Minimize reading view
  const handleMinimizeReading = () => {
    setIsMinimized(true);
  };

  // Restore minimized reading view
  const handleRestoreReading = () => {
    setIsMinimized(false);
    setIsReading(true);
  };

  // Compute container background based on mode
  const getContainerBgClass = () => {
    if (isReading && !isMinimized) {
      switch (settings.bgColor) {
        case 'dark':
          return 'bg-[#18181b] text-zinc-100';
        case 'white':
          return 'bg-white text-zinc-900';
        case 'book':
          return 'bg-[#f4ecd8] text-[#2c2214]';
        case 'transparent':
        default:
          return 'bg-transparent text-zinc-900';
      }
    }
    return 'bg-[#f8f9fa] text-zinc-800'; // Clean Windows light app background
  };

  // 边框必须只做视觉绘制，不能改变 WebView 客户区尺寸：
  // 1. Tauri setShadow 在 Windows 上会改变客户区，导致 TXT 换行宽度漂移。
  // 2. inset box-shadow 绘制在最外层内部，不参与布局，也不会形成第二层圆角。
  const isHomeSurface = !isReading || isMinimized;
  const showBorder = !isMaximized && (isHomeSurface || isReaderToolbarVisible);

  return (
    <div
      id="desktop-app-container"
      className={`relative w-full h-full max-h-screen overflow-hidden flex flex-col font-sans select-none box-border rounded-none ${getContainerBgClass()}`}
      style={{ boxShadow: getWindowBorderStyle(showBorder) }}
    >
      {/* Windows Standard Titlebar (shown in home view) */}
      {(!isReading || isMinimized) && (
        <DesktopHeader
          title="文档阅读器"
          onMinimize={() => {}}
          onClose={() => {}}
          isMaximized={isMaximized}
          onToggleMaximize={() => setIsMaximized((prev) => !prev)}
        />
      )}

      {/* Main Workspace */}
      <div className="flex-1 min-h-0 w-full h-full flex overflow-hidden relative">
        {/* Active Document Reader View */}
        {isReading && activeDoc && !isMinimized && (
          <ReaderView
            document={activeDoc}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onClose={handleCloseReading}
            onMinimize={handleMinimizeReading}
            onProgressUpdate={handleProgressUpdate}
            onToggleMaximize={() => setIsMaximized((prev) => !prev)}
            onBorderVisibilityChange={setIsReaderToolbarVisible}
          />
        )}

        {/* Home View: Clean Single-Pane Dashboard */}
        {(!isReading || isMinimized) && (
          <main className="w-full h-full overflow-y-auto bg-[#f8f9fa]">
            <RecentFileList
              documents={documents}
              onOpenDocument={handleOpenDocument}
              onDeleteDocument={handleDeleteDocument}
              onDocumentImported={handleDocumentImported}
            />
          </main>
        )}
      </div>

      {/* Floating Minimized Widget */}
      {isReading && isMinimized && activeDoc && (
        <MinimizedWidget
          document={activeDoc}
          onRestore={handleRestoreReading}
          onClose={handleCloseReading}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

    </div>
  );
}
