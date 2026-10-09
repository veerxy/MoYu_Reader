/**
 * TXT 章节标题解析器。
 *
 * 设计目标不是针对某一种写法逐条补规则，而是把识别过程拆成固定的流水线：
 * 清理 → 去装饰 → 规范化 → 识别结构 → 计算置信度 → 结合上下文过滤。
 * 这样后续遇到新的排版风格时，只需要调整对应阶段，而不是在目录提取里继续堆正则。
 */

export type TxtHeadingConfidence = 'high' | 'medium';

export interface TxtHeadingInfo {
  /** 清理装饰符、页码和正文前缀后用于展示的标题 */
  title: string;
  /** 卷/部/篇为 0，章/回等为 1，节/幕/场等为 2 */
  level: number;
  /** high 表示单行结构已足够可信；medium 需要结合上下文确认 */
  confidence: TxtHeadingConfidence;
  /** 结构化排序值；纯数字目录、中文章、英文章都能归一到同一数值 */
  order: number | null;
  /** 结构键用于去重和识别“目录页 + 正文重复标题” */
  key: string;
}

export interface TxtHeading extends TxtHeadingInfo {
  /** 对应渲染后的段落序号，和 TxtReader 的 data-toc-index 保持一致 */
  paragraphIndex: number;
  /** 是否已经挂在卷/章等父级结构下，用于区分正文重复章和前置目录页 */
  hasParentContext?: boolean;
}

const MAX_TITLE_LENGTH = 80;

const CHINESE_DIGIT_VALUES: Record<string, number> = {
  〇: 0,
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const CHINESE_UNIT_VALUES: Record<string, number> = {
  十: 10,
  百: 100,
  千: 1000,
  万: 10000,
};

const ENGLISH_NUMBER_VALUES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};

const ENGLISH_NUMBER_SOURCE = Object.keys(ENGLISH_NUMBER_VALUES)
  .sort((a, b) => b.length - a.length)
  .join('|');

const CHINESE_NUMBER_SOURCE = String.raw`[0-9〇零一二两三四五六七八九十百千万]+`;

const CHINESE_UNIT_LEVELS: Record<string, number> = {
  卷: 0,
  部: 0,
  篇: 0,
  章: 1,
  回: 1,
  集: 1,
  话: 1,
  讲: 1,
  课: 1,
  节: 2,
  幕: 2,
  场: 2,
  单元: 2,
};

const ENGLISH_UNIT_LEVELS: Record<string, number> = {
  part: 0,
  volume: 0,
  chapter: 1,
  ch: 1,
  lesson: 1,
  section: 2,
  unit: 2,
  act: 2,
  scene: 2,
};

const SPECIAL_HEADINGS: Array<[string, number]> = [
  ['序章', 1],
  ['序言', 1],
  ['前言', 1],
  ['楔子', 1],
  ['引子', 1],
  ['尾声', 1],
  ['后记', 1],
  ['终章', 1],
  ['最终章', 1],
  ['大结局', 1],
  ['完结', 1],
  ['番外', 1],
  ['外传', 1],
  ['序', 1],
  ['prologue', 1],
  ['preface', 1],
  ['foreword', 1],
  ['epilogue', 1],
  ['afterword', 1],
  ['introduction', 1],
];

const DECORATIVE_START = /^[=～~*_＿·•\-—－]{2,}/;
const DECORATIVE_END = /[=～~*_＿·•\-—－]{2,}$/;
const MARKDOWN_PREFIX = /^#{1,6}\s*/;
const CONTENT_PREFIX = /^(?:正文|章节)[\s:：]*/;
const TOC_PAGE_NUMBER = /\s*[.．·•。…]{2,}\s*\d{1,4}$/;
// 纯数字章节常见三种写法：1. 标题、1、标题、1 标题。
// 必须有标题且保持 medium 置信度，后续再要求连续递增，避免把正文里的普通数字行误认为章节。
const NUMERIC_HEADING_PATTERN = /^(\d+)(?:\s*[.、:：\-—–]\s*|\s+)(\S.{0,79})$/;

const CHINESE_HEADING_PATTERN = new RegExp(
  String.raw`^第\s*(${CHINESE_NUMBER_SOURCE})\s*(单元|卷|部|篇|章|回|集|话|讲|课|节|幕|场)` +
    String.raw`(?:$|(?:\s*([:：、,，/|｜\-—–])\s*|\s+)(\S.{0,79})$)`,
);

