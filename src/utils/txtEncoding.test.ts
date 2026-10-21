import test from 'node:test';
import assert from 'node:assert/strict';

import { decodeTxtContent } from './txtEncoding';

function bytes(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

test('TXT 解码支持带 BOM 的 UTF-16 LE 文件', () => {
  // Windows 记事本可能保存为 UTF-16 LE；必须优先识别 BOM，不能误走 GB18030。
  const content = '《天子谋》';
  const codeUnits: number[] = [];
  for (const char of content) {
    const code = char.charCodeAt(0);
    codeUnits.push(code & 0xff, code >> 8);
  }

  const decoded = decodeTxtContent(bytes(0xff, 0xfe, ...codeUnits));
  assert.equal(decoded, content);
});

test('TXT 解码支持带 BOM 的 UTF-16 BE 文件', () => {
  const content = '中文编码';
  const codeUnits: number[] = [];
  for (const char of content) {
    const code = char.charCodeAt(0);
    codeUnits.push(code >> 8, code & 0xff);
  }

  const decoded = decodeTxtContent(bytes(0xfe, 0xff, ...codeUnits));
  assert.equal(decoded, content);
});

test('TXT 解码优先识别 UTF-8 BOM', () => {
  const encoded = new TextEncoder().encode('中文 UTF-8');
  const decoded = decodeTxtContent(bytes(0xef, 0xbb, 0xbf, ...encoded));
  assert.equal(decoded, '中文 UTF-8');
});

test('TXT 解码在无 BOM 时先尝试 UTF-8', () => {
  const encoded = new TextEncoder().encode('中文 UTF-8');
  assert.equal(decodeTxtContent(encoded), '中文 UTF-8');
});

test('TXT 解码对非 UTF-8 中文回退到 GB18030', () => {
  assert.equal(decodeTxtContent(bytes(0xc4, 0xe3, 0xba, 0xc3)), '你好');
});