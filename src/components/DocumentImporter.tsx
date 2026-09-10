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
        onClick={handleTriggerFileSelect}
        className={`group relative transition-all duration-200 rounded-2xl border-2 border-dashed p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50/60 scale-[0.99]'
            : 'border-zinc-200/90 hover:border-zinc-400/90 bg-white/70 hover:bg-white shadow-2xs hover:shadow-xs'
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 group-hover:bg-zinc-900 flex items-center justify-center text-zinc-600 group-hover:text-white transition-all duration-200 shadow-xs mb-3">
          <Upload className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
        </div>

        <div className="space-y-1">
          <div className="text-sm font-semibold text-zinc-900 flex items-center justify-center gap-2">
            <span>点击浏览 或 拖拽文档到此处</span>
          </div>
          <p className="text-xs text-zinc-400 font-normal">
            自动识别编码，流畅解析 <span className="font-medium text-zinc-700">TXT 小说</span> 与 <span className="font-medium text-zinc-700">PDF 文档</span>
          </p>
        </div>

        {isProcessing && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs rounded-2xl flex items-center justify-center gap-2.5 text-xs text-zinc-800 font-medium z-10">
            <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            <span>正在解析并载入文档...</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div
          id="import-error-banner"
          className="mt-2.5 flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-fadeIn"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          id="import-success-banner"
          className="mt-2.5 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs animate-fadeIn"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};
