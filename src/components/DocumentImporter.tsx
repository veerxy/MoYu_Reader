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

  const handleTriggerFileSelect = () => {
    fileInputRef.current?.click();
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
        className={`relative transition-all duration-200 rounded-xl border border-dashed p-4 flex items-center justify-between gap-4 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-zinc-300 hover:border-zinc-400 bg-white shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 shrink-0">
            <Upload className={`w-4 h-4 ${isDragging ? 'text-blue-600' : 'text-zinc-600'}`} />
          </div>
          <div className="text-xs text-zinc-600 truncate">
            拖拽本地 <span className="font-medium text-zinc-900">TXT</span> 或{' '}
            <span className="font-medium text-zinc-900">PDF</span> 文档到此处，或点击右侧选择
          </div>
        </div>

        <button
          type="button"
          onClick={handleTriggerFileSelect}
          className="px-3.5 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors shrink-0 cursor-pointer"
        >
          选择本地文件
        </button>

        {isProcessing && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs rounded-xl flex items-center justify-center gap-2 text-xs text-zinc-700 font-medium">
            <div className="w-3.5 h-3.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            <span>正在解析并加载文档内容...</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div
          id="import-error-banner"
          className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-fadeIn"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          id="import-success-banner"
          className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs animate-fadeIn"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};
