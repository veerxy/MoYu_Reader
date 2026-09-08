import React from 'react';
import {
  BookOpen,
  FileText,
  Clock,
  Upload,
  Trash2,
  ChevronRight,
  Sparkles,
  Layers,
  FolderOpen,
} from 'lucide-react';
import { DocumentItem } from '../types';

interface SidebarProps {
  documents: DocumentItem[];
  activeDocId: string | null;
  onSelectDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string, e: React.MouseEvent) => void;
  onOpenImporter: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  documents,
  activeDocId,
  onSelectDocument,
  onDeleteDocument,
  onOpenImporter,
  className = '',
}) => {
  const formatTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} 小时前`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} 天前`;
  };

  return (
    <aside
      id="desktop-sidebar"
      className={`w-64 sm:w-72 bg-zinc-900 text-zinc-200 flex flex-col h-full shrink-0 border-r border-zinc-800 select-none ${className}`}
    >
      {/* App Brand Header */}
      <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-300">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-medium tracking-tight text-zinc-200">文档阅读器</h2>
        </div>

        <button
          type="button"
          onClick={onOpenImporter}
          title="导入本地文档 (.txt / .pdf)"
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Upload className="w-4 h-4" />
        </button>
      </div>

      {/* Recent Files Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        <div className="px-2 py-1 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>最近打开</span>
          <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-400">
            {documents.length}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">
            <Layers className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p>暂无打开记录</p>
            <p className="text-[10px] mt-1 text-zinc-600">点击上方按钮导入文档</p>
          </div>
        ) : (
          documents.map((doc) => {
            const isActive = activeDocId === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className={`group relative flex flex-col p-2.5 rounded-lg cursor-pointer transition-all ${
                  isActive
                    ? 'bg-zinc-800/90 text-white ring-1 ring-white/10'
                    : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase ${
                        doc.type === 'pdf'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {doc.type}
                    </span>
                    <span className="text-xs font-medium truncate" title={doc.name}>
                      {doc.name}
                    </span>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => onDeleteDocument(doc.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-zinc-500 transition-opacity rounded"
                    title="从列表中移除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Reading Progress Indicator */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span>进度:</span>
                    <span className="font-mono text-zinc-200">{doc.progress}%</span>
                  </span>
                  <span className="text-[10px] text-zinc-500">{formatTime(doc.lastOpened)}</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-800 rounded-full h-1 mt-1 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      doc.type === 'pdf' ? 'bg-rose-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.max(3, doc.progress)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
        <span>按 Tab 键显隐工具栏</span>
        <span className="font-mono text-[10px] text-zinc-600">v1.0.0</span>
      </div>
    </aside>
  );
};
