import React, { useState } from 'react';
import {
  BookOpen,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  History,
  FolderOpen,
  Sparkles,
  FileText,
  Clock,
  Compass,
  ArrowUpRight,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { DocumentImporter } from './DocumentImporter';

interface RecentFileListProps {
  documents: DocumentItem[];
  onOpenDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string, e: React.MouseEvent) => void;
  onDocumentImported: (doc: DocumentItem) => void;
}

export const RecentFileList: React.FC<RecentFileListProps> = ({
  documents,
  onOpenDocument,
  onDeleteDocument,
  onDocumentImported,
}) => {
  // 历史阅读记录折叠状态
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date
      .getHours()
      .toString()
      .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 上次阅读的文档
  const lastReadDoc = documents.length > 0 ? documents[0] : null;
  // 历史文档（排除当前这篇）
  const historyDocs = documents.length > 1 ? documents.slice(1) : [];

  return (
    <div
      id="recent-files-page"
      className="p-6 md:p-10 max-w-3xl mx-auto w-full space-y-7 flex flex-col justify-center min-h-full"
    >
      {/* 顶部标题与极简桌面应用标识 */}
      <div className="flex items-center justify-between pb-1 border-b border-zinc-200/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 tracking-tight">文档工作台</h1>
            <p className="text-[11px] text-zinc-400">极简离线阅读 • 专注隐蔽摸鱼</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200/60">
            {documents.length} 篇本地书库
          </span>
        </div>
      </div>

      {/* 1. 主题区域一：导入文档区域 (强化桌面质感，可直接拖入或点击) */}
      <section id="importer-section" className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
            <span>打开本地文档</span>
          </span>
          <span className="text-[11px] text-zinc-400">支持拖入 TXT、PDF</span>
        </div>
        <DocumentImporter onDocumentImported={onDocumentImported} />
      </section>

      {/* 2. 主题区域二：上次阅读 (核心主体，强化视觉焦点与一键直达) */}
      {lastReadDoc ? (
        <section id="last-read-section" className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>上次阅读</span>
            </span>
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-300" />
              <span>{formatDate(lastReadDoc.lastOpened)}</span>
            </span>
          </div>

          <div
            id={`last-read-card-${lastReadDoc.id}`}
            onClick={() => onOpenDocument(lastReadDoc)}
            className="group relative p-5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-400/80 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Type Badge */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-2xs ${
                  lastReadDoc.type === 'pdf'
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}
              >
                {lastReadDoc.type.toUpperCase()}
              </div>

              {/* Title & Progress info */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3
                    className="text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors truncate"
                    title={lastReadDoc.name}
                  >
                    {lastReadDoc.name}
                  </h3>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span>{formatFileSize(lastReadDoc.size)}</span>
                  <span>•</span>
                  <span className="text-zinc-600 font-medium">
                    {lastReadDoc.type === 'pdf' && lastReadDoc.totalPages
                      ? `第 ${lastReadDoc.currentPage || 1} / ${lastReadDoc.totalPages} 页`
                      : `进度 ${lastReadDoc.progress}%`}
                  </span>
                </div>

                {/* Micro progress bar */}
                <div className="w-full max-w-xs bg-zinc-100 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      lastReadDoc.type === 'pdf' ? 'bg-rose-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.max(4, lastReadDoc.progress)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
              <button
                type="button"
                onClick={() => onOpenDocument(lastReadDoc)}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs hover:shadow-sm transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>继续阅读</span>
              </button>

              <button
                type="button"
                onClick={(e) => onDeleteDocument(lastReadDoc.id, e)}
                className="opacity-60 group-hover:opacity-100 p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="从书库移除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* 3. 历史阅读记录：默认折叠，不打扰主视觉，需要时展开 */}
      {historyDocs.length > 0 && (
        <section id="history-documents-section" className="pt-2 border-t border-zinc-200/60">
          <div
            onClick={() => setShowHistory((prev) => !prev)}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-200/50 cursor-pointer transition-colors select-none"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-700">
              <History className="w-3.5 h-3.5 text-zinc-500" />
              <span>历史书库记录</span>
              <span className="text-[11px] text-zinc-400 font-normal">
                ({historyDocs.length} 篇)
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              <span>{showHistory ? '收起历史' : '展开查看'}</span>
              {showHistory ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </div>
          </div>

          {/* 展开列表 */}
          {showHistory && (
            <div className="space-y-2 mt-2.5 animate-fadeIn">
              {historyDocs.map((doc) => {
                const isPdf = doc.type === 'pdf';

                return (
                  <div
                    key={doc.id}
                    id={`history-doc-card-${doc.id}`}
                    onClick={() => onOpenDocument(doc)}
                    className="group p-3 rounded-xl bg-white border border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                          isPdf ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {doc.type}
                      </span>

                      <div className="min-w-0 flex-1">
                        <h4
                          className="text-xs font-medium text-zinc-900 group-hover:text-blue-600 transition-colors truncate"
                          title={doc.name}
                        >
                          {doc.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span>{formatFileSize(doc.size)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.lastOpened)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-20 text-right hidden sm:block">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-zinc-400">进度</span>
                          <span className="font-mono text-zinc-700 font-medium">
                            {doc.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isPdf ? 'bg-rose-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.max(3, doc.progress)}%` }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-900 text-zinc-700 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>阅读</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => onDeleteDocument(doc.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                        title="移除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
