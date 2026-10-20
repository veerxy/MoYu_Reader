/**
 * TXT 滚动条样式必须与工具栏显隐无关。
 *
 * 原生滚动条会占用正文宽度：边框可见时出现、隐藏时消失，会让同一行
 * 在 Tab 切换后换行位置变化。统一隐藏滚动条可以保证两种状态排版一致。
 */
export function getTxtScrollbarClassName(isBorderVisible: boolean): string {
  void isBorderVisible;
  return 'hide-scrollbar';
}


/**
 * 计算 TXT 键盘滚动的一行步长。
 *
 * 浏览器实际渲染行高优先于设置估算值；如果样式返回 normal 或无效值，
 * 再回退到“字号 × 行高倍数”，保证滚动量仍然等价于一整行文字。
 */
export function calculateTxtLineScrollStep(
  computedLineHeight: string | null | undefined,
  fallbackFontSize: number,
  fallbackLineHeight: number,
): number {
  const parsedLineHeight = parseFloat(computedLineHeight ?? '');
  return Number.isFinite(parsedLineHeight) && parsedLineHeight > 0
    ? parsedLineHeight
    : fallbackFontSize * fallbackLineHeight;
}

/**
 * 计算 TXT 键盘按页滚动的步长。
 *
 * 步长比视口高度少一行：上一页底部被裁切的行会完整进入下一页，
 * 避免按整页滚动时半行文字一直卡在边界；同时保留少量重叠，阅读不跳行。
 */
export function calculateTxtKeyboardPageScrollStep(
  lineHeight: number,
  viewportHeight: number,
): number {
  if (!Number.isFinite(lineHeight) || lineHeight <= 0 || !Number.isFinite(viewportHeight)) {
    return 0;
  }

  return Math.max(lineHeight, viewportHeight - lineHeight);
}

/**
 * 获取窗口外层边框样式。
 *
 * 这里必须使用真正的 border，而不是 box-shadow：
 * - box-shadow 会被子层背景遮住，导致首页/工具栏看不见边框，正文区域又露出灰边。
 * - border 绘制在最外层，所有界面区域都能看见。
 * - 边框宽度永远保持 1px，显隐只改颜色；因为宽度不变，切换时不会改变正文排版。
 */
export function getWindowBorderStyle(showBorder: boolean): string {
  return showBorder
    ? '1px solid rgba(212, 212, 216, 0.9)'
    : '1px solid transparent';
}
