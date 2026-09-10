import React from 'react';
import { BookOpen } from 'lucide-react';
import { desktop } from '../utils/desktop';

interface DesktopHeaderProps {
  title?: string;
  onMinimize?: () => void;
  onClose?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onStartDrag?: (e: React.MouseEvent) => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  title = '文档阅读器',
  onMinimize,
  onClose,
  isMaximized = false,
  onToggleMaximize,
  onStartDrag,
}) => {
  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (desktop.isDesktop()) {
      desktop.minimize();
    } else {
      onMinimize?.();
    }
  };

  const handleToggleMaximize = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (desktop.isDesktop()) {
      desktop.toggleMaximize();
    } else {
      onToggleMaximize?.();
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (desktop.isDesktop()) {
      desktop.close();
    } else {
      onClose?.();
    }
  };

  return (
    <header
      id="desktop-window-titlebar"
      data-tauri-drag-region
      onMouseDown={onStartDrag}
      onDoubleClick={() => handleToggleMaximize()}
      style={{ WebkitAppRegion: 'drag' } as any}
      className="h-9 bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-200 flex items-center justify-between select-none border-b border-zinc-200/80 dark:border-zinc-800 text-xs shrink-0 cursor-move"
    >
      {/* Left: Windows App Icon & Title */}
      <div
        className="flex items-center gap-2 pl-3 pointer-events-none"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <img
          src="/app_icon.png"
          alt="App Icon"
          className="w-4 h-4 rounded-[4px] object-cover ring-1 ring-black/10 shadow-xs"
          onError={(e) => {
            // fallback if image fails to load
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <span className="font-medium text-xs text-zinc-800 dark:text-zinc-200 tracking-tight">
          {title}
        </span>
      </div>

      {/* Center Draggable Spacer */}
      <div className="flex-1 h-full" />

      {/* Right: Windows Standard Caption Controls */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as any}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Minimize Button */}
        <button
          type="button"
          id="win-btn-minimize"
          onClick={handleMinimize}
          className="h-9 w-11 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 active:bg-zinc-300/70 transition-colors"
          title="最小化"
          aria-label="最小化"
        >
          <svg className="w-3 h-3" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>

        {/* Maximize / Restore Button */}
        <button
          type="button"
          id="win-btn-maximize"
          onClick={handleToggleMaximize}
          className="h-9 w-11 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 active:bg-zinc-300/70 transition-colors"
          title={isMaximized ? '向下还原' : '最大化'}
          aria-label={isMaximized ? '向下还原' : '最大化'}
        >
          {isMaximized ? (
            /* Dual Overlapping Squares (Windows Restore) */
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M2.5 2.5V0.5H9.5V7.5H7.5" />
              <rect x="0.5" y="2.5" width="7" height="7" />
            </svg>
          ) : (
            /* Single Square (Windows Maximize) */
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>
          )}
        </button>

        {/* Close Button (Windows Standard Red Hover) */}
        <button
          type="button"
          id="win-btn-close"
          onClick={handleClose}
          className="h-9 w-11 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-[#e81123] hover:text-white active:bg-[#c4101f] transition-colors"
          title="关闭"
          aria-label="关闭"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M1 1L9 9M9 1L1 9" />
          </svg>
        </button>
      </div>
    </header>
  );
};
