# 窗口边框 C1 设计

## 结论

采用 **C1：8px 圆角 + 紧凑深灰边框 + 轻微外阴影**。

## 视觉规格

- 圆角：`8px`
- 内边框：`inset 0 0 0 1px rgba(15, 23, 42, 0.24)`
- 外阴影：`0 12px 32px rgba(15, 23, 42, 0.14)`
- 隐藏边框时：`boxShadow: none`

## 实现要点

- `App.tsx` 根容器统一使用 `rounded-[8px]`
- `readerLayout.ts` 的 `getWindowBorderStyle()` 返回上述完整边框样式
- 边框显隐只切换 `boxShadow`，不改变布局尺寸
