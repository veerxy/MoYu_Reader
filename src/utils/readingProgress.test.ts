import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateTxtAnchoredScrollTop,
  calculateTxtScrollAnchor,
  calculateTxtScrollProgress,
  createTxtProgressTracker,
} from './readingProgress';

test('TXT 滚动进度计算会正确处理边界值', () => {
  assert.deepEqual(calculateTxtScrollProgress(0, 1000, 200), { progress: 0, scrollTop: 0 });
  assert.deepEqual(calculateTxtScrollProgress(400, 1000, 200), {
    progress: 50,
    scrollTop: 400,
  });
  assert.deepEqual(calculateTxtScrollProgress(999, 1000, 200), {
    progress: 100,
    scrollTop: 999,
  });
});

test('TXT 进度跟踪器会保存最后一次进度并在退出时一次性提交', () => {
  const tracker = createTxtProgressTracker();
  const reported: Array<{ progress: number; scrollTop: number }> = [];

  tracker.update(12, 120);
  tracker.update(37, 370);
  tracker.flush((progress, scrollTop) => reported.push({ progress, scrollTop }));

  assert.deepEqual(reported, [{ progress: 37, scrollTop: 370 }]);

  // 已提交过的进度不能在后续卸载清理中重复回放。
  const second: Array<{ progress: number; scrollTop: number }> = [];
  tracker.flush((progress, scrollTop) => second.push({ progress, scrollTop }));
  assert.deepEqual(second, []);
});

test('TXT 阅读锚点会记录当前段落内的相对位置', () => {
  assert.deepEqual(calculateTxtScrollAnchor(3, 120, 100, 50), {
    paragraphIndex: 3,
    offsetRatio: 0.4,
  });

  // 边界情况必须收敛到段落内部，避免 resize 后跳到相邻段落。
  assert.deepEqual(calculateTxtScrollAnchor(5, 90, 100, 50), {
    paragraphIndex: 5,
    offsetRatio: 0,
  });
  assert.deepEqual(calculateTxtScrollAnchor(7, 160, 100, 50), {
    paragraphIndex: 7,
    offsetRatio: 1,
  });
});

test('TXT 阅读锚点会根据新布局计算恢复后的滚动位置', () => {
  const scrollTop = calculateTxtAnchoredScrollTop(
    { paragraphIndex: 3, offsetRatio: 0.4 },
    {
      containerTop: 200,
      containerScrollTop: 500,
      paragraphTop: 230,
      paragraphHeight: 100,
    },
  );

  assert.equal(scrollTop, 570);
});
