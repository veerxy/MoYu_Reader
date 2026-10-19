import test from 'node:test';
import assert from 'node:assert/strict';

import { getReaderPreviewBackgroundColor, getTxtScrollbarClassName } from './readerLayout';

test('TXT 滚动条样式在边框显隐时必须保持一致', () => {
  // 工具栏显隐不能改变正文可用宽度，否则换行和底部可见文字都会变化。
  assert.equal(getTxtScrollbarClassName(true), getTxtScrollbarClassName(false));
  assert.equal(getTxtScrollbarClassName(false), 'hide-scrollbar');
});

test('任务栏预览会给透明阅读模式提供不透明兜底背景', () => {
  // Windows 任务栏缩略图无法合成窗口背后的桌面，透明像素会被填充成黑色。
  assert.equal(getReaderPreviewBackgroundColor('transparent'), '#f8f9fa');
  assert.equal(getReaderPreviewBackgroundColor('#123456'), '#123456');
});

test('任务栏预览会保留用户选择的阅读背景', () => {
  assert.equal(getReaderPreviewBackgroundColor('dark'), '#18181b');
  assert.equal(getReaderPreviewBackgroundColor('white'), '#ffffff');
  assert.equal(getReaderPreviewBackgroundColor('book'), '#f4ecd8');
});
