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
    const updatedDoc = {
      ...doc,
      lastOpened: Date.now(),
    };
    setActiveDoc(updatedDoc);
    setIsReading(true);
    setIsMinimized(false);

    setDocuments((prev) => [
      updatedDoc,
      ...prev.filter((d) => d.id !== doc.id),
    ]);
    await saveDocument(updatedDoc);

    // 切换至阅读模式专属窗口长宽尺寸
    applyWindowSizeForMode(true);
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

  // 阅读模式下：
  // 1. 如果工具栏隐藏（无边框沉浸摸鱼模式），或者背景选择为 transparent（透明模式），一律完全无边框、无圆角、无外层阴影
  // 2. 只有在常规有色模式且工具栏显式展开时，或者在首页未最大化时，才展示窗口圆角边框
  const isBorderLessReading = isReading && (!isReaderToolbarVisible || settings.bgColor === 'transparent');
  const isRounded = !isMaximized && !isBorderLessReading;

  // 动态同步原生窗口阴影控制 (Tauri)
  useEffect(() => {
    if (desktop.isDesktop()) {
      desktop.setShadow(isRounded);
    }
  }, [isRounded]);

  return (
    <div
      id="desktop-app-container"
      className={`w-full h-screen max-h-screen overflow-hidden flex flex-col font-sans select-none transition-colors duration-150 ${getContainerBgClass()} ${
        isRounded
          ? 'rounded-xl border border-zinc-300/80 dark:border-zinc-700/80 shadow-2xl'
          : 'rounded-none border-0 shadow-none'
      }`}
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
