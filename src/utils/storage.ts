import { DocumentItem, ReaderSettings } from '../types';
import { DEFAULT_TOC_WIDTH } from './outline';

const DB_NAME = 'DesktopDocReaderDB';
const DB_VERSION = 1;
const DOCS_STORE = 'documents';
const SETTINGS_KEY = 'desktop_doc_reader_settings';
const DOCUMENT_META_KEY = 'desktop_doc_reader_meta';

// Default reader settings per requirement 2.1 & 2.2:
// - Default font color: Black
// - Default reading mode background: Transparent
// - Font size, line spacing presets
export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 16,
  lineHeight: 1.8,
  fontColor: '#111827', // Black
  bgColor: 'transparent', // Reading mode default transparent
  fontFamily: 'system-ui, -apple-system, sans-serif',
  textAlign: 'left',
  showTableOfContents: false, // 默认关闭，保持老用户原有极简阅读体验
  tocWidth: DEFAULT_TOC_WIDTH,
};

/** 只保存阅读进度和打开时间等轻量字段，绝不包含文档正文或 PDF 二进制。 */
type DocumentMetadata = {
  lastOpened: number;
  progress: number;
  currentPage?: number;
  totalPages?: number;
  scrollTop?: number;
  scrollPercent?: number;
};

function readDocumentMetaMap(): Record<string, DocumentMetadata> {
  try {
    const saved = localStorage.getItem(DOCUMENT_META_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.warn('Failed to load document metadata', e);
    return {};
  }
}

function writeDocumentMetaMap(map: Record<string, DocumentMetadata>): void {
  try {
    localStorage.setItem(DOCUMENT_META_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Failed to save document metadata', e);
  }
}

/** 将轻量元数据覆盖到 IndexedDB 中的完整文档上，避免每次打开/滚动都重写大文件。 */
export function applyDocumentMeta(doc: DocumentItem): DocumentItem {
  const meta = readDocumentMetaMap()[doc.id];
  if (!meta) return doc;
  return { ...doc, ...meta, id: doc.id };
}

/** 更新文档元数据覆盖层；大文件内容仍留在 IndexedDB，不参与本次写入。 */
export function upsertDocumentMeta(doc: DocumentItem): void {
  const map = readDocumentMetaMap();
  const previous = map[doc.id] ?? {
    lastOpened: doc.lastOpened,
    progress: doc.progress,
  };

  const next: DocumentMetadata = {
    ...previous,
    lastOpened: doc.lastOpened,
    progress: doc.progress,
  };
  if (doc.currentPage !== undefined) next.currentPage = doc.currentPage;
  if (doc.totalPages !== undefined) next.totalPages = doc.totalPages;
  if (doc.scrollTop !== undefined) next.scrollTop = doc.scrollTop;
  if (doc.scrollPercent !== undefined) next.scrollPercent = doc.scrollPercent;

  map[doc.id] = next;
  writeDocumentMetaMap(map);
}

export function removeDocumentMeta(id: string): void {
  const map = readDocumentMetaMap();
  if (!map[id]) return;
  delete map[id];
  writeDocumentMetaMap(map);
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DOCS_STORE)) {
        const store = db.createObjectStore(DOCS_STORE, { keyPath: 'id' });
        store.createIndex('lastOpened', 'lastOpened', { unique: false });
      }
    };
  });
}

export async function getAllDocuments(): Promise<DocumentItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DOCS_STORE, 'readonly');
      const store = tx.objectStore(DOCS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const docs = (request.result as DocumentItem[]) || [];
        // 元数据覆盖层只存轻量字段；避免打开文档时为更新时间而重写整个大文件。
        const mergedDocs = docs.map(applyDocumentMeta);
        mergedDocs.sort((a, b) => b.lastOpened - a.lastOpened);
        resolve(mergedDocs);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to load from IndexedDB, falling back to localStorage', err);
    const local = localStorage.getItem('desktop_docs_backup');
    return local ? JSON.parse(local) : [];
  }
}

export async function getDocumentById(id: string): Promise<DocumentItem | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DOCS_STORE, 'readonly');
      const store = tx.objectStore(DOCS_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve((request.result as DocumentItem) || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to get doc by ID from IndexedDB', err);
    return null;
  }
}

export async function saveDocument(doc: DocumentItem): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DOCS_STORE, 'readwrite');
      const store = tx.objectStore(DOCS_STORE);
      const request = store.put(doc);

      request.onsuccess = () => {
        // 正文只在导入时写一次；这里同步轻量元数据，后续打开/更新进度不再克隆大对象。
        upsertDocumentMeta(doc);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to save doc to IndexedDB', err);
  }
}

export async function updateDocumentProgress(
  id: string,
  progress: number,
  extra?: { currentPage?: number; totalPages?: number; scrollTop?: number; scrollPercent?: number }
): Promise<void> {
  try {
    // 阅读进度只写轻量元数据，避免每次滚动后克隆并重写完整 TXT/PDF 内容。
    upsertDocumentMeta({
      id,
      name: '',
      size: 0,
      type: 'txt',
      lastOpened: Date.now(),
      progress: Math.min(100, Math.max(0, Math.round(progress))),
      ...(extra ?? {}),
    });
  } catch (err) {
    console.warn('Failed to update doc progress', err);
  }
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DOCS_STORE, 'readwrite');
      const store = tx.objectStore(DOCS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        removeDocumentMeta(id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to delete doc', err);
  }
}

export function loadSettings(): ReaderSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: ReaderSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings', e);
  }
}
