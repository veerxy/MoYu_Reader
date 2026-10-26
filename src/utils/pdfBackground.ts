/**
 * 移除 PDF 页面边缘连通的统一底色。
 *
 * 设计目标：
 * 1. 只清除从页面边缘连通进去的背景，避免误删页面内部的白色文字、图形或图片。
 * 2. 支持白底、灰底和常见浅色底，不假设背景一定是纯白。
 * 3. 边缘颜色不统一时直接放弃处理，避免把正文内容当成背景删掉。
 */
const COLOR_TOLERANCE = 12;
const EDGE_UNIFORMITY_RATIO = 0.9;

type Rgba = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];

  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

/** 采样页面边缘像素，用中位数估计底色，避免个别内容像素干扰判断。 */
function estimateEdgeBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Rgba {
  const red: number[] = [];
  const green: number[] = [];
  const blue: number[] = [];
  const alpha: number[] = [];

  const collect = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    red.push(data[offset]);
    green.push(data[offset + 1]);
    blue.push(data[offset + 2]);
    alpha.push(data[offset + 3]);
  };

  for (let x = 0; x < width; x++) {
    collect(x, 0);
    collect(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    collect(0, y);
    collect(width - 1, y);
  }

  return {
    r: median(red),
    g: median(green),
    b: median(blue),
    a: median(alpha),
  };
}

function matchesBackground(
  data: Uint8ClampedArray,
  index: number,
  background: Rgba,
): boolean {
  const offset = index * 4;
  if (data[offset + 3] === 0) return false;

  return (
    Math.abs(data[offset] - background.r) <= COLOR_TOLERANCE &&
    Math.abs(data[offset + 1] - background.g) <= COLOR_TOLERANCE &&
    Math.abs(data[offset + 2] - background.b) <= COLOR_TOLERANCE &&
    Math.abs(data[offset + 3] - background.a) <= COLOR_TOLERANCE
  );
}

/** 页面边缘必须高度统一才允许去底，防止误删带边框或复杂排版的 PDF。 */
function isUniformEdgeBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  background: Rgba,
): boolean {
  const borderPixelCount = width * 2 + (height - 2) * 2;
  if (borderPixelCount === 0) return false;

  let matchedCount = 0;
  const check = (x: number, y: number) => {
    if (matchesBackground(data, y * width + x, background)) matchedCount++;
  };

  for (let x = 0; x < width; x++) {
    check(x, 0);
    check(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    check(0, y);
    check(width - 1, y);
  }

  return matchedCount / borderPixelCount >= EDGE_UNIFORMITY_RATIO;
}

/**
 * 尝试移除 PDF 页面背景。
 *
 * 处理方式是从页面边缘向内做连通区域扩散，只清除与边缘连通的底色像素；
 * 这样可以保留被正文包围的白色内容，例如白色文字、白线或白色图形。
 */
export function removePdfPageBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): boolean {
  if (
    width < 2 ||
    height < 2 ||
    data.length < width * height * 4
  ) {
    return false;
  }

  const background = estimateEdgeBackground(data, width, height);
  // 已经是透明背景时无需处理，也避免把正文当作底色误删。
  if (background.a === 0) return false;
  if (!isUniformEdgeBackground(data, width, height, background)) return false;

  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;

    const index = y * width + x;
    if (visited[index]) return;
    if (!matchesBackground(data, index, background)) return;

    visited[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);

    data[index * 4 + 3] = 0;

    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }

  return true;
}
