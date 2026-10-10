# Reader Toolbar, TXT Performance & Scroll Anchor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a reading toolbar TOC switch, reduce TXT startup parsing work, and preserve the reading position after window resizing.

**Architecture:** Prepare TXT paragraphs/headings once in `ReaderView` and pass the prepared result to `TxtReader`. Move native window resizing before reader mounting to avoid layout thrash. Track the topmost visible paragraph as a semantic scroll anchor and restore it after the TXT viewport resizes.

**Tech Stack:** React 19, TypeScript, Tauri v2 window API, Tailwind CSS, `node:test`.

---

## Task 1: TXT preparation and scroll anchor tests

**Files:**
- Create: `src/utils/txtContent.ts`
- Create: `src/utils/txtContent.test.ts`
- Modify: `src/utils/readingProgress.test.ts`
- Modify: `src/utils/readingProgress.ts`

- [x] Write failing tests for `prepareTxtContent`, including paragraph indexes, outline titles, and chapter title indexes.
- [x] Write failing tests for paragraph scroll anchor creation and anchored scroll calculation.
- [x] Run `npm run test` and verify the new tests fail because the APIs do not exist.

## Task 2: Implement one-pass TXT preparation

**Files:**
- Modify: `src/utils/txtHeading.ts`
- Modify: `src/utils/outline.ts`
- Create: `src/utils/txtContent.ts`
- Modify: `src/components/ReaderView.tsx`
- Modify: `src/components/TxtReader.tsx`

- [x] Export heading extraction from prepared paragraphs.
- [x] Add `prepareTxtContent` so paragraphs, headings, outline, and title indexes share one parse result.
- [x] Have `ReaderView` prepare TXT once and pass paragraphs plus title indexes to `TxtReader`.
- [x] Remove duplicate `parseTxtParagraphs` and `extractTxtHeadings` calls from `TxtReader`.

## Task 3: Add toolbar TOC switch

**Files:**
- Modify: `src/components/ReaderView.tsx`

- [x] Add a `ListTree` switch button beside the hide-toolbar button.
- [x] Bind it to `settings.showTableOfContents` through `onUpdateSettings`.
- [x] Use `role="switch"`, `aria-checked`, selected styling, and clear tooltip.

## Task 4: Resize before mounting reader

**Files:**
- Modify: `src/App.tsx`

- [x] Save document state before switching modes.
- [x] Apply the reading window size and wait one animation frame before mounting `ReaderView`.
- [x] Keep fallback behavior if Tauri resizing fails.

## Task 5: Preserve TXT position on viewport resize

**Files:**
- Modify: `src/components/TxtReader.tsx`

- [x] Track the topmost visible paragraph and its offset ratio while scrolling.
- [x] On directory jump, set the anchor to the target paragraph.
- [x] Use `ResizeObserver` to restore the anchor after the viewport changes.
- [x] Suppress anchor updates while programmatic restoration is in progress.

## Task 6: Verification and delivery

**Files:**
- All changed files

- [x] Run `npm run test`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Run `git diff --check`.
- [ ] Commit and push to `origin/main`.
