import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateTxtLineScrollStep, getTxtScrollbarClassName, getWindowBorderStyle } from './readerLayout';

test('TXT 滚动条样式在边框显隐时必须保持一致', () => {
  // 工具栏显隐不能改变正文可用宽度，否则换行和底部可见文字都会变化。
  assert.equal(getTxtScrollbarClassName(true), getTxtScrollbarClassName(false));
  assert.equal(getTxtScrollbarClassName(false), 'hide-scrollbar');
});


test('窗口边框在显隐时保持相同宽度', () => {
  // 外层边框必须是真实的 border，而不是 box-shadow。
  // 只有宽度固定，显隐切换才不会改变正文可用宽度。
  const hiddenBorder = getWindowBorderStyle(false);
  const visibleBorder = getWindowBorderStyle(true);

  assert.equal(hiddenBorder, '1px solid transparent');
  assert.equal(visibleBorder, '1px solid rgba(212, 212, 216, 0.9)');
  assert.equal(hiddenBorder.split(' ')[0], visibleBorder.split(' ')[0]);
});


test('TXT 键盘滚动步长优先使用实际行高', () => {
  // 键盘上下键必须一次只滚动一行，不能使用固定像素。
  assert.equal(calculateTxtLineScrollStep('28px', 16, 1.8), 28);
  assert.equal(calculateTxtLineScrollStep('normal', 16, 1.8), 28.8);
  assert.equal(calculateTxtLineScrollStep('', 16, 1.8), 28.8);
});
