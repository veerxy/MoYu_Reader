import test from 'node:test';
import assert from 'node:assert/strict';

import { extractTxtHeadings, parseTxtHeading } from './txtHeading';

test('单行解析支持 Markdown、装饰符、括号、全角字符和目录页码', () => {
  const cases: Array<[string, string, number]> = [
    ['# 第一章 起点', '第一章 起点', 1],
    ['## 第1章 发威', '第1章 发威', 1],
    ['### ===第一章 起点===', '第一章 起点', 1],
    ['----第2章 风起----', '第2章 风起', 1],
    ['【第１章】起点', '第1章 起点', 1],
    ['[Chapter 1] Start', 'Chapter 1 Start', 1],
    ['正文 第二章：风起', '第二章：风起', 1],
    ['第　1　章：起点', '第 1 章：起点', 1],
    ['第1章 - 起点', '第1章 - 起点', 1],
    ['＝＝第一章＝＝', '第一章', 1],
    ['第1章【起点】', '第1章 起点', 1],
    ['（第一章 起点）', '第一章 起点', 1],
    ['《第一卷 风起》', '第一卷 风起', 0],
    ['第一卷 风起..........12', '第一卷 风起', 0],
  ];

  for (const [input, title, level] of cases) {
    const heading = parseTxtHeading(input);
    assert.ok(heading, `未识别：${input}`);
    assert.equal(heading.title, title, input);
    assert.equal(heading.level, level, input);
    assert.equal(heading.confidence, 'high', input);
  }
});

test('TXT 标题支持中文单位、多种分隔符和层级', () => {
  const content = [
    '第一卷 风起云涌',
    '第一章 起点',
    '第 2 章：加速',
    '第03章——夜行',
    '第3节 语法',
    '第四回 悟道',
    '番外一 小明的假期',
    '正文内容',
  ].join('\n');

  const headings = extractTxtHeadings(content);

  assert.deepEqual(
    headings.map((item) => item.title),
    [
      '第一卷 风起云涌',
      '第一章 起点',
      '第 2 章：加速',
      '第03章——夜行',
      '第3节 语法',
      '第四回 悟道',
      '番外一 小明的假期',
    ],
  );
  assert.deepEqual(
    headings.map((item) => item.level),
    [0, 1, 1, 1, 2, 1, 1],
  );
});

test('TXT 标题支持英文章节、英文数字和罗马数字', () => {
  const content = [
    'Volume One Rising',
    'Part II Storm',
    'Chapter 1 The Beginning',
    'CHAPTER 12 - Rebirth',
    'Ch.1 Start',
    'Ch 2: Escape',
    'Section 3 Rules',
    'Unit 4 Basics',
    'Lesson 5 Words',
    'Act III Trial',
    'Scene 2 Night',
    'Epilogue: The End',
    '正文内容',
  ].join('\n');

  const headings = extractTxtHeadings(content);

  assert.deepEqual(
    headings.map((item) => item.title),
    [
      'Volume One Rising',
      'Part II Storm',
      'Chapter 1 The Beginning',
      'CHAPTER 12 - Rebirth',
      'Ch.1 Start',
      'Ch 2: Escape',
      'Section 3 Rules',
      'Unit 4 Basics',
      'Lesson 5 Words',
      'Act III Trial',
      'Scene 2 Night',
      'Epilogue: The End',
    ],
  );
  assert.deepEqual(
    headings.map((item) => item.level),
    [0, 0, 1, 1, 1, 1, 2, 2, 1, 2, 2, 1],
  );
});

test('TXT 标题支持常见特殊章节', () => {
  const content = [
    '序',
    '序章：黑暗降临',
    '前言',
    '楔子 一切的开始',
    '引子',
    '尾声——十年之后',
    '后记',
    '终章',
    '大结局',
    '番外 小明的假期',
    '正文内容',
  ].join('\n');

  const headings = extractTxtHeadings(content);

  assert.deepEqual(
    headings.map((item) => item.title),
    [
      '序',
      '序章：黑暗降临',
      '前言',
      '楔子 一切的开始',
      '引子',
      '尾声——十年之后',
      '后记',
      '终章',
      '大结局',
      '番外 小明的假期',
    ],
  );
  assert.ok(headings.every((item) => item.level === 1));
});

test('TXT 标题会拒绝正文句子、长行和孤立编号行', () => {
  for (const text of [
    '他说第一章非常重要。',
    '第一章里面的内容很长。',
    '这一章写得很好。',
    '今天先讲第一章的内容。',
    '----------------',
    '================',
    `${'很长的正文'.repeat(25)}第一章`,
  ]) {
    assert.equal(parseTxtHeading(text), null, text);
  }

  // 单行解析会把编号行标记为 medium 候选，但全文提取必须确认上下文后才采纳。
  assert.deepEqual(extractTxtHeadings('1. 我们先做三件事'), []);
});

