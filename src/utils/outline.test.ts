import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampTocWidth,
  createPageOutline,
  extractTxtOutline,
  flattenPdfOutline,
  parseTxtParagraphs,
} from './outline';

test('TXT 段落解析保留有效文本及其渲染序号', () => {
  const content = [
    '第一章 起点',
    '',
    '正文内容',
    'Chapter 1 Intro',
    '   ',
    '尾声',
  ].join('\n');

  assert.deepEqual(parseTxtParagraphs(content), [
    { text: '第一章 起点', index: 0 },
    { text: '正文内容', index: 1 },
    { text: 'Chapter 1 Intro', index: 2 },
    { text: '尾声', index: 3 },
  ]);
});

test('TXT 目录提取支持中文章节、英文 Chapter 和特殊章节', () => {
  const content = [
    '第一章 起点',
    '正文',
    'Chapter 1 Intro',
    '正文',
    '第12节 分节',
    '正文',
    '楔子',
    '正文',
    '没有章节标记的正文',
  ].join('\n');

  const items = extractTxtOutline(content);

  assert.deepEqual(
    items.map((item) => item.title),
    ['第一章 起点', 'Chapter 1 Intro', '第12节 分节', '楔子'],
  );
  assert.deepEqual(
    items.map((item) => item.paragraphIndex),
    [0, 2, 4, 6],
  );
});

test('PDF 目录扁平化会解析页码、保留层级并跳过外部链接', async () => {
  const outline = [
    {
      title: '第一部分',
      dest: 'part-1',
      items: [
        { title: '第一章', dest: [{ num: 12, gen: 0 }, { name: 'XYZ' }] },
        { title: '外部链接', url: 'https://example.com' },
      ],
    },
  ];

  const items = await flattenPdfOutline(outline, async (dest) => {
    if (dest === 'part-1') return 1;
    if (Array.isArray(dest) && dest[0]?.num === 12) return 13;
    return null;
  });

  assert.deepEqual(items, [
    { id: 'pdf-outline-0', title: '第一部分', level: 0, page: 1 },
    { id: 'pdf-outline-1', title: '第一章', level: 1, page: 13 },
  ]);
});

test('无 PDF 书签时可生成页码目录作为兜底', () => {
  assert.deepEqual(createPageOutline(3), [
    { id: 'pdf-page-1', title: '第 1 页', level: 0, page: 1 },
    { id: 'pdf-page-2', title: '第 2 页', level: 0, page: 2 },
    { id: 'pdf-page-3', title: '第 3 页', level: 0, page: 3 },
  ]);
});

test('目录宽度会被限制在允许范围内', () => {
  assert.equal(clampTocWidth(1), 180);
  assert.equal(clampTocWidth(180), 180);
  assert.equal(clampTocWidth(260), 260);
  assert.equal(clampTocWidth(999), 480);
});

test('TXT 目录识别等号包裹章节并去掉装饰符', () => {
  const content = [
    '===第二十七章 发威===',
    '正文内容',
    '===第三百零五章 风波再起===',
    '正文内容',
  ].join('\n');

  const items = extractTxtOutline(content);

  assert.deepEqual(
    items.map((item) => item.title),
    ['第二十七章 发威', '第三百零五章 风波再起'],
  );
  assert.deepEqual(
    items.map((item) => item.paragraphIndex),
    [0, 2],
  );
});
