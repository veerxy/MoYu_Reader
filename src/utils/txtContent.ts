import { OutlineItem, parseTxtParagraphs } from './outline';
import { extractTxtHeadingsFromParagraphs } from './txtHeading';

export interface PreparedTxtContent {
  /** 正文渲染段落；目录和正文共用这一份结果，避免大 TXT 重复扫描 */
  paragraphs: ReturnType<typeof parseTxtParagraphs>;
  /** 阅读页左侧目录 */
  outlineItems: OutlineItem[];
  /** 需要按标题样式渲染的段落序号 */
  chapterTitleIndexes: Set<number>;
}

/**
 * 一次性准备 TXT 的正文、目录和标题样式索引。
 *
 * 为什么集中在这里处理：目录提取需要全文上下文，正文渲染也需要同样的段落序号。
 * 如果各自解析一次，大文件进入阅读页时会重复扫描三遍，放大窗口切换时的卡顿。
 */
export function prepareTxtContent(content: string): PreparedTxtContent {
  const paragraphs = parseTxtParagraphs(content);
  const headings = extractTxtHeadingsFromParagraphs(paragraphs);

  const outlineItems = headings.map((heading, outlineIndex) => ({
    id: `txt-outline-${outlineIndex}`,
    title: heading.title,
    level: heading.level,
    paragraphIndex: heading.paragraphIndex,
  }));

  const chapterTitleIndexes = new Set(
    headings.map((heading) => heading.paragraphIndex),
  );

  return { paragraphs, outlineItems, chapterTitleIndexes };
}
