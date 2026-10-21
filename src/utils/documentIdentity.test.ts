import test from 'node:test';
import assert from 'node:assert/strict';
import type { DocumentItem } from '../types';
import { dedupeDocuments, findExistingDocumentForFile, getObsoleteDuplicateDocumentIds } from './documentIdentity';

function createDoc(overrides: Partial<DocumentItem> & Pick<DocumentItem, 'id' | 'name' | 'size' | 'type' | 'lastOpened'>): DocumentItem {
  return {
    progress: 0,
    ...overrides,
  } as DocumentItem;
}

test('再次导入同一 TXT 会匹配历史书库中的最新记录', () => {
  const oldDoc = createDoc({
    id: 'old',
    name: '同一本书.txt',
    size: 1024,
    type: 'txt',
    lastOpened: 100,
    progress: 20,
  });
  const latestDoc = createDoc({
    id: 'latest',
    name: '同一本书.txt',
    size: 1024,
    type: 'txt',
    lastOpened: 200,
    progress: 80,
  });

  const found = findExistingDocumentForFile({
    documents: [oldDoc, latestDoc],
    fileName: '同一本书.txt',
    fileSize: 1024,
    documentType: 'txt',
    fileLastModified: 123456,
  });

  assert.equal(found?.id, 'latest');
});

test('文件大小或文档类型不同时不认为是同一文档', () => {
  const doc = createDoc({
    id: 'doc',
    name: '同名文档.txt',
    size: 1024,
    type: 'txt',
    lastOpened: 100,
  });

  assert.equal(
    findExistingDocumentForFile({
      documents: [doc],
      fileName: '同名文档.txt',
      fileSize: 2048,
      documentType: 'txt',
      fileLastModified: 123456,
    }),
    null
  );
  assert.equal(
    findExistingDocumentForFile({
      documents: [doc],
      fileName: '同名文档.txt',
      fileSize: 1024,
      documentType: 'pdf',
      fileLastModified: 123456,
    }),
    null
  );
});

test('已有修改时间的历史记录必须与文件修改时间一致', () => {
  const doc = createDoc({
    id: 'doc',
    name: '修改后的文档.txt',
    size: 1024,
    type: 'txt',
    lastOpened: 100,
    sourceLastModified: 111,
  });

  assert.equal(
    findExistingDocumentForFile({
      documents: [doc],
      fileName: '修改后的文档.txt',
      fileSize: 1024,
      documentType: 'txt',
      fileLastModified: 222,
    }),
    null
  );
});

test('老历史记录没有修改时间时按名称大小兜底匹配', () => {
  const doc = createDoc({
    id: 'legacy',
    name: '老记录.txt',
    size: 1024,
    type: 'txt',
    lastOpened: 100,
  });

  const found = findExistingDocumentForFile({
    documents: [doc],
    fileName: '老记录.txt',
    fileSize: 1024,
    documentType: 'txt',
    fileLastModified: 222,
  });

  assert.equal(found?.id, 'legacy');
});

test('书库去重会直接保留最近打开的一条记录并按时间排序', () => {
  const other = createDoc({
    id: 'other',
    name: '其他文档.pdf',
    size: 2048,
    type: 'pdf',
    lastOpened: 500,
  });
  const oldDuplicate = createDoc({
    id: 'old-duplicate',
    name: '同一本书.txt',
    size: 1024,
    type: 'txt',
    lastOpened: 100,
    progress: 20,
  });
  const latestDuplicate = createDoc({
    id: 'latest-duplicate',
    name: '同一本书.txt',
    size: 1024,
    type: 'txt',
    lastOpened: 300,
    progress: 80,
  });

  const result = dedupeDocuments([oldDuplicate, other, latestDuplicate]);

  assert.deepEqual(result.map((doc) => doc.id), ['other', 'latest-duplicate']);
});
test('书库清理会返回需要删除的重复记录 ID', () => {
  const oldDuplicate = createDoc({
    id: 'old-duplicate',
    name: '同一本书.txt',
    size: 1024,
    type: 'txt',
    lastOpened: 100,
  });
  const latestDuplicate = createDoc({
    id: 'latest-duplicate',
    name: '同一本书.txt',
    size: 1024,
    type: 'txt',
    lastOpened: 300,
  });
  const other = createDoc({
    id: 'other',
    name: '其他文档.pdf',
    size: 2048,
    type: 'pdf',
    lastOpened: 200,
  });

  assert.deepEqual(getObsoleteDuplicateDocumentIds([oldDuplicate, latestDuplicate, other]), ['old-duplicate']);
});


test('源文件修改时间不同的同名同大小文档不会被误删', () => {
  const oldVersion = createDoc({
    id: 'old-version',
    name: '同名同大小.txt',
    size: 1024,
    type: 'txt',
    lastOpened: 100,
    sourceLastModified: 111,
  });
  const newVersion = createDoc({
    id: 'new-version',
    name: '同名同大小.txt',
    size: 1024,
    type: 'txt',
    lastOpened: 200,
    sourceLastModified: 222,
  });

  const result = dedupeDocuments([oldVersion, newVersion]);

  assert.equal(result.length, 2);
});
