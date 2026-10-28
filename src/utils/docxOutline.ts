import { OutlineItem } from './outline';

function decodeHtmlText(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * 从 DOCX HTML 中提取标题目录。
 *
 * mammoth 会把 Word 的 Heading 1-6 转成 h1-h6；
 * paragraphIndex 这里表示“第几个标题”，阅读器用它定位对应标题元素。
 * 该逻辑不依赖 mammoth，避免阅读页为了目录把解析器一并打进主包。
 */
export function extractDocxOutlineFromHtml(html: string): OutlineItem[] {
  const headingPattern = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const items: OutlineItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingPattern.exec(html)) !== null) {
    const title = decodeHtmlText(match[2].replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();

    if (!title) continue;

    items.push({
      id: `docx-outline-${items.length}`,
      title,
      level: Number(match[1]) - 1,
      paragraphIndex: items.length,
    });
  }

  return items;
}
