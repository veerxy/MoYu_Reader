import { BackgroundColorType } from '../types';

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
 * 获取原生最小化前的任务栏预览背景。
 *
 * Windows 缩略图只包含窗口自身位图，无法合成透明区域背后的桌面；
 * 因此透明阅读模式需要在最小化前临时提供不透明背景，避免预览出现黑色。
 */
export function getReaderPreviewBackgroundColor(bgColor: BackgroundColorType): string {
  switch (bgColor) {
    case 'dark':
      return '#18181b';
    case 'white':
      return '#ffffff';
    case 'book':
      return '#f4ecd8';
    case 'transparent':
      return '#f8f9fa';
    default:
      return bgColor;
  }
}
