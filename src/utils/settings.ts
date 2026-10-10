import { ReaderSettings } from '../types';

/**
 * 切换文档目录展示状态。
 *
 * 顶部工具栏和设置弹窗共用这个纯函数，保证两个入口总是修改同一份设置，
 * 且不会意外丢失字体、背景、目录宽度等其他阅读偏好。
 */
export function toggleTableOfContents(settings: ReaderSettings): ReaderSettings {
  return {
    ...settings,
    showTableOfContents: !settings.showTableOfContents,
  };
}
