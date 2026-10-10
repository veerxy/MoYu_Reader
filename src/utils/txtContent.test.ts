import test from 'node:test';
import assert from 'node:assert/strict';

import { prepareTxtContent } from './txtContent';

test('TXT 内容准备会同步生成正文段落、目录和标题索引', () => {
  const prepared = prepareTxtContent('===113 放籍===\n\n正文开始\n\n===第二十七章 发威===\n\n正文继续');

  assert.deepEqual(
    prepared.paragraphs.map((paragraph) => ({ text: paragraph.text, index: paragraph.index })),
    [
      { text: '===113 放籍===', index: 0 },
      { text: '正文开始', index: 1 },
      { text: '===第二十七章 发威===', index: 2 },
      { text: '正文继续', index: 3 },
    ],
  );
  assert.deepEqual(
    prepared.outlineItems.map((item) => ({ title: item.title, paragraphIndex: item.paragraphIndex })),
    [
      { title: '113 放籍', paragraphIndex: 0 },
      { title: '第二十七章 发威', paragraphIndex: 2 },
    ],
  );
  assert.deepEqual([...prepared.chapterTitleIndexes], [0, 2]);
});

test('TXT 内容准备会处理空文档并返回空集合', () => {
  const prepared = prepareTxtContent('');

  assert.deepEqual(prepared.paragraphs, []);
  assert.deepEqual(prepared.outlineItems, []);
  assert.equal(prepared.chapterTitleIndexes.size, 0);
});
