import React from 'react';
import {
  BookOpen,
  FileText,
  Clock,
  Play,
  Trash2,
  Calendar,
  Sparkles,
  ArrowRight,
  HardDrive,
  FileQuestion,
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
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const mostRecentDoc = documents.length > 0 ? documents[0] : null;

  return (
    <div id="recent-files-page" className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto w-full">
      {/* Top Banner / Most Recent Hero */}
      {mostRecentDoc && (
        <div
          id="continue-reading-hero"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 text-white p-6 sm:p-7 shadow-xl border border-zinc-800"
        >
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  上次阅读记录
                </span>
                <span className="text-xs text-zinc-400">
                  {formatDate(mostRecentDoc.lastOpened)}
                </span>
              </div>

              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="truncate">{mostRecentDoc.name}</span>
              </h2>

              <div className="flex items-center gap-4 text-xs text-zinc-300 pt-1">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-zinc-400">当前进度:</span>
                  <span className="text-emerald-400 font-bold">{mostRecentDoc.progress}%</span>
                </div>
                {mostRecentDoc.type === 'pdf' && mostRecentDoc.totalPages && (
                  <span className="text-zinc-400">
                    第 {mostRecentDoc.currentPage || 1} / {mostRecentDoc.totalPages} 页
                  </span>
                )}
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-400">{formatFileSize(mostRecentDoc.size)}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-700/60 rounded-full h-1.5 mt-3 max-w-md overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, mostRecentDoc.progress)}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              id="hero-continue-btn"
              onClick={() => onOpenDocument(mostRecentDoc)}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20 shrink-0 group cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>继续阅读</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Local Document Importer Area */}
      <section id="importer-section" className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
          <span>导入文档</span>
          <span className="text-xs font-normal text-zinc-400">选择或拖拽本地 TXT / PDF 文件</span>
        </h3>
        <DocumentImporter onDocumentImported={onDocumentImported} />
      </section>

      {/* Recent Files Section */}
      <section id="recent-documents-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">最近打开的文件列表</h3>
            <p className="text-xs text-zinc-500">
              点击文件即可继续阅读，进度自动保存；支持通过左侧栏或此处快捷切换
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-full">
            共 {documents.length} 篇文档
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-zinc-200 bg-white">
            <FileQuestion className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
            <h4 className="text-sm font-medium text-zinc-700">暂无阅读历史</h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              请使用上方导入区上传本地的 TXT 或 PDF 文本，开始您的舒适阅读之旅。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {documents.map((doc) => {
              const isPdf = doc.type === 'pdf';
              return (
                <div
                  key={doc.id}
                  id={`recent-doc-card-${doc.id}`}
                  onClick={() => onOpenDocument(doc)}
                  className="group relative p-4 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isPdf ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {isPdf ? 'PDF' : 'TXT'}
                      </div>

                      <div className="min-w-0">
                        <h4
                          className="text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors truncate"
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

                    <button
                      type="button"
                      onClick={(e) => onDeleteDocument(doc.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="从最近列表中删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Progress info and button */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-500 text-[11px]">阅读进度</span>
                        <span className="font-mono font-semibold text-zinc-700 text-xs">
                          {doc.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isPdf ? 'bg-rose-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.max(3, doc.progress)}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenDocument(doc)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1 transition-colors shrink-0"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>继续阅读</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
