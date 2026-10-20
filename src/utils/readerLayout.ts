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
