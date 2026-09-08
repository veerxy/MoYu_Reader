import React from 'react';
import { Minus, Square, X, BookOpen, Monitor, Sparkles } from 'lucide-react';

interface DesktopHeaderProps {
  title?: string;
  onMinimize?: () => void;
  onClose?: () => void;
  isDesktopBgActive?: boolean;
  onToggleDesktopBg?: () => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  title = '文档阅读器 (桌面客户端)',
  onMinimize,
  onClose,
  isDesktopBgActive,
  onToggleDesktopBg,
}) => {
  return (
    <header
      id="desktop-window-titlebar"
      className="h-10 bg-zinc-950 text-zinc-300 px-3 flex items-center justify-between select-none border-b border-zinc-800 text-xs shrink-0"
    >
      {/* Window Controls (macOS style dots) */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 mr-2">
          <button
            type="button"
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center group"
            title="关闭客户端"
          >
            <X className="w-2 h-2 text-rose-900 opacity-0 group-hover:opacity-100" />
          </button>
          <button
            type="button"
            onClick={onMinimize}
            className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center group"
            title="最小化窗口"
          >
            <Minus className="w-2 h-2 text-amber-900 opacity-0 group-hover:opacity-100" />
          </button>
          <button
            type="button"
            className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center group"
            title="缩放窗口"
          >
            <Square className="w-1.5 h-1.5 text-emerald-900 opacity-0 group-hover:opacity-100" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-400 font-medium text-xs">
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-zinc-200">{title}</span>
        </div>
      </div>

      {/* Center Shortcuts Badge */}
      <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-500">
        <span>快捷提示:</span>
        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
          Tab
        </span>
        <span>显隐阅读工具栏与边框</span>
      </div>

      {/* Right Desktop Environment / Wallpaper toggle */}
      <div className="flex items-center gap-2">
        {onToggleDesktopBg && (
          <button
            type="button"
            onClick={onToggleDesktopBg}
            className={`px-2 py-1 rounded text-[11px] flex items-center gap-1.5 transition-colors ${
              isDesktopBgActive
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
            }`}
            title="切换桌面壁纸预览背景，方便查看透明阅读模式效果"
          >
            <Monitor className="w-3 h-3" />
            <span className="hidden md:inline">
              {isDesktopBgActive ? '桌面壁纸: 已开启' : '桌面壁纸: 纯净'}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
