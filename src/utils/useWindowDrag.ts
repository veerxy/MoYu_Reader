import { useEffect } from 'react';

/**
 * 全局鼠标长按/按住左键拖动窗口 Hook
 * 支持在客户端内按住鼠标左键拖动原生窗口，同时不干扰按钮、输入框、下拉框等交互组件的正常点击
 */
export function useWindowDrag(isMaximized: boolean) {
  useEffect(() => {
    let isMouseDown = false;
    let isDragging = false;
    let wasDragging = false;
    let startScreenX = 0;
    let startScreenY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (isMaximized) return;
      if (e.button !== 0) return; // 仅限鼠标左键

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 如果点击在交互式表单组件（输入框、滑块、原生下拉框等）上，不触发拖拽
      if (
        target.closest(
          'input, textarea, select, [data-no-drag], input[type="range"]'
        )
      ) {
        return;
      }

      isMouseDown = true;
      isDragging = false;
      wasDragging = false;
      startScreenX = e.screenX;
      startScreenY = e.screenY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown || isMaximized) return;

      const dx = e.screenX - startScreenX;
      const dy = e.screenY - startScreenY;

      // 移动超过 3px 触发拖拽，避免轻微点击判定为拖拽
      if (!isDragging) {
        if (Math.hypot(dx, dy) >= 3) {
          isDragging = true;
          wasDragging = true;
          document.body.classList.add('cursor-grabbing');
          window.electronAPI?.startWindowDrag({
            screenX: e.screenX,
            screenY: e.screenY,
          });
        }
      }

      if (isDragging) {
        window.electronAPI?.moveWindowDrag({
          screenX: e.screenX,
          screenY: e.screenY,
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        document.body.classList.remove('cursor-grabbing');
        window.electronAPI?.endWindowDrag();
      }
      isMouseDown = false;
      isDragging = false;
      // 在下一次微任务/宏任务后重置 wasDragging，以便拦截本次由释放鼠标触发的 click 事件
      setTimeout(() => {
        wasDragging = false;
      }, 50);
    };

    // 拖动窗口释放后，阻止误触被点击元素的 click 动作
    const handleClickCapture = (e: MouseEvent) => {
      if (wasDragging) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    window.addEventListener('mousedown', handleMouseDown, { capture: true });
    window.addEventListener('mousemove', handleMouseMove, { capture: true });
    window.addEventListener('mouseup', handleMouseUp, { capture: true });
    window.addEventListener('click', handleClickCapture, { capture: true });

    return () => {
      window.removeEventListener('mousedown', handleMouseDown, { capture: true });
      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
      window.removeEventListener('click', handleClickCapture, { capture: true });
    };
  }, [isMaximized]);
}
