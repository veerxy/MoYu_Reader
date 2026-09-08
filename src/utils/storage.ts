import { DocumentItem, ReaderSettings } from '../types';

const DB_NAME = 'DesktopDocReaderDB';
const DB_VERSION = 1;
const DOCS_STORE = 'documents';
const SETTINGS_KEY = 'desktop_doc_reader_settings';

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
};

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
        // Sort descending by lastOpened
        docs.sort((a, b) => b.lastOpened - a.lastOpened);
        resolve(docs);
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

      request.onsuccess = () => resolve();
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
    const doc = await getDocumentById(id);
    if (!doc) return;

    doc.progress = Math.min(100, Math.max(0, Math.round(progress)));
    doc.lastOpened = Date.now();
    if (extra?.currentPage !== undefined) doc.currentPage = extra.currentPage;
    if (extra?.totalPages !== undefined) doc.totalPages = extra.totalPages;
    if (extra?.scrollTop !== undefined) doc.scrollTop = extra.scrollTop;
    if (extra?.scrollPercent !== undefined) doc.scrollPercent = extra.scrollPercent;

    await saveDocument(doc);
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

      request.onsuccess = () => resolve();
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
