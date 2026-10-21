import test from 'node:test';
import assert from 'node:assert/strict';
import type { DocumentItem } from '../types';
import {
  applyDocumentMeta,
  removeDocumentMeta,
  upsertDocumentMeta,
} from './storage';

/** 测试用的极简 localStorage，避免单测依赖浏览器环境。 */
function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    get raw() {
      return store;
    },
  };
}

function setLocalStorage(storage: ReturnType<typeof createFakeLocalStorage>) {
  (globalThis as any).localStorage = storage;
}

test('文档元数据更新不会保存大文件内容', () => {
  const storage = createFakeLocalStorage();
  setLocalStorage(storage);
  const doc: DocumentItem = {
    id: 'doc-large',
    name: 'large.txt',
    size: 10 * 1024 * 1024,
    type: 'txt',
    lastOpened: 123,
    progress: 32,
    scrollTop: 456,
    scrollPercent: 32.5,
    content: 'large-content-that-must-not-be-written',
  };

  upsertDocumentMeta(doc);

  const saved = storage.raw.get('desktop_doc_reader_meta') ?? '';
  assert.ok(saved.includes('"lastOpened":123'));
  assert.ok(!saved.includes('large-content-that-must-not-be-written'));
  assert.ok(!saved.includes('"content"'));
});

test('读取文档时会应用轻量元数据覆盖层', () => {
  const storage = createFakeLocalStorage();
  setLocalStorage(storage);
  upsertDocumentMeta({
    id: 'doc-large',
    name: 'large.txt',
    size: 1,
    type: 'txt',
    lastOpened: 456,
    progress: 78,
    scrollTop: 999,
    scrollPercent: 78.4,
  });

  const storedDoc: DocumentItem = {
    id: 'doc-large',
    name: 'large.txt',
    size: 1,
    type: 'txt',
    lastOpened: 123,
    progress: 10,
    content: 'old content',
  };

  const merged = applyDocumentMeta(storedDoc);
  assert.equal(merged.lastOpened, 456);
  assert.equal(merged.progress, 78);
  assert.equal(merged.scrollTop, 999);
  assert.equal(merged.scrollPercent, 78.4);
  assert.equal(merged.content, 'old content');
});

test('删除文档时会同步清理元数据覆盖层', () => {
  const storage = createFakeLocalStorage();
  setLocalStorage(storage);
  upsertDocumentMeta({
    id: 'doc-delete',
    name: 'delete.txt',
    size: 1,
    type: 'txt',
    lastOpened: 1,
    progress: 0,
  });

  removeDocumentMeta('doc-delete');

  const merged = applyDocumentMeta({
    id: 'doc-delete',
    name: 'delete.txt',
    size: 1,
    type: 'txt',
    lastOpened: 1,
    progress: 0,
  });
  assert.equal(merged.lastOpened, 1);
  assert.equal(merged.progress, 0);
});
test('文档元数据会保存源文件修改时间', () => {
  const storage = createFakeLocalStorage();
  setLocalStorage(storage);
  upsertDocumentMeta({
    id: 'doc-modified',
    name: 'modified.txt',
    size: 1,
    type: 'txt',
    lastOpened: 789,
    progress: 10,
    sourceLastModified: 123456,
  });

  const merged = applyDocumentMeta({
    id: 'doc-modified',
    name: 'modified.txt',
    size: 1,
    type: 'txt',
    lastOpened: 1,
    progress: 0,
  });
  assert.equal(merged.sourceLastModified, 123456);
});