const ENGLISH_NUMBER_TOKEN = new RegExp(
  String.raw`(?:\d+|[IVXLCDM]+|(?:${ENGLISH_NUMBER_SOURCE})(?:\s+(?:${ENGLISH_NUMBER_SOURCE})){0,2})`,
  'i',
);

const ENGLISH_HEADING_PATTERN = new RegExp(
  String.raw`^(chapter|ch\.?|part|volume|section|unit|lesson|act|scene)\s*` +
    String.raw`(${ENGLISH_NUMBER_TOKEN.source})\s*` +
    String.raw`(?:$|(?:\s*([:：\-—–,，/|｜])\s*|\s+)(\S.{0,79})$)`,
  'i',
);

// 强包裹符本身说明这一行大概率是标题，可用于提升纯数字标题的置信度。
const STRONG_TITLE_WRAPPER_PATTERN =
  /^(?:#{1,6}\s|[=～~*_＿·•\-—－]{2,}[\s\S]*[=～~*_＿·•\-—－]{2,}|[【［\[（(《「『“][\s\S]*[】］\]）)》」』”])$/;

function hasStrongTitleWrapper(text: string): boolean {
  return STRONG_TITLE_WRAPPER_PATTERN.test(normalizeWidthCharacters(text.trim()));
}

function normalizeWidthCharacters(text: string): string {
  // TXT 来源常混有全角数字、字母和空格；解析层统一成半角，展示时也保持一致，避免目录键不稳定。
  return text
    .replace(/[\uFF10-\uFF19]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/[\uFF21-\uFF3A]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/[\uFF41-\uFF5A]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/＃/g, '#')
    .replace(/＝/g, '=')
    .replace(/－/g, '-')
    .replace(/．/g, '.')
    .replace(/[\u3000\t]/g, ' ');
}

function stripDecorations(text: string): string {
  let current = text;
  let previous = '';

  // 装饰符可能成对出现，也可能只有一侧；循环处理能兼容 ### ===第一章=== 这类叠加排版。
  while (current !== previous) {
    previous = current;
    current = current
      .replace(DECORATIVE_START, '')
      .replace(DECORATIVE_END, '')
      .trim();
  }

  return current;
}

const INLINE_BRACKET_PATTERNS = [
  /【\s*([^【】]*?)\s*】/g,
  /［\s*([^［］]*?)\s*］/g,
  /\[\s*([^\[\]]*?)\s*\]/g,
  /（\s*([^（）]*?)\s*）/g,
  /\(\s*([^()]*?)\s*\)/g,
  /《\s*([^《》]*?)\s*》/g,
  /「\s*([^「」]*?)\s*」/g,
  /『\s*([^『』]*?)\s*』/g,
  /“\s*([^“”]*?)\s*”/g,
];

function removeInlineBrackets(text: string): string {
  let result = text;

  // 括号既可能包住整行，也可能只包住“第1章”或标题本身。
  // 两侧都补空格可以同时处理【第1章】起点和第1章【起点】，后续再统一压缩空白。
  for (const pattern of INLINE_BRACKET_PATTERNS) {
    result = result.replace(pattern, (_match, inner: string) => ` ${inner} `);
  }

  return result.trim();
}

function cleanTxtHeadingText(text: string): string {
  let cleaned = normalizeWidthCharacters(text.trim());
  cleaned = cleaned.replace(MARKDOWN_PREFIX, '');
  cleaned = stripDecorations(cleaned);
  cleaned = removeInlineBrackets(cleaned);
  cleaned = stripDecorations(cleaned);
  cleaned = cleaned.replace(CONTENT_PREFIX, '');
  // 只在存在点引符时去掉页码，避免把“第12章 房间12”这种正常标题误删。
  cleaned = cleaned.replace(TOC_PAGE_NUMBER, '');
  return cleaned.replace(/\s+/g, ' ').trim();
}

function parseChineseNumber(text: string): number | null {
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);

  let total = 0;
  let section = 0;
  let current = 0;
  let hasValue = false;

  for (const char of text) {
    const digit = CHINESE_DIGIT_VALUES[char];
    if (digit !== undefined) {
      // “一二三”这类连续写法按普通数字处理；“两千零一”依赖单位归组。
      current = CHINESE_DIGIT_VALUES['零'] === digit && !hasValue ? 0 : current * 10 + digit;
      hasValue = true;
      continue;
    }

    const unit = CHINESE_UNIT_VALUES[char];
    if (unit === undefined) return null;

    if (unit === 10000) {
      // “一百万”需要把前面累计的百位一起放大，而不是简单加一万。
      section = (section + current) * unit;
      total += section;
      section = 0;
      current = 0;
      continue;
    }

    section += (current || 1) * unit;
    current = 0;
  }

  const result = total + section + current;
  return Number.isFinite(result) ? result : null;
}

