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

export interface TxtScrollAnchor {
  /** 顶部可见段落序号，与正文 data-toc-index 一致 */
  paragraphIndex: number;
  /** 视口顶边在该段落内的比例；resize 换行后用它恢复相对阅读位置 */
  offsetRatio: number;
}

/**
 * 计算当前视口顶部对应的 TXT 段落锚点。
 *
 * 窗口尺寸变化时浏览器只能保留像素 scrollTop，但换行变化会让同一个像素
 * 对应到不同段落；使用“段落 + 段内偏移”才能表达用户真正读到的位置。
 */
export function calculateTxtScrollAnchor(
  paragraphIndex: number,
  viewportTop: number,
  paragraphTop: number,
  paragraphHeight: number,
): TxtScrollAnchor {
  const safeHeight = Math.max(1, paragraphHeight);
  const rawRatio = (viewportTop - paragraphTop) / safeHeight;
  const offsetRatio = Math.min(1, Math.max(0, rawRatio));

  return { paragraphIndex, offsetRatio };
}

/**
 * 根据新布局把段落锚点转换回滚动位置。
 *
 * 必须使用容器当前 scrollTop 做坐标换算，不能直接使用元素 offsetTop，
 * 否则窗口位置变化或后续布局调整都会影响定位精度。
 */
export function calculateTxtAnchoredScrollTop(
  anchor: TxtScrollAnchor,
  layout: {
    containerTop: number;
    containerScrollTop: number;
    paragraphTop: number;
    paragraphHeight: number;
  },
): number {
  const paragraphOffset = layout.paragraphTop - layout.containerTop;
  const offsetInParagraph = anchor.offsetRatio * Math.max(1, layout.paragraphHeight);

  return Math.max(0, Math.round(layout.containerScrollTop + paragraphOffset + offsetInParagraph));
}
