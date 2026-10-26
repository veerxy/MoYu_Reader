export type PdfWheelNavigation = 'prev' | 'next' | null;

interface PdfWheelNavigationInput {
  deltaY: number;
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  currentPage: number;
  totalPages: number;
}

/** 浏览器滚动边界计算存在亚像素误差，接近 2px 内就视为已经到达边界。 */
const EDGE_TOLERANCE = 2;

/**
 * 判断 PDF 垂直滚动是否应该切换页面。
 *
 * 只在当前页已经滚到底/顶时才翻页，页面内部仍优先正常上下滚动；
 * 第一页向上和最后一页向下保持停留，避免产生越界页码。
 */
export function getPdfWheelNavigation({
  deltaY,
  scrollTop,
  clientHeight,
  scrollHeight,
  currentPage,
  totalPages,
}: PdfWheelNavigationInput): PdfWheelNavigation {
  if (Math.abs(deltaY) < 1) return null;

  const isAtTop = scrollTop <= EDGE_TOLERANCE;
  const isAtBottom = scrollHeight - (scrollTop + clientHeight) <= EDGE_TOLERANCE;

  if (deltaY > 0 && isAtBottom && currentPage < totalPages) return 'next';
  if (deltaY < 0 && isAtTop && currentPage > 1) return 'prev';

  return null;
}
