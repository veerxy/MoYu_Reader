import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateTxtKeyboardPageScrollStep, getPdfControlBarClassName, getPdfScaleFromFontSize, getTxtScrollbarClassName, getWindowBorderStyle } from './readerLayout';

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


test('TXT 键盘按页滚动会保留一行重叠内容', () => {
  // 每次接近一个视口高度，但少滚一行，避免底部被裁切的行在新页面顶部仍然被裁切。
  assert.equal(calculateTxtKeyboardPageScrollStep(28, 800), 772);
  assert.equal(calculateTxtKeyboardPageScrollStep(28.8, 600), 571.2);
  // 极小窗口下至少滚动一行，保证按键仍然可用。
  assert.equal(calculateTxtKeyboardPageScrollStep(28, 40), 28);
});

test('PDF 顶部控制条跟随边框显隐', () => {
  // 极简阅读模式下，PDF 控制条需要和边框、工具栏一起隐藏。
  assert.equal(getPdfControlBarClassName(false), 'hidden');
  assert.equal(getPdfControlBarClassName(true), 'flex');
});

test('PDF 字号设置会映射为整页缩放', () => {
  // PDF 由 canvas 渲染，字号设置必须转换为页面缩放，保证文字、图片和图形一起放大。
  assert.equal(getPdfScaleFromFontSize(16), 1.25);
  assert.equal(getPdfScaleFromFontSize(24), 1.875);
  assert.equal(getPdfScaleFromFontSize(36), 2.5);
  assert.equal(getPdfScaleFromFontSize(12), 0.9375);
  assert.equal(getPdfScaleFromFontSize(Number.NaN), 1.25);
});