test('纯数字编号只有连续递增出现三次以上才会被识别', () => {
  const content = [
    '书名',
    '1. 起点',
    '2. 风起',
    '3. 破局',
    '4. 归乡',
    '正文内容',
    '9. 孤立编号',
  ].join('\n');

  const headings = extractTxtHeadings(content);

  assert.deepEqual(
    headings.map((item) => item.title),
    ['1. 起点', '2. 风起', '3. 破局', '4. 归乡'],
  );
  assert.deepEqual(
    headings.map((item) => item.paragraphIndex),
    [1, 2, 3, 4],
  );
  assert.ok(headings.every((item) => item.confidence === 'medium'));
});

test('开头目录页的重复标题会优先保留正文位置', () => {
  const content = [
    '第一章 起点..........12',
    '第二章 风起..........45',
    '第三章 破局..........78',
    '正文',
    '第一章 起点',
    '正文',
    '第二章 风起',
    '正文',
    '第三章 破局',
    '正文',
  ].join('\n');

  const headings = extractTxtHeadings(content);

  assert.deepEqual(
    headings.map((item) => item.paragraphIndex),
    [4, 6, 8],
  );
  assert.deepEqual(
    headings.map((item) => item.title),
    ['第一章 起点', '第二章 风起', '第三章 破局'],
  );
});

test('不同卷内重复的章节编号不会被互相覆盖', () => {
  const content = [
    '第一卷 风起',
    '第一章 起点',
    '正文',
    '第二章 风起',
    '第二卷 破局',
    '第一章 破局开始',
    '正文',
    '第二章 破局升级',
  ].join('\n');

  const headings = extractTxtHeadings(content);

  assert.deepEqual(
    headings.map((item) => item.title),
    [
      '第一卷 风起',
      '第一章 起点',
      '第二章 风起',
      '第二卷 破局',
      '第一章 破局开始',
      '第二章 破局升级',
    ],
  );
  assert.deepEqual(
    headings.map((item) => item.paragraphIndex),
    [0, 1, 3, 4, 5, 7],
  );
});

test('目录页带卷级上下文时仍优先正文位置', () => {
  const content = [
    '第一章 起点..........12',
    '第一卷 风起',
    '正文',
    '第一章 起点',
  ].join('\n');

  const headings = extractTxtHeadings(content);

  assert.deepEqual(
    headings.map((item) => item.title),
    ['第一卷 风起', '第一章 起点'],
  );
  assert.deepEqual(
    headings.map((item) => item.paragraphIndex),
    [1, 3],
  );
});

test('较长目录页会整体跳过而不是只处理前一部分', () => {
  const toc = [
    '第一章 起点..........12',
    '第二章 风起..........45',
    '第三章 破局..........78',
    '第四章 归乡..........102',
    '第五章 终局..........150',
  ];
  const content = [...toc, '正文', ...toc.map((line) => line.replace(/\.{2,}\d+$/, ''))].join('\n');

  const headings = extractTxtHeadings(content);

  assert.equal(headings.length, 5);
  assert.deepEqual(
    headings.map((item) => item.paragraphIndex),
    [6, 7, 8, 9, 10],
  );
});

test('带卷级上下文的长目录页会整体跳过', () => {
  const tocTitles = ['起点', '风起', '破局', '归乡', '终局'];
  const toc = tocTitles.map((title, index) => `第${index + 1}章 ${title}..........${(index + 1) * 20}`);
  const content = [
    ...toc,
    '第一卷 风起',
    '正文',
    ...tocTitles.map((title, index) => `第${index + 1}章 ${title}`),
  ].join('\n');

  const headings = extractTxtHeadings(content);

  assert.deepEqual(
    headings.map((item) => item.title),
    ['第一卷 风起', ...tocTitles.map((title, index) => `第${index + 1}章 ${title}`)],
  );
  assert.deepEqual(
    headings.map((item) => item.paragraphIndex),
    [5, 7, 8, 9, 10, 11],
  );
});

test('不同卷内完全相同的章节标题不会被当成目录页删除', () => {
  const content = [
    '第一卷 风起',
    '第一章 起点',
    '正文',
    '第二章 风起',
    '第二卷 破局',
    '第一章 起点',
    '正文',
    '第二章 风起',
  ].join('\n');

  const headings = extractTxtHeadings(content);

  assert.deepEqual(
    headings.map((item) => item.title),
    [
      '第一卷 风起',
      '第一章 起点',
      '第二章 风起',
      '第二卷 破局',
      '第一章 起点',
      '第二章 风起',
    ],
  );
  assert.deepEqual(
    headings.map((item) => item.paragraphIndex),
    [0, 1, 3, 4, 5, 7],
  );
});