function parseRomanNumber(text: string): number | null {
  if (!/^[IVXLCDM]+$/i.test(text)) return null;

  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;

  for (let i = 0; i < text.length; i += 1) {
    const current = values[text[i].toUpperCase()] ?? 0;
    const next = values[text[i + 1]?.toUpperCase()] ?? 0;
    total += current < next ? -current : current;
  }

  return total > 0 ? total : null;
}

function parseEnglishNumber(text: string): number | null {
  const words = text.trim().toLowerCase().split(/\s+/);
  if (words.some((word) => ENGLISH_NUMBER_VALUES[word] === undefined)) return null;

  let total = 0;
  for (const word of words) {
    const value = ENGLISH_NUMBER_VALUES[word];
    // hundred 是乘法位，其他数字词按加法位处理，可覆盖 One、Twenty One、One Hundred。
    total = value === 100 ? (total || 1) * 100 : total + value;
  }

  return total;
}

function isValidSubtitle(rest: string): boolean {
  return rest.length > 0 && rest.length <= MAX_TITLE_LENGTH;
}

function parseChineseHeading(text: string): TxtHeadingInfo | null {
  const match = CHINESE_HEADING_PATTERN.exec(text);
  if (!match) return null;

  const [, numberText, unit, , subtitle] = match;
  // 有副标题时必须存在分隔符或空白；“第一章里面的内容”这种正文句子因此不会被误判。
  if (subtitle !== undefined && !isValidSubtitle(subtitle)) return null;

  const order = parseChineseNumber(numberText);
  return {
    title: text,
    level: CHINESE_UNIT_LEVELS[unit],
    confidence: 'high',
    order,
    key: `zh:${unit}:${order ?? numberText}`,
  };
}

function parseSpecialHeading(text: string): TxtHeadingInfo | null {
  const lowerText = text.toLowerCase();

  for (const [name, level] of SPECIAL_HEADINGS) {
    if (!lowerText.startsWith(name.toLowerCase())) continue;

    const rest = text.slice(name.length);
    if (rest.length === 0) {
      return { title: text, level, confidence: 'high', order: null, key: `special:${name}` };
    }

    // 支持“番外一 小明的假期”这类数字后缀；数字后仍需空白或分隔符，避免“后记的内容”误判。
    const numberPrefix = new RegExp(`^(${CHINESE_NUMBER_SOURCE})(?=\\s|$)`).exec(rest);
    if (numberPrefix) {
      const numberText = numberPrefix[1];
      const afterNumber = rest.slice(numberText.length);
      if (afterNumber.length === 0 || /^[\s:：、,，/|｜\-—–]/.test(afterNumber)) {
        const order = parseChineseNumber(numberText);
        return {
          title: text,
          level,
          confidence: 'high',
          order,
          key: `special:${name}:${order ?? numberText}`,
        };
      }
    }

    if (/^[\s:：、,，/|｜\-—–]/.test(rest) && isValidSubtitle(rest.replace(/^[\s:：、,，/|｜\-—–]\s*/, ''))) {
      return { title: text, level, confidence: 'high', order: null, key: `special:${name}` };
    }
  }

  return null;
}

function parseEnglishHeading(text: string): TxtHeadingInfo | null {
  const match = ENGLISH_HEADING_PATTERN.exec(text);
  if (!match) return null;

  const [, unitSource, numberSource, , subtitle] = match;
  if (subtitle !== undefined && !isValidSubtitle(subtitle)) return null;

  const unit = unitSource.replace(/\.$/, '').toLowerCase();
  const order = /^\d+$/.test(numberSource)
    ? Number.parseInt(numberSource, 10)
    : /^[IVXLCDM]+$/i.test(numberSource)
      ? parseRomanNumber(numberSource)
      : parseEnglishNumber(numberSource);

  return {
    title: text,
    level: ENGLISH_UNIT_LEVELS[unit],
    confidence: 'high',
    order,
    key: `en:${unit}:${order ?? numberSource.toLowerCase()}`,
  };
}

