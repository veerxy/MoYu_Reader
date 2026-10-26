import test from 'node:test';
import assert from 'node:assert/strict';
import { removePdfPageBackground } from './pdfBackground';

type Rgba = [number, number, number, number];

function createPixels(width: number, height: number, fill: Rgba): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = fill[3];
  }
  return data;
}

function setPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  color: Rgba,
): void {
  const offset = (y * width + x) * 4;
  data[offset] = color[0];
  data[offset + 1] = color[1];
  data[offset + 2] = color[2];
  data[offset + 3] = color[3];
}

function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): Rgba {
  const offset = (y * width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
}

test('PDF 页面边缘连通的白色背景会被移除', () => {
  const width = 5;
  const height = 5;
  const data = createPixels(width, height, [255, 255, 255, 255]);
  setPixel(data, width, 2, 2, [0, 0, 0, 255]);

  const changed = removePdfPageBackground(data, width, height);

  assert.equal(changed, true);
  assert.equal(getPixel(data, width, 0, 0)[3], 0);
  assert.equal(getPixel(data, width, 4, 4)[3], 0);
  assert.equal(getPixel(data, width, 2, 2)[3], 255);
});

test('PDF 页面内部未连通到边缘的白色内容会被保留', () => {
  const width = 7;
  const height = 7;
  const data = createPixels(width, height, [255, 255, 255, 255]);

  // 用黑色环形内容把中心白色像素与页面边缘白色背景隔开。
  for (let y = 2; y <= 4; y++) {
    for (let x = 2; x <= 4; x++) {
      setPixel(data, width, x, y, [0, 0, 0, 255]);
    }
  }
  setPixel(data, width, 3, 3, [255, 255, 255, 255]);

  removePdfPageBackground(data, width, height);

  assert.equal(getPixel(data, width, 3, 3)[3], 255);
  assert.equal(getPixel(data, width, 0, 0)[3], 0);
});

test('PDF 页面边缘颜色不统一时不会误删内容', () => {
  const width = 5;
  const height = 5;
  const data = createPixels(width, height, [255, 255, 255, 255]);
  setPixel(data, width, 0, 0, [255, 0, 0, 255]);
  setPixel(data, width, 4, 0, [255, 0, 0, 255]);

  const changed = removePdfPageBackground(data, width, height);

  assert.equal(changed, false);
  assert.equal(getPixel(data, width, 2, 2)[3], 255);
});

test('PDF 页面统一彩色背景也会被移除', () => {
  const width = 5;
  const height = 5;
  const data = createPixels(width, height, [240, 240, 240, 255]);
  setPixel(data, width, 2, 2, [0, 0, 0, 255]);

  const changed = removePdfPageBackground(data, width, height);

  assert.equal(changed, true);
  assert.equal(getPixel(data, width, 0, 0)[3], 0);
  assert.equal(getPixel(data, width, 2, 2)[3], 255);
});
