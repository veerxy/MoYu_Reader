import React, { useState, useEffect } from 'react';
import {
  Settings,
  Minus,
  X,
  BookOpen,
  FileText,
  Eye,
  EyeOff,
  Keyboard,
  Sparkles,
} from 'lucide-react';
import { DocumentItem, ReaderSettings } from '../types';
import { TxtReader } from './TxtReader';
import { PdfReader } from './PdfReader';
import { SettingsModal } from './SettingsModal';

interface ReaderViewProps {
  document: DocumentItem;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: ReaderSettings) => void;
  onClose: () => void;
  onMinimize: () => void;
  onProgressUpdate: (progress: number, extra?: any) => void;
  onStartDrag?: (e: React.MouseEvent) => void;
  onToggleMaximize?: () => void;
  onBorderVisibilityChange?: (visible: boolean) => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  document,
  settings,
  onUpdateSettings,
  onClose,
  onMinimize,
  onProgressUpdate,
  onStartDrag,
  onToggleMaximize,
  onBorderVisibilityChange,
}) => {
  // Requirement 2.2: "阅读模式默认背景透明，隐藏边框和顶部栏，按Tab可以切换显隐"
  const [isToolbarVisible, setIsToolbarVisible] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showTabTip, setShowTabTip] = useState<boolean>(true);

  // Notify parent of border visibility so window resize grip indicator syncs
  useEffect(() => {
    onBorderVisibilityChange?.(isToolbarVisible);
  }, [isToolbarVisible, onBorderVisibilityChange]);

  // Auto-hide the initial "Press Tab to toggle" toast after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTabTip(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  // Global Tab key listener to toggle toolbar and borders per Requirement 2.2
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        // Prevent default tab focusing so it cleanly acts as visibility toggle
        e.preventDefault();
        setIsToolbarVisible((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, onClose]);

  // Determine container background based on settings
  // Requirement 2.1: transparent, dark, white, book
  const getBgStyle = () => {
    switch (settings.bgColor) {
      case 'dark':
        return {
          backgroundColor: '#18181b',
          color: settings.fontColor || '#f4f4f5',
        };
      case 'white':
        return {
          backgroundColor: '#ffffff',
          color: settings.fontColor || '#111827',
        };
      case 'book':
        return {
          backgroundColor: '#f4ecd8',
          color: settings.fontColor || '#2c2214',
        };
      case 'transparent':
      default:
        return {
          backgroundColor: 'transparent',
          color: settings.fontColor || '#111827',
        };
    }
  };

  // 用户需求：阅读窗口的×直接关闭应用程序即可
  const handleCloseApp = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.electronAPI?.isElectron) {
      window.electronAPI.close();
    } else {
      try {
        window.close();
      } catch (err) {
        // ignore
      }
      onClose();
    }
  };

  // Requirement 2.1: "背景如果选择透明，鼠标在客户端的点击事件不可穿透到下一层"
  const handleReaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      id="reader-view-root"
      onClick={handleReaderClick}
      onMouseDown={handleReaderClick}
      onPointerDown={handleReaderClick}
      className="relative w-full h-full flex flex-col transition-all duration-300 select-none overflow-hidden"
      style={{
        ...getBgStyle(),
        pointerEvents: 'auto', // Ensures mouse clicks NEVER penetrate to the layer below
      }}
    >
      {/* Top Bar / Toolbar: Requirement 2 & 2.2 */}
      {isToolbarVisible && (
        <header
          id="reader-top-toolbar"
          onMouseDown={onStartDrag}
          onDoubleClick={onToggleMaximize}
          style={{ WebkitAppRegion: 'drag' } as any}
          className="shrink-0 h-10 flex items-center justify-between px-3 z-30 transition-all border-b border-zinc-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md cursor-move select-none text-xs"
        >
          {/* Left: Back button, Document Info & Progress */}
          <div
            className="flex items-center gap-2 min-w-0 max-w-[45%]"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Back to Document List */}
            <button
              type="button"
              id="reader-back-to-list-btn"
              onClick={onClose}
              className="px-2 py-1 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 flex items-center gap-1 transition-colors"
              title="返回文件列表 (Esc)"
            >
              <span className="font-semibold text-xs">‹</span>
              <span>列表</span>
            </button>

            <div
              className={`w-5 h-5 rounded-xs flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                document.type === 'pdf' ? 'bg-rose-500' : 'bg-blue-600'
              }`}
            >
              {document.type === 'pdf' ? 'P' : 'T'}
            </div>

            <h1
              className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate"
              title={document.name}
            >
              {document.name}
            </h1>

            {/* Reading Progress */}
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-mono shrink-0">
              {document.progress}%
            </span>
          </div>

          {/* Center: Quick Background Presets & Font Size */}
          <div
            className="hidden md:flex items-center gap-3 shrink-0"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Background Mode Pills */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-md border border-zinc-200/80 dark:border-zinc-700/80">
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, bgColor: 'transparent' })}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  settings.bgColor === 'transparent'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
                title="透明背景 (沉浸悬浮)"
              >
                透明
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, bgColor: 'white' })}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  settings.bgColor === 'white'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
                title="纯白背景"
              >
                浅白
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, bgColor: 'book' })}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  settings.bgColor === 'book'
                    ? 'bg-[#f4ecd8] text-[#5c3e1e] font-semibold shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
                title="护眼羊皮纸背景"
              >
                羊皮纸
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, bgColor: 'dark' })}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  settings.bgColor === 'dark'
                    ? 'bg-zinc-950 text-white font-semibold shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
                title="暗黑背景"
              >
                暗黑
              </button>
            </div>

            {/* Quick Font Size Adjust */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, fontSize: Math.max(12, settings.fontSize - 1) })
                }
                className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-bold text-xs"
                title="缩小字号"
              >
                A-
              </button>
              <span className="text-[11px] text-zinc-500 font-mono w-5 text-center">
                {settings.fontSize}
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, fontSize: Math.min(36, settings.fontSize + 1) })
                }
                className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-bold text-xs"
                title="放大字号"
              >
                A+
              </button>
            </div>
          </div>

          {/* Right Toolbar: Settings & Windows Caption Buttons */}
          <div
            className="flex items-center h-full shrink-0"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Quick Hide Toolbar (Tab) */}
            <button
              type="button"
              id="toolbar-toggle-btn"
              onClick={() => setIsToolbarVisible(false)}
              className="h-8 px-2 mr-1 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
              title="隐藏边框与工具栏 (快捷键: Tab)"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">隐藏栏 (Tab)</span>
            </button>

            {/* Settings Button */}
            <button
              type="button"
              id="reader-settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 px-2.5 mr-2 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 border border-zinc-200/80 dark:border-zinc-700"
              title="阅读外观与排版设置"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-500" />
              <span>设置</span>
            </button>

            {/* Windows Caption Controls */}
            {/* Minimize */}
            <button
              type="button"
              id="reader-win-minimize-btn"
              onClick={() => {
                if (window.electronAPI?.isElectron) {
                  window.electronAPI.minimize();
                } else {
                  onMinimize();
                }
              }}
              className="h-10 w-10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 active:bg-zinc-300/70 transition-colors"
              title="最小化"
              aria-label="最小化"
            >
              <svg className="w-3 h-3" viewBox="0 0 10 1" fill="currentColor">
                <rect width="10" height="1" />
              </svg>
            </button>

            {/* Maximize / Restore */}
            <button
              type="button"
              id="reader-win-maximize-btn"
              onClick={() => {
                if (window.electronAPI?.isElectron) {
                  window.electronAPI.maximize();
                } else {
                  onToggleMaximize?.();
                }
              }}
              className="h-10 w-10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 active:bg-zinc-300/70 transition-colors"
              title="最大化 / 还原"
              aria-label="最大化 / 还原"
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="0.5" y="0.5" width="9" height="9" />
              </svg>
            </button>

            {/* Close Application */}
            <button
              type="button"
              id="reader-win-close-btn"
              onClick={handleCloseApp}
              className="h-10 w-10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-[#e81123] hover:text-white active:bg-[#c4101f] transition-colors"
              title="关闭程序"
              aria-label="关闭程序"
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M1 1L9 9M9 1L1 9" />
              </svg>
            </button>
          </div>
        </header>
      )}

      {/* Floating Hover Tab Trigger when toolbar is hidden */}
      {!isToolbarVisible && (
        <div
          id="reader-hidden-toolbar-trigger"
          className="absolute top-0 left-0 right-0 h-7 group z-30 flex justify-center items-start pt-1 pointer-events-auto select-none"
        >
          {/* Top draggable area */}
          <div
            onMouseDown={onStartDrag}
            onDoubleClick={onToggleMaximize}
            style={{ WebkitAppRegion: 'drag' } as any}
            className="absolute inset-x-12 top-0 h-4 cursor-move flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="按住此处可拖拽移动窗口"
          >
            <div className="w-16 h-1 rounded-full bg-zinc-400/80 shadow-xs" />
          </div>

          <button
            type="button"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onClick={() => setIsToolbarVisible(true)}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 -translate-y-2 group-hover:translate-y-0 px-3 py-1 rounded-full bg-zinc-900/85 text-white text-[11px] shadow-lg backdrop-blur-xs flex items-center gap-1.5 hover:bg-zinc-900 z-40"
          >
            <Eye className="w-3 h-3 text-zinc-300" />
            <span>按 Tab 键显示工具栏与边框</span>
          </button>
        </div>
      )}

      {/* Initial Welcome Notification about Tab shortcut */}
      {showTabTip && !isToolbarVisible && (
        <div
          id="tab-shortcut-toast"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/90 text-white text-xs px-4 py-2 rounded-full shadow-xl backdrop-blur-md flex items-center gap-2 animate-fadeIn pointer-events-auto border border-white/10"
        >
          <Keyboard className="w-3.5 h-3.5 text-zinc-300" />
          <span>已进入极简透明阅读模式，按</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/20 font-mono text-[11px] font-bold">
            Tab
          </kbd>
          <span>键显隐工具栏与边框</span>
          <button
            type="button"
            onClick={() => setShowTabTip(false)}
            className="ml-1 text-zinc-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Document Content Area */}
      <main
        id="reader-document-viewport"
        className="flex-1 w-full h-full relative overflow-hidden"
        style={{ pointerEvents: 'auto' }}
      >
        {document.type === 'txt' && (
          <TxtReader
            content={document.content || ''}
            settings={settings}
            isBorderVisible={isToolbarVisible}
            initialScrollPercent={document.scrollPercent || document.progress || 0}
            initialScrollTop={document.scrollTop}
            onProgressChange={(percent, scrollTop) => {
              onProgressUpdate(percent, { scrollTop, scrollPercent: percent });
            }}
          />
        )}

        {document.type === 'pdf' && (
          <PdfReader
            data={document.pdfArrayBuffer || document.pdfDataUrl || ''}
            settings={settings}
            isBorderVisible={isToolbarVisible}
            initialPage={document.currentPage || 1}
            onProgressChange={(percent, page, totalPages) => {
              onProgressUpdate(percent, { currentPage: page, totalPages });
            }}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />
    </div>
  );
};
