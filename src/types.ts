import type { OutlineItem } from './utils/outline';

export type { OutlineItem };

export type DocumentType = 'txt' | 'pdf' | 'docx';

export type BackgroundColorType = 'transparent' | 'dark' | 'white' | 'book' | string;

export interface DocumentItem {
  id: string;
  name: string;
  size: number;
  type: DocumentType;
  lastOpened: number; // timestamp
  sourceLastModified?: number; // 源文件修改时间，用于识别再次导入的同一文档
  progress: number; // 0 - 100 percentage
  currentPage?: number; // For PDF
  totalPages?: number; // For PDF
  scrollTop?: number; // For TXT
  scrollPercent?: number; // For TXT
  content?: string; // Text content for txt
  pdfDataUrl?: string; // Data URL or object URL for PDF
  pdfArrayBuffer?: ArrayBuffer; // In-memory buffer if needed
  docxHtml?: string; // DOCX 转换后的 HTML，导入时保存，历史记录可离线打开
}

export interface ReaderSettings {
  fontSize: number; // px, e.g. 16
  lineHeight: number; // multiplier, e.g. 1.8
  fontColor: string; // hex, default #111827
  customFontColor?: string;
  bgColor: BackgroundColorType; // 'transparent' | 'dark' | 'white' | 'book'
  fontFamily: string;
  textAlign: 'left' | 'justify';
  // 目录是全局阅读偏好；关闭时不改变原有极简单栏阅读布局。
  showTableOfContents: boolean;
  // 记录用户拖动后的目录宽度，避免每次进入阅读页都重置。
  tocWidth: number;
}

export interface WindowState {
  isReading: boolean;
  isMinimized: boolean;
  isToolbarVisible: boolean; // Default false in reading mode per prompt requirement
  isSettingsOpen: boolean;
  activeDocId: string | null;
}
