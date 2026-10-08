export interface TxtScrollProgress {
  progress: number;
  scrollTop: number;
}

export interface TxtProgressTracker {
  update: (progress: number, scrollTop: number) => void;
  flush: (report: (progress: number, scrollTop: number) => void) => void;
}

export function calculateTxtScrollProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): TxtScrollProgress {
  const safeScrollTop = Math.max(0, Math.round(scrollTop));
  const maxScroll = Math.max(1, Math.round(scrollHeight) - Math.round(clientHeight));
  const progress = Math.min(100, Math.max(0, Math.round((safeScrollTop / maxScroll) * 100)));

  return { progress, scrollTop: safeScrollTop };
}

/**
 * TXT 阅读进度使用 150ms 节流，退出阅读页时必须把最后一次滚动位置补提交，
 * 否则用户在节流窗口内点击“返回列表”会丢失最后一段阅读进度。
 */
export function createTxtProgressTracker(): TxtProgressTracker {
  let latest: TxtScrollProgress | null = null;

  return {
    update(progress, scrollTop) {
      latest = { progress, scrollTop };
    },
    flush(report) {
      if (!latest) return;
      const current = latest;
      latest = null;
      report(current.progress, current.scrollTop);
    },
  };
}
