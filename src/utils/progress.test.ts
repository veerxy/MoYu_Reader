import test from 'node:test';
import assert from 'node:assert/strict';
import { getProgressWidthPercent } from './progress';

test('进度条宽度真实反映阅读进度', () => {
  assert.equal(getProgressWidthPercent(0), 0);
  assert.equal(getProgressWidthPercent(1), 1);
  assert.equal(getProgressWidthPercent(32.5), 32.5);
  assert.equal(getProgressWidthPercent(100), 100);
});

test('进度条宽度会限制在有效范围内', () => {
  assert.equal(getProgressWidthPercent(-1), 0);
  assert.equal(getProgressWidthPercent(101), 100);
  assert.equal(getProgressWidthPercent(Number.NaN), 0);
});
