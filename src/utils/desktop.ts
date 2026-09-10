/**
 * 桌面端适配层 (Tauri v2 Desktop API Adapter)
 * 专门适配 Tauri v2 原生桌面端与浏览器预览环境
 */

export const isTauri = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window ||
      '__TAURI__' in window ||
      '__TAURI_METADATA__' in window)
  );
};

export const isDesktop = (): boolean => {
  return isTauri();
};

export const desktop = {
  isTauri,
  isDesktop,

  /**
   * 关闭应用程序窗口
   */
  close: async () => {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('window_close');
        return;
      } catch {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().close();
          return;
        } catch (e) {
          console.warn('Tauri close error', e);
        }
      }
    }

    try {
      window.close();
    } catch {
      // ignore
    }
  },

  /**
   * 最小化窗口
   */
  minimize: async () => {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('window_minimize');
        return;
      } catch {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().minimize();
          return;
        } catch (e) {
          console.warn('Tauri minimize error', e);
        }
      }
    }
  },

  /**
   * 最大化 / 还原切换
   */
  toggleMaximize: async () => {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('window_maximize');
        return;
      } catch {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().toggleMaximize();
          return;
        } catch (e) {
          console.warn('Tauri toggleMaximize error', e);
        }
      }
    }
  },

  /**
   * 查询当前是否最大化
   */
  isMaximized: async (): Promise<boolean> => {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = await invoke<boolean>('window_is_maximized');
        return Boolean(res);
      } catch {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          return await getCurrentWindow().isMaximized();
        } catch {
          return false;
        }
      }
    }
    return false;
  },

  /**
   * 设置窗口置顶状态
   */
  setAlwaysOnTop: async (flag: boolean) => {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('window_set_always_on_top', { flag });
        return;
      } catch {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().setAlwaysOnTop(flag);
          return;
        } catch (e) {
          console.warn('Tauri setAlwaysOnTop error', e);
        }
      }
    }
  },

  /**
   * 设置原生窗口尺寸 (长宽)
   */
  setSize: async (width: number, height: number) => {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('window_set_size', { width, height });
        return;
      } catch {
        try {
          const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
          await getCurrentWindow().setSize(new LogicalSize(width, height));
          return;
        } catch (e) {
          console.warn('Tauri setSize error', e);
        }
      }
    }
  },

  /**
   * 获取原生窗口尺寸 (长宽)
   */
  getSize: async (): Promise<{ width: number; height: number } | null> => {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = await invoke<[number, number]>('window_get_size');
        if (res && res.length >= 2) {
          return { width: Math.round(res[0]), height: Math.round(res[1]) };
        }
      } catch {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const win = getCurrentWindow();
          const factor = await win.scaleFactor();
          const size = await win.innerSize();
          const logical = size.toLogical(factor);
          return { width: Math.round(logical.width), height: Math.round(logical.height) };
        } catch (e) {
          console.warn('Tauri getSize error', e);
        }
      }
    }
    return null;
  },

  /**
   * 触发窗口拖动（用于无边框窗口任意空白处按住拖动）
   */
  startDragging: async () => {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('window_start_dragging');
        return;
      } catch {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().startDragging();
          return;
        } catch (e) {
          console.warn('Tauri startDragging error', e);
        }
      }
    }
  },
};

