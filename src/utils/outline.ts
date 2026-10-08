export interface OutlineItem {
  id: string;
  title: string;
  level: number;
  /** TXT 目录目标：对应渲染后的段落序号，避免原始空行影响定位 */
  paragraphIndex?: number;
  /** PDF 目录目标：1 基页码，便于直接复用现有分页跳转逻辑 */
  page?: number;
}

export interface TxtParagraph {
  text: string;
  index: number;
}

export interface PdfOutlineInput {
  title?: unknown;
  dest?: unknown;
  url?: unknown;
  items?: PdfOutlineInput[];
}

export const MIN_TOC_WIDTH = 180;
export const MAX_TOC_WIDTH = 480;
export const DEFAULT_TOC_WIDTH = 260;

// 目录标题需要“独立成行且较短”，避免把正文中包含“章”的句子误判为章节。
const TXT_TITLE_PATTERN =
  /^(?:第\s*[0-9一二三四五六七八九十百千万零〇两]+\s*[章节卷回篇部]\s*.*|Chapter\s+\d+\b.*|序章|楔子|尾声|后记|番外(?:\s*.*)?)$/i;

// 部分小说使用 ===第二十七章 标题=== 作为章节分隔，目录中只保留实际标题。
const TXT_WRAPPED_TITLE_PATTERN = /^[=＝]{2,}\s*(.*?)\s*[=＝]{2,}$/;

export function parseTxtParagraphs(content: string): TxtParagraph[] {
  if (!content) return [];

  return content
    .split(/\r?\n/)
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    .map((text, index) => ({ text, index }));
}

export function normalizeTxtChapterTitle(text: string): string {
  const wrapped = TXT_WRAPPED_TITLE_PATTERN.exec(text);
  return wrapped ? wrapped[1] : text;
}

export function isTxtChapterTitle(text: string): boolean {
  const title = normalizeTxtChapterTitle(text);
  return title.length <= 80 && TXT_TITLE_PATTERN.test(title);
}

export function extractTxtOutline(content: string): OutlineItem[] {
  return parseTxtParagraphs(content)
    .filter((paragraph) => isTxtChapterTitle(paragraph.text))
    .map((paragraph, outlineIndex) => ({
      id: `txt-outline-${outlineIndex}`,
      title: normalizeTxtChapterTitle(paragraph.text),
      level: 0,
      paragraphIndex: paragraph.index,
    }));
}

export async function flattenPdfOutline(
  outline: PdfOutlineInput[],
  resolvePage: (dest: unknown) => Promise<number | null>,
): Promise<OutlineItem[]> {
  const result: OutlineItem[] = [];

  async function walk(items: PdfOutlineInput[], level: number): Promise<void> {
    for (const item of items) {
      // 外部链接不是文档内页目标，但其子目录仍可能指向文内页码，因此继续递归。
      if (item.url) {
        await walk(item.items ?? [], level);
        continue;
      }

      const page = await resolvePage(item.dest);
      if (page !== null && Number.isFinite(page) && page > 0) {
        const title =
          typeof item.title === 'string' && item.title.trim().length > 0
            ? item.title.trim()
            : '未命名目录';

        result.push({
          id: `pdf-outline-${result.length}`,
          title,
          level,
          page: Math.floor(page),
        });
      }

      await walk(item.items ?? [], level + 1);
    }
  }

  await walk(outline, 0);
  return result;
}

export function createPageOutline(totalPages: number): OutlineItem[] {
  const count = Math.max(0, Math.floor(totalPages));
  return Array.from({ length: count }, (_, index) => ({
    id: `pdf-page-${index + 1}`,
    title: `第 ${index + 1} 页`,
    level: 0,
    page: index + 1,
  }));
}

export function clampTocWidth(width: number): number {
  if (!Number.isFinite(width)) return DEFAULT_TOC_WIDTH;
  return Math.min(MAX_TOC_WIDTH, Math.max(MIN_TOC_WIDTH, Math.round(width)));
}
