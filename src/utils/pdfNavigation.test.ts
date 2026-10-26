import test from 'node:test';
import assert from 'node:assert/strict';
import { getPdfWheelNavigation } from './pdfNavigation';

test('PDF 向下滚动到页面底部时进入下一页', () => {
  assert.equal(
    getPdfWheelNavigation({
      deltaY: 1,
      scrollTop: 300,
      clientHeight: 300,
      scrollHeight: 600,
      currentPage: 2,
      totalPages: 5,
    }),
    'next',
  );
});

test('PDF 向上滚动到页面顶部时回到上一页', () => {
  assert.equal(
    getPdfWheelNavigation({
      deltaY: -1,
      scrollTop: 0,
      clientHeight: 300,
      scrollHeight: 600,
      currentPage: 2,
      totalPages: 5,
    }),
    'prev',
  );
});

test('PDF 页面内部未到边界时不翻页', () => {
  assert.equal(
    getPdfWheelNavigation({
      deltaY: 1,
      scrollTop: 100,
      clientHeight: 300,
      scrollHeight: 600,
      currentPage: 2,
      totalPages: 5,
    }),
    null,
  );

  assert.equal(
    getPdfWheelNavigation({
      deltaY: -1,
      scrollTop: 100,
      clientHeight: 300,
      scrollHeight: 600,
      currentPage: 2,
      totalPages: 5,
    }),
    null,
  );
});

test('PDF 第一页向上和最后一页向下不翻页', () => {
  assert.equal(
    getPdfWheelNavigation({
      deltaY: -1,
      scrollTop: 0,
      clientHeight: 300,
      scrollHeight: 600,
      currentPage: 1,
      totalPages: 5,
    }),
    null,
  );

  assert.equal(
    getPdfWheelNavigation({
      deltaY: 1,
      scrollTop: 300,
      clientHeight: 300,
      scrollHeight: 600,
      currentPage: 5,
      totalPages: 5,
    }),
    null,
  );
});
