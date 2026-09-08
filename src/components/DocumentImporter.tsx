import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { DocumentItem } from '../types';
import { saveDocument } from '../utils/storage';

interface DocumentImporterProps {
  onDocumentImported: (doc: DocumentItem) => void;
  className?: string;
}

export const DocumentImporter: React.FC<DocumentImporterProps> = ({
  onDocumentImported,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const name = file.name;
    const ext = name.split('.').pop()?.toLowerCase();

    if (ext !== 'txt' && ext !== 'pdf') {
      setErrorMessage(`暂不支持 .${ext || '未知'} 格式，目前仅支持 .txt 与 .pdf 文档`);
      return;
    }

    setIsProcessing(true);

    try {
      const id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

      if (ext === 'txt') {
        // Support both UTF-8 and GBK / GB2312 Chinese encodings
        const buffer = await file.arrayBuffer();
        let text = '';
        try {
          // Attempt UTF-8 with fatal error detection
          const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
          text = utf8Decoder.decode(buffer);
        } catch {
          // Fall back to GBK / GB18030 for Chinese txt novels
          try {
            const gbkDecoder = new TextDecoder('gb18030');
            text = gbkDecoder.decode(buffer);
          } catch {
            const fallbackDecoder = new TextDecoder('utf-8');
            text = fallbackDecoder.decode(buffer);
          }
        }

        const newDoc: DocumentItem = {
          id,
          name,
          size: file.size,
          type: 'txt',
          lastOpened: Date.now(),
          progress: 0,
          scrollTop: 0,
          scrollPercent: 0,
          content: text,
        };

        await saveDocument(newDoc);
        setSuccessMessage(`成功导入文本文档 "${name}"`);
        onDocumentImported(newDoc);
      } else if (ext === 'pdf') {
        const buffer = await file.arrayBuffer();

        const newDoc: DocumentItem = {
          id,
          name,
          size: file.size,
          type: 'pdf',
          lastOpened: Date.now(),
          progress: 0,
          currentPage: 1,
          totalPages: 1,
          pdfArrayBuffer: buffer,
        };

        await saveDocument(newDoc);
        setSuccessMessage(`成功导入 PDF 文档 "${name}"`);
        onDocumentImported(newDoc);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '文件解析失败';
      setErrorMessage(`导入失败: ${msg}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
      // reset so same file can be selected again if needed
      e.target.value = '';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".txt,.pdf"
        className="hidden"
        id="file-importer-input"
      />

      <div
        id="drop-zone-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer transition-all duration-200 rounded-xl border-2 border-dashed p-7 flex flex-col items-center justify-center text-center group ${
          isDragging
            ? 'border-blue-500 bg-blue-50/60 scale-[1.005]'
            : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50/80 hover:bg-zinc-100/70'
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-zinc-200 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
          <Upload className={`w-6 h-6 ${isDragging ? 'text-blue-600' : 'text-zinc-600'}`} />
        </div>

        <h3 className="text-base font-semibold text-zinc-900 mb-1 flex items-center gap-1.5">
          <span>导入本地文档进行阅读</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200/80 text-zinc-700 font-normal">
            支持 TXT / PDF
          </span>
        </h3>

        <p className="text-sm text-zinc-500 max-w-md">
          点击或直接将本地文档拖拽至此处，系统将自动解析排版并记录您的专属阅读进度
        </p>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>选择本地文件</span>
          </button>
        </div>

        {isProcessing && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs rounded-xl flex items-center justify-center gap-2 text-sm text-zinc-700 font-medium">
            <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            <span>正在解析并加载文档内容...</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div
          id="import-error-banner"
          className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm animate-fadeIn"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          id="import-success-banner"
          className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm animate-fadeIn"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};