function parseNumericListHeading(text: string): TxtHeadingInfo | null {
  const match = NUMERIC_HEADING_PATTERN.exec(text);
  if (!match) return null;

  const order = Number.parseInt(match[1], 10);
  return {
    title: text,
    level: 0,
    confidence: 'medium',
    order,
    key: `number-list:${order}`,
  };
}

/**
 * 解析单行 TXT 标题。
 *
 * medium 只代表“可能是编号目录”，是否最终采纳需要 extractTxtHeadings 结合上下文确认；
 * 这样能避免把普通说明里的“1. xxx”误认为章节。
 */
export function parseTxtHeading(text: string): TxtHeadingInfo | null {
  const cleaned = cleanTxtHeadingText(text);
  if (!cleaned || cleaned.length > MAX_TITLE_LENGTH) return null;

  const heading =
    parseChineseHeading(cleaned) ??
    parseSpecialHeading(cleaned) ??
    parseEnglishHeading(cleaned) ??
    parseNumericListHeading(cleaned);

  // 裸数字标题必须靠全文连续编号确认；但 ===113 标题===、# 113 标题
  // 这类强包裹已经提供了排版证据，可以单独提升为高置信度。
  if (heading?.confidence === 'medium' && hasStrongTitleWrapper(text)) {
    return { ...heading, confidence: 'high' };
  }

  return heading;
}

/** 单行结构级标题判断；编号目录是否有效依赖上下文，因此这里只接受 high 置信度。 */
export function isTxtChapterTitle(text: string): boolean {
  return parseTxtHeading(text)?.confidence === 'high';
}

/** 返回清理后的标题；不是标题时保持原文，便于调用方继续使用原始文本。 */
export function normalizeTxtChapterTitle(text: string): string {
  return parseTxtHeading(text)?.title ?? text;
}

function parseRenderedParagraphs(content: string): Array<{ text: string; index: number }> {
  if (!content) return [];

  let index = 0;
  const result: Array<{ text: string; index: number }> = [];

  for (const line of content.split(/\r?\n/)) {
    const text = line.trim();
    if (!text) continue;

    result.push({ text, index });
    index += 1;
  }

  return result;
}

function isConsecutiveMediumRun(run: TxtHeading[], heading: TxtHeading): boolean {
  const last = run[run.length - 1];
  if (!last || last.order === null || heading.order === null) return false;

  // 编号递增且段落距离较近，才认为是目录/章节编号，而不是散落在正文中的普通序号。
  return heading.order === last.order + 1 && heading.paragraphIndex - last.paragraphIndex <= 3;
}

function collectAcceptedHeadings(candidates: TxtHeading[]): TxtHeading[] {
  const accepted = candidates.filter((heading) => heading.confidence === 'high');
  const mediumCandidates = candidates.filter((heading) => heading.confidence === 'medium');
  let run: TxtHeading[] = [];

  const flushRun = () => {
    // 连续 3 条以上才采纳，单条“1. 我们先做三件事”不会进入目录。
    if (run.length >= 3) accepted.push(...run);
    run = [];
  };

  for (const heading of mediumCandidates) {
    if (isConsecutiveMediumRun(run, heading)) {
      run.push(heading);
    } else {
      flushRun();
      run = [heading];
    }
  }
  flushRun();

  return accepted.sort((a, b) => a.paragraphIndex - b.paragraphIndex);
}

/**
 * 为章节结构补充父级上下文。
 *
 * 小说常见“第一卷第一章 / 第二卷第一章”这种每卷重新编号的写法。
 * 如果只用“章 + 编号”作为键，第二卷第一章会覆盖第一卷第一章；
 * 因此在全文顺序下记录最近的卷、章，并把它们拼进结构键。
 */
function applyStructuralContext(headings: TxtHeading[]): TxtHeading[] {
  let volumeKey: string | null = null;
  let chapterKey: string | null = null;

  return headings.map((heading) => {
    let key = heading.key;
    let hasParentContext = false;

    if (heading.level === 0) {
      // 新的卷/部/篇出现后，低层级上下文必须重置，避免上一卷的章污染下一卷。
      volumeKey = heading.key;
      chapterKey = null;
    } else if (heading.level === 1) {
      if (volumeKey) {
        key = `${volumeKey}>${heading.key}`;
        hasParentContext = true;
      }
      chapterKey = heading.key;
    } else if (heading.level === 2) {
      const parents = [volumeKey, chapterKey].filter((parent): parent is string => parent !== null);
      if (parents.length > 0) {
        key = `${parents.join('>')}>${heading.key}`;
        hasParentContext = true;
      }
    }

    return { ...heading, key, hasParentContext };
  });
}

