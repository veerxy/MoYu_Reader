import type { DocumentItem, DocumentType } from '../types';

/** 生成文档的基础身份：老数据没有修改时间，只能依赖类型、名称和大小做稳定识别。 */
function getBaseDocumentIdentity(input: {
  name: string;
  size: number;
  type: DocumentType;
}): string {
  // Windows 文件名不区分大小写，名称两侧空格也不应影响同一文件识别。
  return `${input.type}\0${input.name.trim().toLowerCase()}\0${input.size}`;
}

/**
 * 查找再次导入文件对应的历史记录。
 *
 * 匹配规则：
 * 1. 类型、文件名、大小必须一致。
 * 2. 历史记录保存了文件修改时间时，修改时间也必须一致，避免同名同大小但内容已变化被误合并。
 * 3. 老记录没有修改时间时按基础身份兜底，保证升级后仍能复用历史进度。
 */
export function findExistingDocumentForFile(params: {
  documents: DocumentItem[];
  fileName: string;
  fileSize: number;
  documentType: DocumentType;
  fileLastModified?: number;
}): DocumentItem | null {
  const fileIdentity = getBaseDocumentIdentity({
    name: params.fileName,
    size: params.fileSize,
    type: params.documentType,
  });

  const matches = params.documents.filter((doc) => {
    if (getBaseDocumentIdentity(doc) !== fileIdentity) return false;
    if (doc.sourceLastModified === undefined) return true;
    return doc.sourceLastModified === params.fileLastModified;
  });

  if (matches.length === 0) return null;

  // 可能存在历史重复数据；默认使用最近打开的一条，和首页“上次阅读”的语义一致。
  return matches.reduce((latest, doc) => (doc.lastOpened > latest.lastOpened ? doc : latest));
}

/** 计算需要物理删除的重复记录，保证书库数据本身也不重复。 */
export function getObsoleteDuplicateDocumentIds(documents: DocumentItem[]): string[] {
  const keptIds = new Set(dedupeDocuments(documents).map((doc) => doc.id));
  return documents.filter((doc) => !keptIds.has(doc.id)).map((doc) => doc.id);
}

/**
 * 书库展示和持久化清理共用的去重规则。
 *
 * 身份设计：
 * 1. 老数据缺少源文件修改时间，只能在同一基础身份内保留最近一条。
 * 2. 新数据保存了修改时间；同名同大小但修改时间不同，可能代表内容已变化，不能误删。
 * 3. 如果同一基础身份内已有新版本，老记录会归入最近的新版本，用于清理历史重复数据。
 */
export function dedupeDocuments(documents: DocumentItem[]): DocumentItem[] {
  const groupsByBase = new Map<string, DocumentItem[]>();
  for (const doc of documents) {
    const base = getBaseDocumentIdentity(doc);
    const group = groupsByBase.get(base) ?? [];
    group.push(doc);
    groupsByBase.set(base, group);
  }

  const latestByIdentity = new Map<string, DocumentItem>();
  for (const [base, group] of groupsByBase) {
    const versionedDocs = group.filter((doc) => doc.sourceLastModified !== undefined);
    const fallbackModified = versionedDocs.length
      ? versionedDocs.reduce((latest, doc) =>
          doc.lastOpened > latest.lastOpened ? doc : latest
        ).sourceLastModified
      : undefined;

    for (const doc of group) {
      // 老记录优先归入当前基础身份下最近的新版本，避免升级后遗留重复数据。
      const modified = doc.sourceLastModified ?? fallbackModified ?? 'legacy';
      const identity = `${base}\0${modified}`;
      const current = latestByIdentity.get(identity);
      if (!current || doc.lastOpened > current.lastOpened) {
        latestByIdentity.set(identity, doc);
      }
    }
  }

  return Array.from(latestByIdentity.values()).sort((a, b) => b.lastOpened - a.lastOpened);
}
