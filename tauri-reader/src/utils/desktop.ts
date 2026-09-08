/**
 * 跨平台桌面端适配层 (Desktop API Adapter)
 * 统一支持 Tauri v2、Electron 及 Web 浏览器预览环境
 */

export const isTauri = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window ||
      '__TAURI__' in window ||
      '__TAURI_METADATA__' in window)
  );
};

export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
};

export const isDesktop = (): boolean => {
  return isTauri() || isElectron();
};

export const desktop = {
  isTauri,
  isElectron,
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
      } catch (err) {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().close();
          return;
        } catch (e) {
          console.warn('Tauri close error', e);
        }
      }
    }

    if (isElectron()) {
      window.electronAPI?.close();
      return;
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
      } catch (err) {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().minimize();
          return;
        } catch (e) {
          console.warn('Tauri minimize error', e);
        }
      }
    }

    if (isElectron()) {
      window.electronAPI?.minimize();
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
      } catch (err) {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().toggleMaximize();
          return;
        } catch (e) {
          console.warn('Tauri toggleMaximize error', e);
        }
      }
    }

    if (isElectron()) {
      window.electronAPI?.maximize();
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

    if (isElectron() && window.electronAPI?.isMaximized) {
      return await window.electronAPI.isMaximized();
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

    if (isElectron()) {
      window.electronAPI?.setAlwaysOnTop(flag);
    }
  },

  /**
   * 透明模式鼠标穿透控制
   * ignore: true 时鼠标点击事件将穿透到下层桌面/软件；false 时保持在当前客户端
   */
  setIgnoreMouseEvents: async (ignore: boolean, options?: { forward?: boolean }) => {
    if (isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('window_set_ignore_cursor_events', { ignore });
        return;
      } catch {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().setIgnoreCursorEvents(ignore);
          return;
        } catch (e) {
          console.warn('Tauri setIgnoreCursorEvents error', e);
        }
      }
    }

    if (isElectron() && window.electronAPI?.setIgnoreMouseEvents) {
      window.electronAPI.setIgnoreMouseEvents(
        ignore,
        options?.forward !== undefined ? { forward: options.forward } : undefined
      );
    }
  },

  /**
   * 触发窗口拖动（用于无边框窗口任意空白处按住拖动）
   */
  startDragging: async (coords?: { screenX: number; screenY: number }) => {
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

    if (isElectron() && coords) {
      window.electronAPI?.startWindowDrag(coords);
    }
  },

  /**
   * 移动窗口拖动（Electron 专用补偿）
   */
  moveDragging: (coords: { screenX: number; screenY: number }) => {
    if (isElectron()) {
      window.electronAPI?.moveWindowDrag(coords);
    }
  },

  /**
   * 结束拖动
   */
  endDragging: () => {
    if (isElectron()) {
      window.electronAPI?.endWindowDrag();
    }
  },
};
