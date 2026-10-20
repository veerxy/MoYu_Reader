import type { TxtParagraph } from './outline';

export const TXT_VIRTUAL_CHUNK_SIZE = 200;
export const TXT_VIRTUAL_OBSERVER_MARGIN = 1200;

export interface TxtVirtualChunk {
  /** 分块内第一个段落的渲染序号 */
  startIndex: number;
  paragraphs: TxtParagraph[];
}

interface TxtLayoutLikeSettings {
  fontSize: number;
  lineHeight: number;
}

/**
 * 按固定段落数量切分 TXT。
 *
 * 使用“块”而不是“单个段落”作为虚拟化单位，可以让 5 万段文本只创建
 * 数百个占位容器；真正靠近视口的块再渲染 200 个段落，避免首次进入阅读页
 * 一次性提交几万个 DOM 节点。
 */
export function createTxtChunks(
  paragraphs: TxtParagraph[],
  chunkSize = TXT_VIRTUAL_CHUNK_SIZE,
): TxtVirtualChunk[] {
  const safeChunkSize = Math.max(1, Math.floor(chunkSize));
  const chunks: TxtVirtualChunk[] = [];

  for (let startIndex = 0; startIndex < paragraphs.length; startIndex += safeChunkSize) {
    chunks.push({
      startIndex,
      paragraphs: paragraphs.slice(startIndex, startIndex + safeChunkSize),
    });
  }

  return chunks;
}

/** 根据渲染段落序号找到它所属的虚拟化分块。 */
export function getTxtChunkIndexForParagraph(
  paragraphIndex: number,
  chunkSize = TXT_VIRTUAL_CHUNK_SIZE,
): number {
  if (!Number.isFinite(paragraphIndex) || paragraphIndex < 0) return 0;
  return Math.floor(paragraphIndex / Math.max(1, Math.floor(chunkSize)));
}

/**
 * 估算一段文字的显示宽度。
 *
 * 这里不需要像素级精确，只用于未渲染分块的滚动占位高度；
 * 中文按一个字号宽度估算，英文/数字按约 0.55 个字号宽度估算。
 */
function estimateTextDisplayWidth(text: string, fontSize: number): number {
  let width = 0;

  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x20) {
      width += fontSize * 0.28;
    } else if (code < 0x80) {
      width += fontSize * 0.55;
    } else if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3000 && code <= 0x303f) ||
      (code >= 0xff00 && code <= 0xffef)
    ) {
      width += fontSize;
    } else {
      width += fontSize * 0.7;
    }
  }

  return width;
}

/**
 * 估算一个分块未渲染前需要占用的滚动高度。
 *
 * 未渲染分块必须有占位高度，否则滚动条和进度会消失；占位高度只需接近真实值，
 * 分块真正渲染后交给浏览器使用真实高度，IntersectionObserver 再逐步替换附近块。
 */
export function estimateTxtChunkHeight(
  chunk: TxtVirtualChunk,
  chapterTitleIndexes: ReadonlySet<number>,
  settings: TxtLayoutLikeSettings,
  contentWidth: number,
): number {
  const safeContentWidth = Math.max(160, contentWidth);
  const paragraphGap = 16;
  let height = 0;

  for (const paragraph of chunk.paragraphs) {
    const isChapterTitle = chapterTitleIndexes.has(paragraph.index);
    const fontSize = isChapterTitle ? 18 : settings.fontSize;
    const lineHeightPx = isChapterTitle ? 28 : fontSize * settings.lineHeight;
    const textWidth =
      estimateTextDisplayWidth(paragraph.text, fontSize) + (isChapterTitle ? 0 : fontSize * 2);
    const lineCount = Math.max(1, Math.ceil(textWidth / safeContentWidth));

    height += lineCount * lineHeightPx + (isChapterTitle ? 24 + 8 : 0) + paragraphGap;
  }

  return Math.max(paragraphGap, Math.ceil(height));
}
