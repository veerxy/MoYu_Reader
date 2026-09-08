import React from 'react';
import { BookOpen, Maximize2, X, Play } from 'lucide-react';
import { DocumentItem } from '../types';

interface MinimizedWidgetProps {
  document: DocumentItem;
  onRestore: () => void;
  onClose: () => void;
}

export const MinimizedWidget: React.FC<MinimizedWidgetProps> = ({
  document,
  onRestore,
  onClose,
}) => {
  return (
    <div
      id="desktop-minimized-widget"
      onClick={onRestore}
      className="fixed bottom-6 right-6 z-50 bg-zinc-900/95 text-white border border-zinc-700/80 shadow-2xl rounded-2xl p-3.5 flex items-center gap-3.5 backdrop-blur-md cursor-pointer hover:border-zinc-500 hover:scale-[1.02] transition-all animate-bounce-short group"
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
          document.type === 'pdf' ? 'bg-rose-500' : 'bg-blue-600'
        }`}
      >
        {document.type === 'pdf' ? 'PDF' : 'TXT'}
      </div>

      <div className="max-w-[200px]">
        <div className="text-xs font-semibold text-zinc-100 truncate" title={document.name}>
          {document.name}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="w-16 bg-zinc-700 rounded-full h-1 overflow-hidden">
            <div
              className={`h-full ${document.type === 'pdf' ? 'bg-rose-400' : 'bg-blue-400'}`}
              style={{ width: `${Math.max(5, document.progress)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-zinc-400">{document.progress}%</span>
        </div>
      </div>

      <div className="flex items-center gap-1 border-l border-zinc-700 pl-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRestore();
          }}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors"
          title="还原阅读窗口"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
          title="关闭"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
