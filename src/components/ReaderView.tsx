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
      className={`relative w-full h-full flex flex-col transition-all duration-300 select-none ${
        isToolbarVisible
          ? 'border border-zinc-300/80 shadow-2xl rounded-xl overflow-hidden'
          : 'border-0 border-transparent shadow-none rounded-none'
      }`}
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
          className="shrink-0 flex items-center justify-between px-4 py-2.5 z-30 transition-all border-b border-zinc-200/60 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md cursor-move select-none"
        >
          {/* Left: Document Info & Type */}
          <div
            className="flex items-center gap-2.5 min-w-0 max-w-[50%]"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                document.type === 'pdf' ? 'bg-rose-500' : 'bg-blue-600'
              }`}
            >
              {document.type === 'pdf' ? 'PDF' : 'TXT'}
            </div>

            <div className="min-w-0">
              <h1
                className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate"
                title={document.name}
              >
                {document.name}
              </h1>
            </div>

            {/* Reading Progress Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-mono shrink-0">
              <BookOpen className="w-3 h-3 text-zinc-400" />
              <span>进度: {document.progress}%</span>
              {document.type === 'pdf' && document.totalPages && (
                <span className="opacity-70">
                  ({document.currentPage || 1}/{document.totalPages}页)
                </span>
              )}
            </div>
          </div>

          {/* Center hint for Tab shortcut */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 pointer-events-none">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-mono text-zinc-600 dark:text-zinc-300 shadow-2xs">
              Tab
            </kbd>
            <span>键隐藏顶部栏与边框</span>
          </div>

          {/* Right Toolbar: 【设置】，【最小化】，【关闭】 */}
          <div
            className="flex items-center gap-1.5 shrink-0"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Quick Toggle Toolbar Button */}
            <button
              type="button"
              id="toolbar-toggle-btn"
              onClick={() => setIsToolbarVisible(false)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="隐藏工具栏与边框 (按 Tab 键可再次显示)"
            >
              <EyeOff className="w-4 h-4" />
            </button>

            {/* 【设置】 */}
            <button
              type="button"
              id="reader-settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200/80 dark:border-zinc-700"
              title="阅读外观与排版设置"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-500" />
              <span>设置</span>
            </button>

            {/* 【最小化】 */}
            <button
              type="button"
              id="reader-minimize-btn"
              onClick={() => {
                if (window.electronAPI?.isElectron) {
                  window.electronAPI.minimize();
                } else {
                  onMinimize();
                }
              }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="最小化阅读窗口"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* 【关闭】 */}
            <button
              type="button"
              id="reader-close-btn"
              onClick={() => {
                onClose();
              }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="退出阅读并返回文件列表 (Esc)"
            >
              <X className="w-4 h-4" />
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
