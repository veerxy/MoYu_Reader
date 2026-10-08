import React from 'react';
import { ListTree } from 'lucide-react';
import { OutlineItem } from '../types';

interface OutlinePanelProps {
  items: OutlineItem[];
  width: number;
  isDarkBackground: boolean;
  onNavigate: (item: OutlineItem) => void;
}

export const OutlinePanel: React.FC<OutlinePanelProps> = ({
  items,
  width,
  isDarkBackground,
  onNavigate,
}) => {
  const panelClass = isDarkBackground
    ? 'bg-zinc-900/95 text-zinc-100 border-zinc-700/80'
    : 'bg-white/90 text-zinc-800 border-zinc-200';
  const headerClass = isDarkBackground ? 'border-zinc-700/80' : 'border-zinc-200';
  const itemClass = isDarkBackground
    ? 'hover:bg-white/10 focus:ring-white/40'
    : 'hover:bg-zinc-900/10 focus:ring-zinc-500/70';

  return (
    <aside
      id="reader-outline-panel"
      style={{ width: `${width}px` }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={`h-full shrink-0 flex flex-col border-r backdrop-blur-md ${panelClass}`}
    >
      <div className={`h-10 shrink-0 flex items-center gap-2 px-3 border-b ${headerClass}`}>
        <ListTree className="w-3.5 h-3.5 opacity-70" />
        <span className="text-xs font-semibold">文档目录</span>
      </div>

      {/* overflow-auto 同时承接纵向与横向滚动；长标题保持单行，方便完整拖动查看。 */}
      <div className="flex-1 min-h-0 overflow-auto px-2 py-2">
        {items.length > 0 ? (
          <nav aria-label="文档目录" className="min-w-max">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.title}
                aria-label={`跳转到 ${item.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(item);
                }}
                className={`w-full max-w-none text-left whitespace-nowrap px-2 py-1.5 rounded-lg text-xs focus:outline-hidden focus:ring-2 transition-colors ${itemClass}`}
                style={{ paddingLeft: `${8 + item.level * 12}px` }}
              >
                <span className="block max-w-none">{item.title}</span>
              </button>
            ))}
          </nav>
        ) : (
          <div className="px-3 py-10 text-center text-xs opacity-60">未识别到目录</div>
        )}
      </div>
    </aside>
  );
};
