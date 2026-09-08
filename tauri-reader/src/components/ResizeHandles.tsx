import React from 'react';

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface ResizeHandlesProps {
  onResizeStart: (direction: ResizeDirection, e: React.MouseEvent) => void;
  isTransparentMode?: boolean;
  showCornerGrip?: boolean;
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({
  onResizeStart,
  isTransparentMode = false,
  showCornerGrip = true,
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-visible">
      {/* 4 Edges with generous grab area */}
      {/* Top Edge */}
      <div
        onMouseDown={(e) => onResizeStart('n', e)}
        className="pointer-events-auto absolute top-0 left-3 right-3 h-2.5 -translate-y-1.5 cursor-ns-resize hover:bg-blue-500/20 transition-colors select-none"
        title="拖动调整高度"
      />
      {/* Bottom Edge */}
      <div
        onMouseDown={(e) => onResizeStart('s', e)}
        className="pointer-events-auto absolute bottom-0 left-3 right-3 h-2.5 translate-y-1.5 cursor-ns-resize hover:bg-blue-500/20 transition-colors select-none"
        title="拖动调整高度"
      />
      {/* Left Edge */}
      <div
        onMouseDown={(e) => onResizeStart('w', e)}
        className="pointer-events-auto absolute left-0 top-3 bottom-3 w-2.5 -translate-x-1.5 cursor-ew-resize hover:bg-blue-500/20 transition-colors select-none"
        title="拖动调整宽度"
      />
      {/* Right Edge */}
      <div
        onMouseDown={(e) => onResizeStart('e', e)}
        className="pointer-events-auto absolute right-0 top-3 bottom-3 w-2.5 translate-x-1.5 cursor-ew-resize hover:bg-blue-500/20 transition-colors select-none"
        title="拖动调整宽度"
      />

      {/* 4 Corners */}
      {/* Top-Left Corner */}
      <div
        onMouseDown={(e) => onResizeStart('nw', e)}
        className="pointer-events-auto absolute -top-2 -left-2 w-5 h-5 cursor-nwse-resize select-none"
        title="拖动调整尺寸"
      />
      {/* Top-Right Corner */}
      <div
        onMouseDown={(e) => onResizeStart('ne', e)}
        className="pointer-events-auto absolute -top-2 -right-2 w-5 h-5 cursor-nesw-resize select-none"
        title="拖动调整尺寸"
      />
      {/* Bottom-Left Corner */}
      <div
        onMouseDown={(e) => onResizeStart('sw', e)}
        className="pointer-events-auto absolute -bottom-2 -left-2 w-5 h-5 cursor-nesw-resize select-none"
        title="拖动调整尺寸"
      />
      {/* Bottom-Right Corner (with visual grip indicator only when border is visible) */}
      <div
        onMouseDown={(e) => onResizeStart('se', e)}
        className="pointer-events-auto absolute -bottom-2 -right-2 w-5 h-5 cursor-nwse-resize select-none flex items-end justify-end p-1 group"
        title="拖动调整尺寸"
      >
        {showCornerGrip && (
          <svg
            className={`w-2.5 h-2.5 transition-colors ${
              isTransparentMode
                ? 'text-zinc-400/60 group-hover:text-zinc-700'
                : 'text-zinc-400 group-hover:text-zinc-700'
            }`}
            viewBox="0 0 10 10"
            fill="currentColor"
          >
            <path d="M8 2L2 8M9 5L5 9M9 8L8 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </div>
  );
};
