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
    <div id="recent-files-page" className="p-5 md:p-6 space-y-5 max-w-4xl mx-auto w-full">
      {/* 1. Single Sleek Importer */}
      <section id="importer-section">
        <DocumentImporter onDocumentImported={onDocumentImported} />
      </section>

      {/* 2. Documents List */}
      <section id="recent-documents-section" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-700">最近打开的文件</h3>
          <span className="text-[11px] text-zinc-400">共 {documents.length} 篇</span>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-zinc-200 bg-white">
            <FileQuestion className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
            <p className="text-xs text-zinc-500">
              暂无阅读历史，请在上方导入本地的 TXT 或 PDF 文件开始阅读。
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const isPdf = doc.type === 'pdf';
              return (
                <div
                  key={doc.id}
                  id={`recent-doc-card-${doc.id}`}
                  onClick={() => onOpenDocument(doc)}
                  className="group p-3 rounded-lg bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 uppercase ${
                        isPdf ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {doc.type}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h4
                        className="text-xs font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors truncate"
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

                  {/* Progress & Read Action */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-28 text-right hidden sm:block">
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
                      className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>阅读</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => onDeleteDocument(doc.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-rose-600 rounded transition-all"
                      title="从列表中移除"
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
    </div>
  );
};
