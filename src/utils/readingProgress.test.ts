import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateTxtScrollProgress, createTxtProgressTracker } from './readingProgress';

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
