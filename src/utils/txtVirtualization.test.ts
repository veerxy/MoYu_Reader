import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TXT_VIRTUAL_CHUNK_SIZE,
  createTxtChunks,
  estimateTxtChunkHeight,
  getTxtChunkIndexForParagraph,
} from './txtVirtualization';

const settings = {
  fontSize: 16,
  lineHeight: 1.8,
} as any;

test('TXT 虚拟化会按固定段落数分块', () => {
  const paragraphs = Array.from({ length: TXT_VIRTUAL_CHUNK_SIZE * 2 + 5 }, (_, index) => ({
    index,
    text: `第${index}段`,
  }));

  const chunks = createTxtChunks(paragraphs);

  assert.equal(chunks.length, 3);
  assert.deepEqual(
    chunks.map((chunk) => chunk.paragraphs.length),
    [TXT_VIRTUAL_CHUNK_SIZE, TXT_VIRTUAL_CHUNK_SIZE, 5],
  );
  assert.equal(chunks[0].startIndex, 0);
  assert.equal(chunks[1].startIndex, TXT_VIRTUAL_CHUNK_SIZE);
});

test('TXT 虚拟化能定位章节目标所在分块', () => {
  assert.equal(getTxtChunkIndexForParagraph(0, TXT_VIRTUAL_CHUNK_SIZE), 0);
  assert.equal(getTxtChunkIndexForParagraph(TXT_VIRTUAL_CHUNK_SIZE, TXT_VIRTUAL_CHUNK_SIZE), 1);
  assert.equal(getTxtChunkIndexForParagraph(TXT_VIRTUAL_CHUNK_SIZE * 2 + 3, TXT_VIRTUAL_CHUNK_SIZE), 2);
});

test('TXT 分块高度估算使用内容宽度且始终为正数', () => {
  const chunk = {
    startIndex: 0,
    paragraphs: [
      { index: 0, text: '这是用于估算高度的中文字符串' },
      { index: 1, text: 'short english text' },
    ],
  };

  const narrow = estimateTxtChunkHeight(chunk, new Set<number>(), settings, 320);
  const wide = estimateTxtChunkHeight(chunk, new Set<number>(), settings, 640);

  assert.ok(narrow > 0);
  assert.ok(wide > 0);
  assert.ok(narrow >= wide);
});
