export type DocumentType = 'txt' | 'pdf';

export type BackgroundColorType = 'transparent' | 'dark' | 'white' | 'book' | string;

export interface DocumentItem {
  id: string;
  name: string;
  size: number;
  type: DocumentType;
  lastOpened: number; // timestamp
  progress: number; // 0 - 100 percentage
  currentPage?: number; // For PDF
  totalPages?: number; // For PDF
  scrollTop?: number; // For TXT
  scrollPercent?: number; // For TXT
  content?: string; // Text content for txt
  pdfDataUrl?: string; // Data URL or object URL for PDF
  pdfArrayBuffer?: ArrayBuffer; // In-memory buffer if needed
}

export interface ReaderSettings {
  fontSize: number; // px, e.g. 16
  lineHeight: number; // multiplier, e.g. 1.8
  fontColor: string; // hex, default #111827
  customFontColor?: string;
  bgColor: BackgroundColorType; // 'transparent' | 'dark' | 'white' | 'book'
  fontFamily: string;
  textAlign: 'left' | 'justify';
}

export interface WindowState {
  isReading: boolean;
  isMinimized: boolean;
  isToolbarVisible: boolean; // Default false in reading mode per prompt requirement
  isSettingsOpen: boolean;
  activeDocId: string | null;
}
