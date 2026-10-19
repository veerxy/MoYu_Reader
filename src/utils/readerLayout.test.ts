import test from 'node:test';
import assert from 'node:assert/strict';

import { getTxtScrollbarClassName, getWindowBorderStyle } from './readerLayout';

test('TXT 滚动条样式在边框显隐时必须保持一致', () => {
  // 工具栏显隐不能改变正文可用宽度，否则换行和底部可见文字都会变化。
  assert.equal(getTxtScrollbarClassName(true), getTxtScrollbarClassName(false));
  assert.equal(getTxtScrollbarClassName(false), 'hide-scrollbar');
});


test('窗口边框样式不参与布局计算', () => {
  // 原生 setShadow 会改变 Windows 客户区宽度，导致 TXT 换行位置漂移。
  // 改用 inset box-shadow 后边框只绘制在窗口边缘，不影响内容宽度。
  assert.equal(getWindowBorderStyle(false), 'none');
  assert.equal(
    getWindowBorderStyle(true),
    'inset 0 0 0 1px rgba(15, 23, 42, 0.24), 0 12px 32px rgba(15, 23, 42, 0.14)',
  );
});
