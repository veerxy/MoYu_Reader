/**
 * 计算进度条宽度百分比。
 *
 * 进度条必须真实反映阅读进度：0% 就完全不显示已读颜色。
 * 只做范围保护，不添加人为最小宽度，避免“进度 0% 但看起来已开始阅读”的误导。
 */
export function getProgressWidthPercent(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
}