/**
 * 去掉文档开头目录页里的重复标题。
 *
 * 上下文键加入卷信息后，目录页中的“第一章”和正文“第一卷 > 第一章”键可能不同。
 * 因此先用“清理后标题”识别开头重复项，再用结构键处理普通重复；
 * 已挂在卷/章结构下的第一次出现视为正文标题，避免误删分卷中的真实重复章。
 */
function removeLeadingTocEntries(headings: TxtHeading[], totalParagraphs: number): TxtHeading[] {
  const byTitle = new Map<string, TxtHeading[]>();
  for (const heading of headings) {
    const group = byTitle.get(heading.title) ?? [];
    group.push(heading);
    byTitle.set(heading.title, group);
  }

  const duplicateGroups = [...byTitle.values()].filter((group) => group.length >= 2);
  const tocEntryIndexes = new Set<number>();

  if (duplicateGroups.length >= 2) {
    const firstHeadings = duplicateGroups.map((group) => group[0]);
    const firstIndexes = firstHeadings.map((heading) => heading.paragraphIndex);
    const laterIndexes = duplicateGroups.flatMap((group) =>
      group.slice(1).map((heading) => heading.paragraphIndex),
    );
    const firstSpan = Math.max(...firstIndexes) - Math.min(...firstIndexes);

    // 分卷正文的重复章已经带有父级上下文；带上下文的第一次出现不能当成目录页条目删除。
    if (firstHeadings.some((heading) => heading.hasParentContext)) {
      return headings;
    }

    // 目录页的重复条目通常是一段连续候选行，并且所有正文标题都出现在这段之后。
    // 用“无父级上下文 + 连续 + 后续全部在后”三个条件，可以整体跳过长目录页。
    if (firstSpan <= duplicateGroups.length + 1 && Math.min(...laterIndexes) > Math.max(...firstIndexes)) {
      for (const index of firstIndexes) {
        tocEntryIndexes.add(index);
      }
      return headings.filter((heading) => !tocEntryIndexes.has(heading.paragraphIndex));
    }

    return headings;
  }

  // 只有一个重复标题时缺少集群特征，退化为“开头 + 明显靠后的第二次出现”判断。
  const tocBoundary = Math.max(20, Math.floor(totalParagraphs * 0.2));
  for (const group of duplicateGroups) {
    const first = group[0];
    const second = group[1];
    const looksLikeTocPair =
      first.key === second.key || (!first.hasParentContext && second.hasParentContext);

    if (looksLikeTocPair && first.paragraphIndex < tocBoundary && second.paragraphIndex > first.paragraphIndex + 1) {
      tocEntryIndexes.add(first.paragraphIndex);
    }
  }

  return headings.filter((heading) => !tocEntryIndexes.has(heading.paragraphIndex));
}

/**
 * 从全文提取 TXT 目录。
 *
 * 这里必须基于全文而不是逐行独立判断，原因有三个：
 * 1. “1. xxx”必须看到连续编号才能确认；
 * 2. 卷内章节编号可能重新从第一章开始，需要父级上下文区分；
 * 3. 文档开头可能自带目录页，需要优先保留正文位置。
 */
export function extractTxtHeadings(content: string): TxtHeading[] {
  const paragraphs = parseRenderedParagraphs(content);
  const candidates = paragraphs
    .map((paragraph) => {
      const heading = parseTxtHeading(paragraph.text);
      return heading ? { ...heading, paragraphIndex: paragraph.index } : null;
    })
    .filter((heading): heading is TxtHeading => heading !== null);

  const accepted = applyStructuralContext(collectAcceptedHeadings(candidates));
  const withoutTocPage = removeLeadingTocEntries(accepted, paragraphs.length);
  const byKey = new Map<string, TxtHeading>();

  // 同一结构键后出现的位置通常是正文；保留后一次可跳过目录页或重复声明。
  for (const heading of withoutTocPage) {
    byKey.set(heading.key, heading);
  }

  return [...byKey.values()].sort((a, b) => a.paragraphIndex - b.paragraphIndex);
}
