# 窗口边框 C1 实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** 将首页与阅读页的可见边框统一切换为 C1 视觉方案。

**Architecture:** 只调整最外层容器的圆角和 `boxShadow`，保持布局尺寸不变，避免影响 TXT 换行宽度。

**Tech Stack:** React、TypeScript、Tailwind CSS。

---

### Task 1: 更新窗口边框样式

**Files:**
- Modify: `src/utils/readerLayout.ts`
- Modify: `src/App.tsx`
- Test: `src/utils/readerLayout.test.ts`

- [ ] **Step 1: 先写失败测试**

在 `src/utils/readerLayout.test.ts` 中把可见边框断言改成精确匹配：

```ts
assert.equal(
  getWindowBorderStyle(true),
  'inset 0 0 0 1px rgba(15, 23, 42, 0.24), 0 12px 32px rgba(15, 23, 42, 0.14)',
);
assert.equal(getWindowBorderStyle(false), 'none');
```

- [ ] **Step 2: 运行测试确认失败**

运行：`npm run test`
预期：`readerLayout` 相关测试失败，因为当前样式还是旧值。

- [ ] **Step 3: 修改实现**

在 `src/utils/readerLayout.ts` 中：

```ts
export function getWindowBorderStyle(showBorder: boolean): string {
  return showBorder
    ? 'inset 0 0 0 1px rgba(15, 23, 42, 0.24), 0 12px 32px rgba(15, 23, 42, 0.14)'
    : 'none';
}
```

在 `src/App.tsx` 中把根容器类名里的 `rounded-none` 改为 `rounded-[8px]`。

- [ ] **Step 4: 运行测试**

运行：`npm run test`
预期：全部通过。

- [ ] **Step 5: 提交**

```bash
git add src/App.tsx src/utils/readerLayout.ts src/utils/readerLayout.test.ts
git commit -m "style: 优化窗口边框为 C1 方案"
```
