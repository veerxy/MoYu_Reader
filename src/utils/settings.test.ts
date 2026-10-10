import test from 'node:test';
import assert from 'node:assert/strict';

import { ReaderSettings } from '../types';
import { toggleTableOfContents } from './settings';

const baseSettings: ReaderSettings = {
  fontSize: 18,
  lineHeight: 2,
  fontColor: '#333333',
  bgColor: 'book',
  fontFamily: 'serif',
  textAlign: 'left',
  showTableOfContents: false,
  tocWidth: 320,
};

test('目录开关只切换展示状态并保留其他阅读设置', () => {
  const enabled = toggleTableOfContents(baseSettings);

  assert.equal(enabled.showTableOfContents, true);
  assert.equal(enabled.fontSize, baseSettings.fontSize);
  assert.equal(enabled.tocWidth, baseSettings.tocWidth);

  const disabled = toggleTableOfContents(enabled);
  assert.equal(disabled.showTableOfContents, false);
  assert.equal(disabled.fontSize, baseSettings.fontSize);
  assert.equal(disabled.tocWidth, baseSettings.tocWidth);
});
