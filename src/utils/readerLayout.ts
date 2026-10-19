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
 * 获取窗口边框样式。
 *
 * 不再使用 Tauri setShadow：Windows 上切换原生阴影会改变客户区尺寸，
 * 一像素宽度差异就足以让 TXT 某一行少显示一个字。
 * inset box-shadow 绘制在窗口边缘且不参与布局，显隐切换时正文宽度保持不变。
 */
export function getWindowBorderStyle(showBorder: boolean): string {
  return showBorder ? 'inset 0 0 0 1px rgba(82, 82, 91, 0.55)' : 'none';
}
