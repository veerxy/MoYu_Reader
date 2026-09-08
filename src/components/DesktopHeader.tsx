import React from 'react';
import { Minus, Square, X, BookOpen, Maximize2, Minimize2 } from 'lucide-react';

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
    if (window.electronAPI?.isElectron) {
      window.electronAPI.minimize();
    } else {
      onMinimize?.();
    }
  };

  const handleToggleMaximize = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.electronAPI?.isElectron) {
      window.electronAPI.maximize();
    } else {
      onToggleMaximize?.();
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.electronAPI?.isElectron) {
      window.electronAPI.close();
    } else {
      onClose?.();
    }
  };

  return (
    <header
      id="desktop-window-titlebar"
      onMouseDown={onStartDrag}
      onDoubleClick={() => handleToggleMaximize()}
      style={{ WebkitAppRegion: 'drag' } as any}
      className="h-10 bg-zinc-950 text-zinc-300 px-3 flex items-center justify-between select-none border-b border-zinc-800/80 text-xs shrink-0 cursor-move"
    >
      {/* Window Controls (macOS style dots) */}
      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as any}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 mr-2">
          <button
            type="button"
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center group"
            title="关闭窗口"
          >
            <X className="w-2 h-2 text-rose-900 opacity-0 group-hover:opacity-100" />
          </button>
          <button
            type="button"
            onClick={handleMinimize}
            className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center group"
            title="最小化"
          >
            <Minus className="w-2 h-2 text-amber-900 opacity-0 group-hover:opacity-100" />
          </button>
          <button
            type="button"
            onClick={handleToggleMaximize}
            className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center group"
            title={isMaximized ? '还原窗口' : '最大化窗口'}
          >
            <Square className="w-1.5 h-1.5 text-emerald-900 opacity-0 group-hover:opacity-100" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-400 font-medium text-xs pointer-events-none">
          <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-200 font-normal truncate max-w-[320px] sm:max-w-md">{title}</span>
        </div>
      </div>

      {/* Right Actions: Maximize toggle */}
      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as any}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleToggleMaximize}
          className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          title={isMaximized ? '还原窗口' : '最大化窗口'}
        >
          {isMaximized ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </header>
  );
};
